/**
 * Simulation engine классической буровой установки.
 * Чистый TypeScript: без react / three / next / window / document. Работает в Node.js-тестах.
 *
 * Эталон: главный цикл Ty() → H1 (операции), U1 (кинематика), J1 (персонажи), DS (ПВО/ГНВП).
 */
import type {
  ClassicRigCommand,
  ClassicRigEquipmentId,
  ClassicRigOperationId,
  ClassicRigPhaseDefinition,
  ClassicRigSnapshot,
  ClassicRigTelemetryEvent,
  DeepPartial,
  EquipmentSnapshot,
} from "../types";
import { ClassicRigEventBus, type ClassicRigNotification, type ClassicRigSoundCue } from "./ClassicRigEvents";
import { createInitialState, type ClassicRigState } from "./ClassicRigState";
import { DEFAULT_CONFIG, type SimulationConfig } from "./config";
import { OperationRegistry, type OperationContext } from "./OperationRegistry";
import { validateCommand } from "./ClassicRigCommands";
import { drillingBehavior } from "../operations/drilling/drilling-operation";
import { DRILLING_PHASES } from "../operations/drilling/drilling-phases";
import { computeConnectionKinematics, type ConnectionKinematics } from "../operations/drilling/drilling-kinematics";
import { abortConnection, returnStandToSetback, setDrillPhase, takeStandFromSetback } from "../operations/drilling/drilling-state";
import { trippingBehavior } from "../operations/tripping/tripping-operation";
import { casingBehavior } from "../operations/casing/casing-operation";
import { cementingBehavior } from "../operations/cementing/cementing-operation";
import { movingBehavior } from "../operations/moving/moving-operation";
import { kickBehavior } from "../operations/kick/kick-operation";
import { programIndex, programStepKey, programVisuals, type ProgramVisuals } from "../operations/casing/casing-program";
import { DRILLING_PHASE_NOTES, DRILLING_PHASE_TITLES } from "../reference/operations-reference";
import { CONNECTION_PHASES, DEPTH_SCALE, START_MD, TD_BOTTOM, TD_LIFT_TOP, TD_STAB, TD_TOP, WELLS, WIND_LIMIT } from "../reference/constants";
import { WELL_GEOMETRY, type WellGeometry } from "../well/depth-model";
import { wellSnapshot } from "../well/well-state";
import { computeEquipment } from "../equipment/equipment-state";
import { isActive } from "../equipment/equipment-types";
import { bopSnapshot, bopTargets } from "../equipment/bop-controller";
import { createWorkers } from "../workers/worker-registry";
import { updateWorkers } from "../workers/worker-runtime";
import { workerSnapshots } from "../workers/worker-state";
import { fitPresetToSeason, stepWind } from "../environment/weather";
import { cueForPhase } from "../environment/sound";
import { clamp01 } from "../util/math";

export type ClassicRigSimulationOptions = {
  config?: Partial<SimulationConfig>;
};

type Listener = (s: ClassicRigSnapshot) => void;

export class ClassicRigSimulation {
  readonly bus = new ClassicRigEventBus();
  readonly registry = new OperationRegistry()
    .register(drillingBehavior)
    .register(trippingBehavior)
    .register(casingBehavior)
    .register(cementingBehavior)
    .register(movingBehavior)
    .register(kickBehavior);

  readonly config: SimulationConfig;
  private s: ClassicRigState;
  private listeners = new Set<Listener>();
  private cache: ClassicRigSnapshot | null = null;
  private kin: ConnectionKinematics;
  private rotationRate = 0;
  private tdVelocity = 0;
  private rotating = false;
  private activeConditions = new Set<string>();
  private equipmentActive: Partial<Record<ClassicRigEquipmentId, boolean>> = {};
  private equipmentState: Partial<Record<ClassicRigEquipmentId, EquipmentSnapshot["state"]>> = {};
  private equipment: Record<ClassicRigEquipmentId, EquipmentSnapshot> | null = null;
  private pendingStart = true;
  private demoQueue: ClassicRigOperationId[] = [];
  private demoStatus: "idle" | "waiting" | "countdown" | "running" = "idle";
  private demoOperation: ClassicRigOperationId | null = null;
  private suspendedState: ClassicRigState | null = null;
  private demoPhaseCompleted = false;
  private demoDrillingStartConnections = 0;
  private demoFinished = false;
  private demoAutoPreference: boolean | null = null;
  private demoWeatherChanged = false;
  private demoSequence = 0;
  private readonly ctx: OperationContext;

