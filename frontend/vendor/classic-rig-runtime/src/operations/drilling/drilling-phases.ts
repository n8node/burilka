/**
 * Фазы бурения и наращивания свечи — данные (порядок, длительности, агрегаты, расстановка людей).
 * Порядок и длительности — эталон (Wm, bn, q1, cd, aT).
 */
import type { ClassicRigPhaseDefinition, WorkerAssignment } from "../../types";
import { DRILLING_PHASE_NOTES, DRILLING_PHASE_TITLES } from "../../reference/operations-reference";
import { FLOORHAND_TABLE } from "../../reference/workers-reference";
import { DRILLING_CONFIG as C } from "./drilling-config";

const floorhands = (phase: string): WorkerAssignment[] =>
  (["helper1_A", "helper2_A"] as const).map((id) => {
    const slot = FLOORHAND_TABLE[id][phase];
    return {
      workerId: id,
      task: slot ? slot[2] : "ждёт наращивания",
      location: slot && slot[0] ? "rig_floor_red_zone" : id === "helper2_A" ? "setback" : "rig_floor_safe_zone",
      point: slot ? slot[0] : null,
      animation: slot ? slot[1] : "idle",
      label: slot ? slot[2] : undefined,
    };
  });

const driller: WorkerAssignment = { workerId: "driller_A", task: "console", location: "driller_cabin", animation: "console" };
const derrickWait: WorkerAssignment = { workerId: "derrick_A", task: "wait_on_derrick", location: "derrick_balcony", animation: "idle" };

const t = (id: string) => DRILLING_PHASE_TITLES[id] ?? id;

