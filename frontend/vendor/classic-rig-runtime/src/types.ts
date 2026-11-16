/**
 * Общие типы runtime классической буровой установки.
 * Модуль чистый: не импортирует react / three / next и не обращается к window/document.
 */

export type Vec3 = [number, number, number];

export type DeepPartial<T> = T extends readonly unknown[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type Quat = [number, number, number, number];

// ─────────────────────────────── идентификаторы ───────────────────────────────

export type ClassicRigOperationId =
  | "drilling"
  | "tripping"
  | "casing"
  | "cementing"
  | "moving"
  | "kick";

/** Фазы бурения/наращивания — ровно как в эталонной сцене (Y.S.phase). */
export type DrillingPhaseId =
  | "drill"
  | "slips"
  | "breakTD"
  | "tdUp"
  | "latch"
  | "lift"
  | "stab"
  | "makeup"
  | "tdConnect"
  | "release"
  | "td"
  | "complete";

export type ClassicRigEquipmentId =
  | "mast"
  | "crown"
  | "travel"
  | "topdrive"
  | "drawworks"
  | "deadline"
  | "rotary"
  | "powerslips"
  | "roughneck"
  | "racker"
  | "setback"
  | "bop"
  | "accumulator"
  | "choke"
  | "mudpumps"
  | "standpipe"
  | "tanks"
  | "shakers"
  | "cuttings"
  | "desander"
  | "degasser"
  | "centrifuge"
  | "gensets"
  | "vfd"
  | "drillstring"
  | "casing"
  | "bha"
  | "trajectory"
  | "cementFleet";

export type ClassicRigWorkerId =
  | "driller_A"
  | "helper1_A"
  | "helper2_A"
  | "derrick_A"
  | "mech_A"
  | "mud_A"
  | "electric_A"
  | "master"
  | "gti";

/** Внешние события, которые можно «подбросить» сценарием (trigger_event). */
export type ClassicRigEventId = "kick" | "high_wind" | "calm_wind";

export type WeatherPresetId = "clear" | "cloudy" | "fog" | "rain" | "storm" | "snow" | "blizzard";
export type SeasonId = "summer" | "winter";

export type WeatherState = {
  preset: WeatherPresetId;
  /** null — ветер берётся из пресета погоды */
  windOverride: number | null;
  /** текущая скорость ветра, м/с (сглаженная) */
  wind: number;
  /** направление, градусы (0 — север) */
  windDirDeg: number;
  season: SeasonId;
};

// ─────────────────────────────── команды ───────────────────────────────

export type ClassicRigCommand =
  | { type: "start" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "select_operation"; operation: ClassicRigOperationId }
  | { type: "select_phase"; phase: string }
  | { type: "set_speed"; value: number }
  | { type: "set_weather"; weather: Partial<Pick<WeatherState, "preset" | "windOverride" | "season" | "windDirDeg">> }
  | { type: "trigger_event"; event: ClassicRigEventId }
  | { type: "close_bop" }
  | { type: "open_bop" }
  | { type: "emergency_stop" }
  /** Дополнение к ТЗ: флаг «полный цикл» эталонной сцены (чекбокс «Полный цикл: бурение → обсадка → переезд»). */
  | { type: "set_auto"; value: boolean }
  /** Дополнение к ТЗ: «Система раннего обнаружения ГНВП» (чекбокс эталонной сцены). */
  | { type: "set_kick_detection"; early: boolean };

// ─────────────────────────────── снимки ───────────────────────────────

export type EquipmentState = "idle" | "running" | "moving" | "engaged" | "stopped" | "fault" | "blocked";

export type EquipmentSnapshot = {
  id: ClassicRigEquipmentId;
  state: EquipmentState;
  visible: boolean;
  position?: Vec3;
  rotation?: Vec3;
  rpm?: number;
  pressure?: number;
  /** расход, % от номинального */
  flow?: number;
  progress?: number;
  activePhase?: string;
  /**
   * Расширение ТЗ: кинематика подвижных деталей (углы, смещения, видимость),
   * вычисленная симуляцией. Renderer только применяет эти значения к деталям из asset-bindings.
   */
  kinematics?: Record<string, number | number[] | boolean | boolean[] | null>;
};

export type WorkerTaskKind = "idle" | "walk" | "reach" | "look" | "console" | "wrench" | "write" | "talk" | "wait_on_derrick";
export type WorkerLevel = "ground" | "rig_floor" | "derrick";

export type WorkerSnapshot = {
  id: ClassicRigWorkerId;
  role: string;
  task: WorkerTaskKind;
  animation: string;
  position: Vec3;
  /** угол поворота вокруг Y, рад */
  rotation: number;
  target?: Vec3;
  level: WorkerLevel;
  dangerZone: boolean;
  routeId?: string;
  /** текстовое описание текущего действия (как «Сейчас: …» в эталонной сцене) */
  activity: string;
  /** смешанная поза суставов (30 значений, см. workers/worker-poses.ts) */
  pose: number[];
  /** масштаб фигуры (эталон: 0.95–1.05) */
  scale: number;
  tabletVisible: boolean;
};

export type WellStatus = "done" | "plan" | "active";

export type WellSnapshot = {
  wellId: number;
  wellIndex: number;
  /** x устья скважины в координатах куста, м сцены */
  x: number;
  /** глубина по стволу, м (реальные, ×25 от масштаба сцены) */
  md: number;
  tvd: number;
  inc: number;
  td: number;
  casTD: number;
  /** то же в единицах сцены (для renderer) */
  scene: {
    md: number;
    holeMD: number;
    pipeTo: number;
    casingTo: number;
    cementInside: [number, number] | null;
    cementAnnulus: [number, number] | null;
    plugAt: number | null;
    bhaVisible: boolean;
  };
  wells: { id: number; x: number; azimuth: number; kop: number; horizontal: number; status: WellStatus }[];
  /** устья, на которых уже стоит фонтанная арматура (после переезда) */
  completedWellheads: number[];
};

export type StandTransferSnapshot = {
  standIndex: number;
  bottom: Vec3;
  top: Vec3;
  spin: number;
};

export type DrillingSnapshot = {
  phase: DrillingPhaseId;
  phaseTimer: number;
  /** высота верхнего привода/талевого блока, м сцены */
  tdY: number;
  /** угол поворота колонны/вала СВП, рад */
  rotation: number;
  /** 0..1 — производительность насосов */
  pump: number;
  slipsClosed: number;
  roughneckEngage: number;
  elevatorClosed: boolean;
  windWait: boolean;
  connections: number;
  standsInSetback: number;
  standTransfer: StandTransferSnapshot | null;
  hookLoad: number;
  weightOnBit: number;
  standpipePressure: number;
  rop: number;
};

export type CasingSnapshot = {
  stage: "none" | "string_out" | "casing_run";
  casingShoe: number;
  stepIndex: number;
};

export type CementingSnapshot = {
  pressure: number;
  pumped: number;
  topOfCement: number;
  plug: number | null;
  fleetVisible: boolean;
  fleetArrive: number;
  fleetLeave: number;
};

export type BopSnapshot = {
  state: "open" | "closing" | "closed" | "opening";
  annular: number;
  rams: number;
  manual: boolean;
};

export type KickSnapshot = {
  active: boolean;
  earlyDetection: boolean;
  step: string | null;
  gain: number;
  gainAtDetect: number;
  flowOut: number;
  gas: number;
  sidpp: number;
  sicp: number;
  maxSicp: number;
  alarm: boolean;
  flare: number;
  history: { early: boolean; detectMin: number; gain: number; maxSicp: number }[];
};

export type SafetySnapshot = {
  rotating: boolean;
  dangerZoneWorkers: ClassicRigWorkerId[];
  emergencyStop: boolean;
  violations: number;
  windLimit: number;
  workAtHeightBanned: boolean;
};

export type ClassicRigSnapshot = {
  running: boolean;
  speed: number;
  elapsedTime: number;
  auto: boolean;

  operation: ClassicRigOperationId;
  phase: string;
  phaseTitle: string;
  phaseText: string;
  phaseProgress: number;
  operationProgress: number;

  rigOffsetX: number;

  equipment: Record<ClassicRigEquipmentId, EquipmentSnapshot>;
  workers: Record<ClassicRigWorkerId, WorkerSnapshot>;

  well: WellSnapshot;
  drilling: DrillingSnapshot;
  casing: CasingSnapshot;
  cementing: CementingSnapshot;

  bop: BopSnapshot;
  kick: KickSnapshot;
  weather: WeatherState;
  safety: SafetySnapshot;
};

// ─────────────────────────────── описания операций ───────────────────────────────

export type WorkerAssignment = {
  workerId: ClassicRigWorkerId;
  task: string;
  location: string;
  /** точка в координатах буровой [x, z] (на уровне пола), если задана в эталоне */
  point?: [number, number] | null;
  animation?: WorkerTaskKind;
  label?: string;
};

export type PhaseRequirement =
  | { type: "operation"; operation: ClassicRigOperationId; phases?: string[] }
  | { type: "min_depth"; meters: number }
  | { type: "casing_stage"; stage: CasingSnapshot["stage"] }
  | { type: "next_well_available" }
  | { type: "bop_open" };

export type PhaseCompletionRule =
  | { type: "timer"; seconds: number }
  | { type: "motion"; description: string }
  | { type: "condition"; description: string }
  | { type: "timer_and_zone_clear"; seconds: number };

export type TelemetryRule = { metric: string; description: string };

export type DangerZonePermit = { workers: ClassicRigWorkerId[]; reason: string };

export type ClassicRigPhaseDefinition = {
  id: string;
  title: string;
  /** длительность из эталона, с; для фаз с движением — номинальная */
  durationSeconds: number;
  text?: string;
  activeEquipment: ClassicRigEquipmentId[];
  workerAssignments: WorkerAssignment[];
  requirements?: PhaseRequirement[];
  completion?: PhaseCompletionRule;
  telemetry?: TelemetryRule[];
  /** вращение колонны/СВП в фазе (для правил безопасности) */
  rotation?: boolean;
  /** целевая производительность насосов 0..1 (эталон H1: e.pump → цель) */
  pumpTarget?: number;
  /** работа людей в красной зоне при вращении, разрешённая сценарием эталона */
  dangerZonePermit?: DangerZonePermit;
};

export type ClassicRigTransition = {
  from: string;
  to: string;
  when: string;
};

export type ClassicRigOperationDefinition = {
  id: ClassicRigOperationId;
  title: string;
  phases: ClassicRigPhaseDefinition[];
  initialState: Partial<ClassicRigSnapshot>;
  transitions?: ClassicRigTransition[];
  requirements?: PhaseRequirement[];
  /** что запускается после завершения (эталон qS / lo) */
  next?: { operation: ClassicRigOperationId | "drilling_complete" | "drilling_resume" | "drilling_new_well"; always: boolean };
};

// ─────────────────────────────── телеметрия ───────────────────────────────

export type ClassicRigTelemetryEvent =
  | { type: "operation_started"; operationId: string; timestamp: number }
  | { type: "operation_completed"; operationId: string; timestamp: number }
  | { type: "phase_started"; operationId: string; phaseId: string; timestamp: number }
  | { type: "phase_completed"; operationId: string; phaseId: string; timestamp: number }
  | { type: "equipment_started"; equipmentId: ClassicRigEquipmentId; phaseId: string; timestamp: number }
  | { type: "equipment_stopped"; equipmentId: ClassicRigEquipmentId; phaseId: string; timestamp: number }
  | { type: "equipment_state_changed"; equipmentId: ClassicRigEquipmentId; from: EquipmentState; to: EquipmentState; phaseId: string; timestamp: number }
  | { type: "worker_task_started"; workerId: ClassicRigWorkerId; task: string; timestamp: number }
  | { type: "worker_entered_danger_zone"; workerId: ClassicRigWorkerId; timestamp: number; rotating: boolean; permitted: boolean }
  | { type: "worker_left_danger_zone"; workerId: ClassicRigWorkerId; timestamp: number }
  | { type: "safety_violation"; code: string; details?: Record<string, unknown>; timestamp: number }
  | { type: "connection_completed"; count: number; timestamp: number }
  | { type: "stand_transferred"; standIndex: number; timestamp: number }
  | { type: "wind_wait_started"; wind: number; timestamp: number }
  | { type: "wind_wait_ended"; durationSeconds: number; timestamp: number }
  | { type: "kick_detected"; early: boolean; gain: number; timestamp: number }
  | { type: "kick_killed"; detectMin: number; gain: number; maxSicp: number; timestamp: number }
  | { type: "bop_closed"; manual: boolean; timestamp: number }
  | { type: "bop_opened"; manual: boolean; timestamp: number }
  | { type: "emergency_stop"; timestamp: number }
  | { type: "emergency_stop_released"; timestamp: number }
  | { type: "command_rejected"; command: string; reason: string; timestamp: number }
  | { type: "phase_skipped"; operationId: ClassicRigOperationId; fromPhase: string; toPhase: string; timestamp: number }
  | { type: "well_completed"; wellId: number; timestamp: number }
  | { type: "rig_moved"; toX: number; timestamp: number };

export type ClassicRigTelemetryEventType = ClassicRigTelemetryEvent["type"];

// ─────────────────────────────── renderer (интерфейс без three) ───────────────────────────────

/** Интерфейс renderer'а, который runtime может держать, не завися от three.js. */
export interface ClassicRigSceneRenderer {
  apply(snapshot: ClassicRigSnapshot, deltaSeconds: number): void;
  dispose?(): void;
}