  constructor(opts: ClassicRigSimulationOptions = {}) {
    this.config = { ...DEFAULT_CONFIG, ...(opts.config ?? {}) };
    this.s = this.freshState();
    this.kin = computeConnectionKinematics(this.s);
    const getState = () => this.s;
    this.ctx = {
      get state() {
        return getState();
      },
      bus: this.bus,
      config: this.config,
      well: () => this.well(),
      wind: () => this.s.weather.wind,
      unpermittedInRedZone: () => this.s.workers.some((w) => w.inDanger),
      startOperation: (op, reason) => this.startOperation(op, reason),
      phaseStarted: (id) => this.emitPhase("phase_started", id),
      phaseCompleted: (id) => this.emitPhase("phase_completed", id),
      notify: (text) => this.bus.notify(text, this.s.time),
    } as OperationContext;
    this.refreshEquipment(true);
  }

  // ─────────────────────────────── публичный API ───────────────────────────────

  start(): void {
    this.dispatch({ type: "start" });
  }
  pause(): void {
    this.dispatch({ type: "pause" });
  }
  reset(): void {
    this.dispatch({ type: "reset" });
  }

  update(deltaSeconds: number): void {
    if (!this.s.running || this.demoStatus === "countdown" || !(deltaSeconds > 0)) return;
    let t = Math.min(deltaSeconds, 1) * this.s.speed;
    while (t > 1e-9) {
      const h = Math.min(this.config.maxStep, t);
      this.step(h);
      if (this.isDemoCountdown()) break;
      t -= h;
    }
    this.publish();
  }

  dispatch(command: ClassicRigCommand): void {
    const err = validateCommand(command);
    if (err) return this.reject(command, err);
    const s = this.s;
    switch (command.type) {
      case "start":
        if (s.estop) {
          s.estop = false;
          this.bus.emit({ type: "emergency_stop_released", timestamp: s.time });
        }
        s.running = true;
        break;
      case "pause":
        s.running = false;
        break;
      case "reset":
        this.s = this.freshState();
        this.activeConditions.clear();
        this.equipmentActive = {};
        this.equipmentState = {};
        this.pendingStart = true;
        this.demoQueue = [];
        this.demoStatus = "idle";
        this.demoOperation = null;
        this.suspendedState = null;
        this.demoFinished = false;
        this.demoPhaseCompleted = false;
        this.demoAutoPreference = null;
        this.demoWeatherChanged = false;
        this.kin = computeConnectionKinematics(this.s);
        this.refreshEquipment(true);
        break;
      case "select_operation":
        this.requestOperation(command.operation, command);
        break;
      case "queue_demo_operation":
        this.demoQueue.push(command.operation);
        if (this.demoStatus === "idle") this.demoStatus = "waiting";
        if (this.demoStatus === "waiting" && s.running && !s.estop && s.op === "drilling" && ["td", "complete"].includes(s.drill.phase) && !s.auto) this.prepareDemo();
        break;
      case "begin_demo_operation":
        if (this.demoStatus === "countdown") this.beginDemo();
        break;
      case "select_phase":
        this.selectPhase(command.phase, command);
        break;
      case "set_speed":
        s.speed = Math.max(0, Math.min(8, command.value));
        break;
      case "set_weather":
        Object.assign(s.weather, command.weather);
        fitPresetToSeason(s.weather);
        if (this.demoStatus === "running") this.demoWeatherChanged = true;
        break;
      case "trigger_event":
        if (command.event === "kick") this.requestOperation("kick", command);
        if (command.event === "high_wind") s.weather.windOverride = 18;
        if (command.event === "calm_wind") s.weather.windOverride = null;
        break;
      case "close_bop":
        if (s.bop.manualClosed) return this.reject(command, "ПВО уже закрыт");
        s.bop.manualClosed = true;
        if (this.rotationRate > 0.05) this.violation("bop_closed_while_rotating", { rpm: (this.rotationRate * 60) / (2 * Math.PI) });
        break;
      case "open_bop":
        if (!s.bop.manualClosed) return this.reject(command, "ПВО не закрыт вручную");
        s.bop.manualClosed = false;
        if (s.op === "kick" && ["shutin", "kill"].includes(this.currentPhase())) this.violation("bop_opened_during_well_control");
        break;
      case "emergency_stop":
        if (s.estop) return this.reject(command, "аварийная остановка уже активна");
        s.estop = true;
        this.bus.emit({ type: "emergency_stop", timestamp: s.time });
        this.bus.notify("Аварийная остановка: вращение и насосы остановлены. Команда start — снять останов.", s.time);
        break;
      case "set_auto":
        s.auto = command.value;
        if (this.demoStatus === "running") this.demoAutoPreference = command.value;
        break;
      case "set_kick_detection":
        s.kick.early = command.early;
        break;
    }
    this.publish();
  }

