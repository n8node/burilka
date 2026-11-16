/**
 * Данные, извлечённые из монолитной сцены (только классическая БУ) — в одном месте и по разделам ТЗ:
 * операции, фазы, длительности, активные агрегаты, задания и маршруты персонажей, позы,
 * требования безопасности, переходы, параметры аварий, значения по умолчанию.
 *
 * Здесь нет новых чисел: всё собирается из `src/reference/*` и определений операций, которыми
 * пользуется симуляция. Значит, эта сводка не может разойтись с тем, что реально исполняется.
 * Сводка для сравнения с эталоном — `referenceSummary()` (например, `console.log(JSON.stringify(referenceSummary(), null, 2))`).
 */
import {
  CASING_PROGRAM_STEPS,
  CLASSIC_WORKERS,
  CONNECTION_DURATIONS,
  CONNECTION_PHASES,
  DEFAULT_REGION,
  DEPTH_SCALE,
  DRILLER_KICK_LABELS,
  FLOORHAND_TABLE,
  FLOOR_LEVEL_TOLERANCE,
  FLOOR_Y,
  KICK_MUSTER,
  KICK_PARAMS,
  KICK_STEPS,
  KINEMATICS,
  MOVE_STEPS,
  MOVE_TARGETS,
  RED_ZONE_RADIUS,
  ROP_SCENE,
  SLIPS_SET_PHASES,
  STAIRS_FLIGHT,
  STAND_LENGTH,
  START_MD,
  START_WELL_INDEX,
  TD_BOTTOM,
  TD_TOP,
  WEATHER_PRESETS,
  WELLS,
  WIND_LIMIT,
} from "../src/reference";
import { drillingOperation } from "../src/operations/drilling/drilling-operation";
import { trippingOperation } from "../src/operations/tripping/tripping-operation";
import { casingOperation } from "../src/operations/casing/casing-operation";
import { cementingOperation } from "../src/operations/cementing/cementing-operation";
import { movingOperation } from "../src/operations/moving/moving-operation";
import { kickOperation } from "../src/operations/kick/kick-operation";
import { DEFAULT_CONFIG } from "../src/simulation/config";
import { POSES } from "../src/workers/worker-poses";
import { allRoutes } from "../src/workers/worker-routes";
import { VIOLATION_TITLES } from "../src/telemetry/telemetry-events";
import type { ClassicRigOperationDefinition } from "../src/types";

/** 1. Операции классической БУ в порядке программы куста. */
export const OPERATIONS: ClassicRigOperationDefinition[] = [
  drillingOperation,
  trippingOperation,
  casingOperation,
  cementingOperation,
  movingOperation,
  kickOperation,
];

/** 2–4. Фазы, длительности (с) и активные агрегаты по операциям. */
export const PHASES_BY_OPERATION = Object.fromEntries(
  OPERATIONS.map((op) => [
    op.id,
    op.phases.map((p) => ({
      id: p.id,
      title: p.title,
      durationSeconds: Math.round(p.durationSeconds * 100) / 100,
      activeEquipment: p.activeEquipment,
      rotation: !!p.rotation,
      pumpTarget: p.pumpTarget ?? 0,
    })),
  ]),
);

/** Исходные таблицы шагов эталона (до разбиения на операции). */
export const SOURCE_STEP_TABLES = {
  /** bn: длительности фаз наращивания */
  connection: CONNECTION_DURATIONS,
  connectionPhases: CONNECTION_PHASES,
  slipsSetPhases: SLIPS_SET_PHASES,
  /** To.casing: pooh 22 → rigup 10 → rih 26 → circ 6 → pump 10 → disp 16 → bump 4 → woc 9 */
  casingProgram: CASING_PROGRAM_STEPS,
  /** переезд: prep 7 → move 18 → center 7 */
  move: MOVE_STEPS,
  /** ГНВП: influx → alarm → shutin → kill → open */
  kick: KICK_STEPS,
} as const;