export const DRILLING_PHASES: ClassicRigPhaseDefinition[] = [
  {
    id: "drill",
    title: t("drill"),
    // движение: СВП опускается с cn до dh со скоростью 1.15 м/с → (34.6 − 9.2) / 1.15 ≈ 22.1 с
    durationSeconds: (C.tdTop - C.tdBottom) / C.kinematics.drillDescent,
    activeEquipment: ["topdrive", "travel", "drawworks", "mudpumps", "standpipe", "drillstring", "bha", "rotary", "shakers", "tanks"],
    workerAssignments: [
      driller,
      { workerId: "helper1_A", task: "wait_at_rotor", location: "rig_floor_safe_zone", point: [-2, 2.8], animation: "idle" },
      { workerId: "helper2_A", task: "wait_at_setback", location: "rig_floor", point: [1, 4.7], animation: "idle" },
      derrickWait,
    ],
    completion: { type: "motion", description: "СВП дошёл до нижнего положения (dh) → slips; проектный забой → td" },
    rotation: true,
    pumpTarget: 1,
    telemetry: [{ metric: "rop", description: "проходка 0.32 м сцены/с (8 м/с реальных ×25)" }],
  },
  {
    id: "slips",
    title: t("slips"),
    text: DRILLING_PHASE_NOTES.slips,
    durationSeconds: C.durations.slips,
    activeEquipment: ["powerslips", "rotary"],
    workerAssignments: [driller, ...floorhands("slips"), derrickWait],
    completion: { type: "condition", description: "таймер 2.2 с и ветер < 15 м/с (иначе ожидание по ветру)" },
    pumpTarget: 0,
  },
  {
    id: "breakTD",
    title: t("breakTD"),
    text: DRILLING_PHASE_NOTES.breakTD,
    durationSeconds: C.durations.breakTD,
    activeEquipment: ["topdrive", "powerslips"],
    workerAssignments: [driller, ...floorhands("breakTD"), derrickWait],
    completion: { type: "timer", seconds: C.durations.breakTD },
    rotation: true,
    dangerZonePermit: { workers: ["helper1_A", "helper2_A"], reason: "эталон: помбур контролирует отворот СВП у устья (обратное вращение 1.5 с, колонна на клиньях)" },
    pumpTarget: 0,
  },
  {
    id: "tdUp",
    title: t("tdUp"),
    text: DRILLING_PHASE_NOTES.tdUp,
    durationSeconds: 4.5,
    activeEquipment: ["drawworks", "travel", "topdrive", "racker"],
    workerAssignments: [driller, ...floorhands("tdUp"), { workerId: "derrick_A", task: "wait_elevator", location: "derrick_balcony", animation: "look" }],
    completion: { type: "motion", description: "СВП поднят до отметки захвата свечи (tdLatch), 5.5 м/с" },
    pumpTarget: 0,
  },
  {
    id: "latch",
    title: t("latch"),
    text: DRILLING_PHASE_NOTES.latch,
    durationSeconds: C.durations.latch,
    activeEquipment: ["racker", "setback"],
    workerAssignments: [driller, ...floorhands("latch"), { workerId: "derrick_A", task: "latch_stand", location: "derrick_balcony", animation: "reach" }],
    completion: { type: "timer", seconds: C.durations.latch },
    pumpTarget: 0,
  },
  {
    id: "lift",
    title: t("lift"),
    text: DRILLING_PHASE_NOTES.lift,
    durationSeconds: C.durations.lift,
    activeEquipment: ["drawworks", "travel", "topdrive", "racker", "setback"],
    workerAssignments: [driller, ...floorhands("lift"), { workerId: "derrick_A", task: "release_stand", location: "derrick_balcony", animation: "reach" }],
    completion: { type: "timer", seconds: C.durations.lift },
    pumpTarget: 0,
  },
  {
    id: "stab",
    title: t("stab"),
    text: DRILLING_PHASE_NOTES.stab,
    durationSeconds: C.durations.stab,
    activeEquipment: ["drawworks", "travel", "racker"],
    workerAssignments: [driller, ...floorhands("stab"), derrickWait],
    completion: { type: "timer", seconds: C.durations.stab },
    pumpTarget: 0,
  },
  {
    id: "makeup",
    title: t("makeup"),
    text: DRILLING_PHASE_NOTES.makeup,
    durationSeconds: C.durations.makeup,
    activeEquipment: ["roughneck", "powerslips"],
    workerAssignments: [driller, ...floorhands("makeup"), derrickWait],
    completion: { type: "timer", seconds: C.durations.makeup },
    pumpTarget: 0,
  },
  {
    id: "tdConnect",
    title: t("tdConnect"),
    text: DRILLING_PHASE_NOTES.tdConnect,
    durationSeconds: C.durations.tdConnect,
    activeEquipment: ["topdrive", "travel", "drawworks"],
    workerAssignments: [driller, ...floorhands("tdConnect"), derrickWait],
    completion: { type: "timer", seconds: C.durations.tdConnect },
    rotation: true,
    dangerZonePermit: { workers: ["helper1_A", "helper2_A"], reason: "эталон: СВП свинчивается со свечой медленным вращением, помбуры в 2.5 м от оси" },
    pumpTarget: 0,
  },
  {
    id: "release",
    title: t("release"),
    text: DRILLING_PHASE_NOTES.release,
    durationSeconds: C.durations.release,
    activeEquipment: ["powerslips", "mudpumps"],
    workerAssignments: [driller, ...floorhands("release"), derrickWait],
    completion: { type: "timer_and_zone_clear", seconds: C.durations.release },
    pumpTarget: 0,
  },
  {
    id: "td",
    title: t("td"),
    durationSeconds: C.kinematics.tdAutoCasingDelay,
    activeEquipment: [],
    workerAssignments: [driller],
    completion: { type: "condition", description: "в режиме «полный цикл» через 4 с запускается подъём колонны" },
    pumpTarget: 0,
  },
  {
    id: "complete",
    title: t("complete"),
    durationSeconds: C.kinematics.completeAutoMoveDelay,
    activeEquipment: [],
    workerAssignments: [driller],
    completion: { type: "condition", description: "в режиме «полный цикл» через 3 с — переезд или новый куст" },
    pumpTarget: 0,
  },
];

export const DRILLING_PHASE_ORDER = ["drill", "slips", "breakTD", "tdUp", "latch", "lift", "stab", "makeup", "tdConnect", "release"] as const;