  getSnapshot(): ClassicRigSnapshot {
    if (!this.cache) this.cache = this.buildSnapshot();
    return this.cache;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onEvent(fn: (e: ClassicRigTelemetryEvent) => void): () => void {
    return this.bus.onEvent(fn);
  }
  onNotification(fn: (n: ClassicRigNotification) => void): () => void {
    return this.bus.onNotification(fn);
  }
  onSound(fn: (c: ClassicRigSoundCue) => void): () => void {
    return this.bus.onSound(fn);
  }

  /** Можно ли запустить операцию сейчас (для UI: доступность кнопок). */
  canStartOperation(op: ClassicRigOperationId): { ok: boolean; reason?: string } {
    if (op === this.s.op) return { ok: false, reason: "операция уже выполняется" };
    if (op === "drilling") return { ok: false, reason: "бурение возобновляется автоматически после операций" };
    if (this.s.op !== "drilling") return { ok: false, reason: `сначала завершите операцию «${this.s.op}»` };
    return this.registry.get(op).canStart(this.ctx);
  }

  listOperations() {
    return this.registry.list();
  }

  /** Применить частичное начальное состояние (экзамены): операция, глубина, ветер и т.д. */
  applyStartState(start: DeepPartial<ClassicRigSnapshot>): void {
    const s = this.s;
    if (start.auto != null) s.auto = start.auto;
    if (start.speed != null) s.speed = start.speed;
    if (start.weather) Object.assign(s.weather, start.weather);
    if (start.drilling?.tdY != null) s.drill.tdY = start.drilling.tdY;
    if (start.well?.md != null) s.drill.md = s.drill.holeMD = start.well.md / DEPTH_SCALE;
    if (start.weather) fitPresetToSeason(s.weather);
    if (start.operation && start.operation !== "drilling") this.startOperation(start.operation, "command");
    if (start.phase) this.selectPhase(start.phase, { type: "select_phase", phase: start.phase }, true);
    this.publish();
  }

  /** Доступ к внутреннему состоянию — только для тестов и отладки. */
  get internalState(): Readonly<ClassicRigState> {
    return this.s;
  }

  // ─────────────────────────────── внутреннее ───────────────────────────────

  private freshState(): ClassicRigState {
    const s = createInitialState(createWorkers());
    s.auto = this.config.auto;
    s.kick.early = this.config.earlyKickDetection;
    return s;
  }

  private well(): WellGeometry {
    return WELL_GEOMETRY[this.s.wi];
  }

  private currentPhase(): string {
    return this.registry.get(this.s.op).currentPhase(this.ctx);
  }

  private currentPhaseDef(): ClassicRigPhaseDefinition | undefined {
    const s = this.s;
    if (s.op === "drilling" || (s.op === "kick" && s.stepIndex === 0)) return DRILLING_PHASES.find((p) => p.id === s.drill.phase);
    const def = this.registry.get(s.op).definition;
    return def.phases.find((p) => p.id === this.currentPhase());
  }

  /** Начальные события (операция и фаза при старте/после reset) — до любого другого события. */
  private flushPendingStart(): void {
    if (!this.pendingStart) return;
    this.pendingStart = false;
    this.bus.emit({ type: "operation_started", operationId: this.s.op, timestamp: this.s.time });
    this.emitPhase("phase_started", this.currentPhase());
  }

  private emitPhase(type: "phase_started" | "phase_completed", phaseId: string): void {
    this.flushPendingStart();
    this.bus.emit({ type, operationId: this.s.op, phaseId, timestamp: this.s.time });
    if (type === "phase_completed" && (this.demoStatus === "waiting" || (this.demoStatus === "running" && this.demoQueue.length > 0))) this.demoPhaseCompleted = true;
    if (type === "phase_started") {
      const c = cueForPhase(phaseId);
      if (c) this.bus.sound(c.cue, this.s.time, c.gain);
    }
  }

  private reject(command: ClassicRigCommand, reason: string): void {
    this.bus.emit({ type: "command_rejected", command: command.type + ("operation" in command ? `:${command.operation}` : "phase" in command ? `:${command.phase}` : ""), reason, timestamp: this.s.time });
    this.publish();
  }

  private violation(code: string, details?: Record<string, unknown>): void {
    this.s.violations++;
    this.bus.emit({ type: "safety_violation", code, details, timestamp: this.s.time });
  }

  private requestOperation(op: ClassicRigOperationId, command: ClassicRigCommand): void {
    const ok = this.canStartOperation(op);
    if (!ok.ok) return this.reject(command, ok.reason ?? "недоступно");
    if (this.s.estop) return this.reject(command, "активна аварийная остановка");
    this.startOperation(op, "command");
  }

  private prepareDemo(): void {
    if (this.demoStatus !== "waiting" || this.demoQueue.length === 0) return;
    this.demoOperation = this.demoQueue.shift()!;
    this.demoSequence++;
    this.suspendedState = structuredClone(this.s);
    this.demoStatus = "countdown";
    this.demoPhaseCompleted = false;
  }

  private isDemoCountdown(): boolean { return this.demoStatus === "countdown"; }

  private beginDemo(): void {
    if (!this.suspendedState || !this.demoOperation) return;
    this.suspendedState = structuredClone(this.s);
    this.s = structuredClone(this.suspendedState);
    const s = this.s;
    s.running = true;
    s.estop = false;
    s.auto = false;
    if (s.speed === 0) s.speed = 1;
    this.demoStatus = "running";
    this.demoFinished = false;
    this.demoPhaseCompleted = false;
    this.demoAutoPreference = null;
    this.demoWeatherChanged = false;
    if (this.demoOperation === "drilling") {
      s.op = "drilling";
      s.drill.md = s.drill.holeMD = Math.min(s.drill.md, this.well().TD - 2);
      s.drill.tdY = TD_TOP;
      s.drill.cs = null;
      s.bop.manualClosed = false;
      if (s.weather.wind >= WIND_LIMIT) {
        s.weather.wind = WIND_LIMIT - 0.1;
        s.weather.windOverride = WIND_LIMIT - 0.1;
      }
      setDrillPhase(s, "drill");
      this.demoDrillingStartConnections = s.drill.connections;
      this.bus.emit({ type: "operation_started", operationId: "drilling", timestamp: s.time });
      this.emitPhase("phase_started", "drill");
    } else {
      if (this.demoOperation === "moving" && Math.round(s.moveX) + 10 > 30) {
        s.moveX = 20;
        s.wi = WELLS.findIndex((well) => well.x === 20);
      }
      if (this.demoOperation === "casing" || this.demoOperation === "cementing") {
        s.casing.casTD = s.drill.md;
        s.casing.md0 = s.drill.md;
        s.casing.stage = this.demoOperation === "casing" ? "string_out" : "casing_run";
      }
      s.op = this.demoOperation;
      s.stepIndex = 0;
      s.stepP = 0;
      s.drill.timer = 0;
      this.bus.emit({ type: "operation_started", operationId: s.op, timestamp: s.time });
      this.registry.get(s.op).start(this.ctx);
    }
    this.kin = computeConnectionKinematics(s);
    this.refreshEquipment(true);
  }

  private finishDemo(): void {
    const saved = this.suspendedState;
    if (!saved) return;
    const demo = this.s;
    saved.time = demo.time;
    if (this.demoOperation !== "drilling" || this.demoWeatherChanged) saved.weather = structuredClone(demo.weather);
    saved.speed = demo.speed;
    saved.running = demo.running;
    if (this.demoAutoPreference !== null) saved.auto = this.demoAutoPreference;
    saved.kick.early = demo.kick.early;
    this.s = saved;
    this.suspendedState = null;
    this.demoOperation = null;
    this.demoFinished = false;
    this.demoPhaseCompleted = false;
    this.demoAutoPreference = null;
    this.demoWeatherChanged = false;
    this.demoStatus = this.demoQueue.length ? "countdown" : "idle";
    if (this.demoStatus === "countdown") {
      this.demoOperation = this.demoQueue.shift()!;
      this.demoSequence++;
      this.suspendedState = structuredClone(this.s);
    }
    this.kin = computeConnectionKinematics(this.s);
    this.rotationRate = 0;
    this.tdVelocity = 0;
    this.rotating = false;
    this.activeConditions.clear();
    this.refreshEquipment(true);
  }

  /** эталон lo() / Pf() */
  private startOperation(op: ClassicRigOperationId, reason: "auto" | "command" | "chain"): void {
    if (this.demoStatus === "running" && reason !== "command") return;
    this.flushPendingStart();
    const s = this.s;
    if (op === "drilling") {
      this.resetPad();
      return;
    }
    if (op === "moving" && Math.round(s.moveX) + 10 > 30) {
      this.bus.notify("Последнее устье куста: переезжать некуда", s.time);
      return;
    }
    if (s.op === "drilling") this.emitPhase("phase_completed", s.drill.phase);
    returnStandToSetback(s); // If()
    s.op = op;
    s.stepIndex = 0;
    s.stepP = 0;
    s.drill.timer = 0;
    this.bus.emit({ type: "operation_started", operationId: op, timestamp: s.time });
    this.registry.get(op).start(this.ctx);
    void reason;
  }

  /** Pf(): куст пробурен — сцена начинает куст заново */
  private resetPad(): void {
    const s = this.s;
    returnStandToSetback(s);
    s.setbackVisible.fill(true);
    for (const w of WELLS) s.wellStatus[w.id] = w.initial;
    s.moveX = 0;
    s.completedWellheads = [];
    s.op = "drilling";
    s.wi = 3;
    s.drill.md = s.drill.holeMD = START_MD;
    s.drill.tdY = TD_TOP;
    setDrillPhase(s, "drill");
    s.stepIndex = 0;
    s.stepP = 0;
    this.bus.notify("Куст пробурен. Сцена начинает куст заново", s.time);
    this.bus.emit({ type: "operation_started", operationId: "drilling", timestamp: s.time });
    this.emitPhase("phase_started", "drill");
  }

  /** setup=true — стартовое состояние сценария/экзамена: переход не считается пропуском фаз. */
  private selectPhase(phase: string, command: ClassicRigCommand, setup = false): void {
    const s = this.s;
    if (s.op === "drilling") {
      if (!(DRILLING_PHASES as { id: string }[]).some((p) => p.id === phase)) return this.reject(command, `нет фазы бурения «${phase}»`);
      this.jumpDrillingPhase(phase as ClassicRigState["drill"]["phase"], setup);
      return;
    }
    const b = this.registry.get(s.op);
    if (!b.selectPhase || !b.selectPhase(this.ctx, phase)) this.reject(command, `нет фазы «${phase}» в операции ${s.op}`);
  }

  /** Перейти на фазу наращивания с согласованным положением СВП и свечи (для тренажёра/экзаменов). */
  private jumpDrillingPhase(phase: ClassicRigState["drill"]["phase"], setup = false): void {
    const s = this.s;
    const d = s.drill;
    // ручной переход — не завершение фазы: фиксируется отдельным событием (ошибка порядка в экзамене)
    if (!setup && d.phase !== phase) this.bus.emit({ type: "phase_skipped", operationId: "drilling", fromPhase: d.phase, toPhase: phase, timestamp: s.time });
    const needsStand = ["breakTD", "tdUp", "latch", "lift", "stab", "makeup", "tdConnect"].includes(phase);
    if (needsStand && !d.cs) d.cs = takeStandFromSetback(s).cs;
    if (!needsStand && d.cs && phase !== "release") abortConnection(s);
    const ty: Partial<Record<string, number>> = {
      drill: TD_TOP,
      slips: TD_BOTTOM,
      breakTD: TD_BOTTOM,
      tdUp: TD_BOTTOM + 0.4,
      latch: d.cs?.tdLatch,
      lift: d.cs?.tdLatch,
      stab: TD_LIFT_TOP,
      makeup: TD_STAB,
      tdConnect: TD_STAB,
      release: TD_TOP,
    };
    if (ty[phase] != null) d.tdY = ty[phase]!;
    setDrillPhase(s, phase);
    this.emitPhase("phase_started", phase);
  }

  private step(h: number): void {
    const s = this.s;
    this.flushPendingStart();
    s.time += h;
    stepWind(s.weather, h);
    const prevTd = s.drill.tdY;
    const prevRot = s.drill.rot;
    const prevX = s.moveX;
    const behavior = this.registry.get(s.op);
    const defBefore = this.currentPhaseDef();

    if (!s.estop) {
      s.drill.timer += h; // эталон: e.timer += dt для любой операции
      const done = behavior.update(this.ctx, h);
      if (done) {
        const finished = s.op;
        this.bus.emit({ type: "operation_completed", operationId: finished, timestamp: s.time });
        if (this.demoStatus === "running") this.demoFinished = true;
        else behavior.complete(this.ctx);
      }
      if (this.demoStatus === "running" && this.demoOperation === "drilling" && this.s.drill.connections > this.demoDrillingStartConnections) {
        this.bus.emit({ type: "operation_completed", operationId: "drilling", timestamp: s.time });
        this.demoFinished = true;
      }
    }
    // насосы (эталон H1): pump += (target − pump) · min(1, dt · 1.5)
    const target = s.estop ? 0 : this.registry.get(s.op).pumpTarget(this.ctx);
    s.drill.pump += (target - s.drill.pump) * Math.min(1, h * 1.5);

    // кинематика наращивания и производные углы
    this.kin = computeConnectionKinematics(s);
    this.rotationRate = (s.drill.rot - prevRot) / h;
    this.tdVelocity = (s.drill.tdY - prevTd) / h;
    s.drill.drumAngle += (prevTd - s.drill.tdY) * -1.6;
    if (this.config.rotaryTableFollowsString && this.kin.slipsK < 0.5) s.drill.rotaryAngle += s.drill.rot - prevRot;
    if (this.kin.phase === "makeup" && s.drill.timer > 0.8 && s.drill.timer < 2.8) s.drill.rollerSpin += 36 * h;
    s.drill.bowlAngle += 24 * Math.max(0.15, s.drill.pump) * h;

    // ПВО (эталон DS): на шагах ГНВП — напрямую по прогрессу; ручное закрытие/открытие — 1.5 с
    const bt = bopTargets(s);
    if (s.op === "kick" && !s.bop.manualClosed) {
      s.bop.annular = bt.annular;
      s.bop.rams = bt.rams;
    } else {
      const k = h / 1.5;
      s.bop.annular += Math.max(-k, Math.min(k, bt.annular - s.bop.annular));
      s.bop.rams += Math.max(-k, Math.min(k, bt.rams - s.bop.rams));
    }
    const closed = s.bop.annular > 0.98 && s.bop.rams > 0.98;
    const open = s.bop.annular < 0.02 && s.bop.rams < 0.02;
    if (closed && !s.bop.wasClosed) {
      s.bop.wasClosed = true;
      this.bus.emit({ type: "bop_closed", manual: s.bop.manualClosed, timestamp: s.time });
    } else if (open && s.bop.wasClosed) {
      s.bop.wasClosed = false;
      this.bus.emit({ type: "bop_opened", manual: !s.bop.manualClosed && s.op !== "kick", timestamp: s.time });
    }
    // тревога и факел (эталон DS)
    const kickStep = s.op === "kick" ? ["influx", "alarm", "shutin", "kill", "open"][s.stepIndex] : null;
    s.alarm = !!kickStep && ["alarm", "shutin", "kill"].includes(kickStep);
    const n = s.stepP;
    s.flare = kickStep === "kill" ? clamp01((n - 0.6) / 0.15) * (1 - clamp01((n - 0.95) / 0.05)) * (s.kick.early ? 0.75 : 1) : 0;

    // персонажи; «вращение» — только в фазе, где оно предусмотрено описанием (rotation: true),
    // чтобы остаточный поворот на стыке фаз (drill → slips) не считался вращением следующей фазы
    const def = this.currentPhaseDef();
    const rotating = Math.abs(this.rotationRate) > 0.05 && !!def?.rotation;
    this.rotating = rotating;
    // вращение в этом шаге могло относиться к фазе до перехода (например, tdConnect → release)
    const permit = new Set<string>([...(def?.dangerZonePermit?.workers ?? []), ...(defBefore?.dangerZonePermit?.workers ?? [])]);
    const res = updateWorkers({
      state: s,
      config: this.config,
      dt: h,
      stepKey: s.op === "drilling" ? null : s.op === "kick" ? kickStep : programStepKey(s) ?? this.currentPhase(),
      phaseTitle: this.phaseTitle(),
      wind: s.weather.wind,
      prevRigX: prevX,
      rotating,
      permitted: (id) => permit.has(id),
      tdVelocity: this.tdVelocity,
    });
    for (const e of res.events) this.bus.emit(e);
    const conds = new Set(res.conditions.map((c) => `${c.code}|${c.workerId}`));
    // пуск насосов (команда на подачу), пока колонна на клиньях; выбег насосов после остановки нарушением не считается
    if (target > 0.2 && this.kin.slipsK > 0.5 && !s.estop) conds.add("pump_started_with_slips_closed|-");
    if (s.drill.windWait === false && s.weather.wind >= WIND_LIMIT && s.drill.cs && ["latch", "lift"].includes(s.drill.phase)) conds.add("derrick_work_in_high_wind|derrick_A");
    for (const key of conds) {
      if (!this.activeConditions.has(key)) {
        const [code, workerId] = key.split("|");
        this.violation(code, workerId !== "-" ? { workerId } : undefined);
      }
    }
    this.activeConditions = conds;

    this.refreshEquipment(false);
    if (this.demoStatus === "running" && this.demoPhaseCompleted && this.demoQueue.length > 0) this.demoFinished = true;
    if (this.demoFinished) this.finishDemo();
    if (this.demoStatus === "waiting" && this.demoPhaseCompleted) {
      this.demoPhaseCompleted = false;
      this.prepareDemo();
    }
  }

  private program(): ProgramVisuals {
    return programVisuals(this.s, this.well());
  }

  private refreshEquipment(initial: boolean): void {
    const s = this.s;
    const def = this.currentPhaseDef();
    this.equipment = computeEquipment({
      state: s,
      kin: this.kin,
      program: this.program(),
      well: this.well(),
      phase: this.currentPhase(),
      activeEquipment: new Set(def?.activeEquipment ?? []),
      rotationRate: this.rotationRate,
      tdVelocity: this.tdVelocity,
      rigX: s.moveX,
      rotaryTableFollowsString: this.config.rotaryTableFollowsString,
    });
    for (const [id, e] of Object.entries(this.equipment) as [ClassicRigEquipmentId, EquipmentSnapshot][]) {
      const active = isActive(e.state);
      const was = this.equipmentActive[id] ?? false;
      if (!initial && active !== was) {
        this.bus.emit({ type: active ? "equipment_started" : "equipment_stopped", equipmentId: id, phaseId: this.currentPhase(), timestamp: s.time });
      }
      this.equipmentActive[id] = initial ? false : active;
      const prev = this.equipmentState[id] ?? "idle";
      if (!initial && prev !== e.state) {
        this.bus.emit({ type: "equipment_state_changed", equipmentId: id, from: prev, to: e.state, phaseId: this.currentPhase(), timestamp: s.time });
      }
      this.equipmentState[id] = initial ? "idle" : e.state;
    }
  }

  private phaseTitle(): string {
    const s = this.s;
    if (s.op === "drilling") return DRILLING_PHASE_TITLES[s.drill.phase] ?? s.drill.phase;
    return this.currentPhaseDef()?.title ?? this.currentPhase();
  }

  private publish(): void {
    this.cache = null;
    if (this.listeners.size === 0) return;
    const snap = this.getSnapshot();
    for (const l of this.listeners) l(snap);
  }

  private buildSnapshot(): ClassicRigSnapshot {
    const s = this.s;
    const b = this.registry.get(s.op);
    const prog = this.program();
    const kin = this.kin;
    const d = s.drill;
    const mdM = d.md * DEPTH_SCALE;
    const hookBase = 70 + mdM * 0.011;
    const inConnection = (CONNECTION_PHASES as readonly string[]).includes(d.phase) && d.phase !== "release";
    let wob = 0;
    let hook = hookBase + 12;
    let rop = 0;
    if (s.op === "drilling" && d.phase === "drill") {
      wob = 9;
      hook = hookBase + 12 - wob;
      rop = 32;
    } else if (inConnection) {
      hook = 12 + (d.cs && ["lift", "stab"].includes(d.phase) ? 1.6 : 0);
    } else if (d.phase === "complete") hook = 12;
    const workers = workerSnapshots(s.workers);
    const def = this.currentPhaseDef();
    const phase = b.currentPhase(this.ctx);
    const pIdx = programIndex(s);
    const fl = prog.fleet;
    const k = s.kick;
    return {
      running: s.running,
      speed: s.speed,
      elapsedTime: s.time,
      auto: s.auto,
      operation: s.op,
      demo: { status: this.demoStatus, operation: this.demoOperation ?? this.demoQueue[0] ?? null, queued: [...this.demoQueue], sequence: this.demoSequence },
      phase,
      phaseTitle: this.phaseTitle(),
      phaseText: def?.text ?? DRILLING_PHASE_NOTES[phase] ?? "",
      phaseProgress: b.phaseProgress(this.ctx),
      operationProgress: b.operationProgress(this.ctx),
      rigOffsetX: s.moveX,
      equipment: this.equipment!,
      workers,
      well: wellSnapshot(s, prog),
      drilling: {
        phase: d.phase,
        phaseTimer: d.timer,
        tdY: d.tdY,
        rotation: d.rot,
        pump: d.pump,
        slipsClosed: kin.slipsK,
        roughneckEngage: kin.akb,
        elevatorClosed: kin.elevatorClosed,
        windWait: d.windWait,
        connections: d.connections,
        standsInSetback: s.setbackVisible.filter((v, i) => v && d.cs?.standIndex !== i).length,
        standTransfer: d.cs ? { standIndex: d.cs.standIndex, bottom: [...d.cs.bot], top: [...d.cs.top], spin: d.cs.spin } : null,
        hookLoad: hook,
        weightOnBit: wob,
        standpipePressure: 19 * d.pump,
        rop,
      },
      casing: { stage: s.casing.stage, casingShoe: prog.casingTo * DEPTH_SCALE, stepIndex: pIdx },
      cementing: {
        pressure: s.cement.pressure,
        pumped: s.cement.pumped,
        topOfCement: s.cement.toc * DEPTH_SCALE,
        plug: s.cement.plug,
        fleetVisible: fl.visible,
        fleetArrive: fl.arrive,
        fleetLeave: fl.leave,
      },
      bop: bopSnapshot(s),
      kick: {
        active: s.op === "kick",
        earlyDetection: k.early,
        step: s.op === "kick" ? phase : null,
        gain: k.gain,
        gainAtDetect: k.gainAtDetect,
        flowOut: k.flowOut,
        gas: k.gas,
        sidpp: k.sidpp,
        sicp: k.sicp,
        maxSicp: k.maxSicp,
        alarm: s.alarm,
        flare: s.flare,
        history: k.history.map((x) => ({ ...x })),
      },
      weather: { ...s.weather },
      safety: {
        rotating: this.rotating,
        dangerZoneWorkers: s.workers.filter((w) => w.inDanger).map((w) => w.id),
        emergencyStop: s.estop,
        violations: s.violations,
        windLimit: WIND_LIMIT,
        workAtHeightBanned: s.weather.wind >= WIND_LIMIT,
      },
    };
  }
}