/** 5. Задания и маршруты персонажей. */
export const WORKERS = {
  roster: CLASSIC_WORKERS,
  /** задания по фазам наращивания (кто где стоит, что делает) */
  assignmentsByPhase: Object.fromEntries(drillingOperation.phases.map((p) => [p.id, p.workerAssignments])),
  floorhandTable: FLOORHAND_TABLE,
  kickMuster: KICK_MUSTER,
  drillerKickLabels: DRILLER_KICK_LABELS,
  /** переход земля ↔ пол буровой — только по лестнице */
  stairs: STAIRS_FLIGHT,
  routes: allRoutes(),
};

/** 6. Позы (процедурные, 30 каналов эталона `G`). */
export const POSE_NAMES = Object.keys(POSES);

/** 7. Требования безопасности. */
export const SAFETY = {
  /** «красная зона»: на полу (|y − пол| < tolerance) и ближе radius к оси скважины */
  redZone: { radius: RED_ZONE_RADIUS, floorY: FLOOR_Y, floorLevelTolerance: FLOOR_LEVEL_TOLERANCE },
  /** ветер, при котором верховой прекращает работу на балконе, м/с */
  windLimit: WIND_LIMIT,
  /** люди, которым сценарий разрешает находиться в красной зоне при вращении (по фазам) */
  dangerZonePermits: Object.fromEntries(
    OPERATIONS.flatMap((op) => op.phases.filter((p) => p.dangerZonePermit).map((p) => [`${op.id}:${p.id}`, p.dangerZonePermit])),
  ),
  violations: VIOLATION_TITLES,
  /** обязательные правила механики/людей, проверяемые тестами */
  invariants: [
    "корпус насоса неподвижен, двигаются поршни (штоки)",
    "ротор вращается, клинья вместе с ним не вращаются",
    "свеча отделяется от подсвечника и возвращается в свой слот",
    "верховой всегда на балконе",
    "никого под буровой",
    "переход на пол — по лестнице/мосткам",
    "цементировочный флот скрыт вне обсадки/цементирования",
    "транспорт не появляется у манифольда при бурении",
  ],
};

/** 8. Переходы между операциями и внутри них. */
export const TRANSITIONS = OPERATIONS.map((op) => ({
  operation: op.id,
  requirements: op.requirements ?? [],
  transitions: op.transitions ?? [],
  next: op.next ?? null,
}));

/** 9. Параметры аварий (ГНВП). */
export const KICK = {
  /** ранняя (система обнаружения) / поздняя (визуально) — длительность притока, прирост, давления */
  params: KICK_PARAMS,
  steps: KICK_STEPS,
};

/** 10. Значения по умолчанию. */
export const DEFAULTS = {
  simulation: DEFAULT_CONFIG,
  geometry: {
    floorY: FLOOR_Y,
    standLength: STAND_LENGTH,
    tdBottom: TD_BOTTOM,
    tdTop: TD_TOP,
    startMdScene: START_MD,
    ropScenePerSecond: ROP_SCENE,
    depthScale: DEPTH_SCALE,
    kinematics: KINEMATICS,
  },
  wells: WELLS,
  startWellIndex: START_WELL_INDEX,
  moveTargets: MOVE_TARGETS,
  weatherPresets: WEATHER_PRESETS,
  region: DEFAULT_REGION,
};

/** Компактная сводка для печати/сравнения с эталоном. */
export function referenceSummary() {
  return {
    operations: OPERATIONS.map((o) => ({ id: o.id, title: o.title, phases: o.phases.map((p) => p.id) })),
    phases: PHASES_BY_OPERATION,
    defaults: { ...DEFAULTS.geometry, startWellIndex: START_WELL_INDEX, windLimit: WIND_LIMIT },
    workers: CLASSIC_WORKERS.map((w) => w.id),
    poses: POSE_NAMES,
    kick: KICK_PARAMS,
  };
}
