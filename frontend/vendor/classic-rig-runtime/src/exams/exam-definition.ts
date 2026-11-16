/** Описания экзаменов (данные). Фазы и агрегаты — из эталона классической БУ. */
import type { ClassicRigExamDefinition } from "./exam-types";

export const drillingConnectionExam: ClassicRigExamDefinition = {
  id: "classic-rig-drilling-basic",
  title: "Наращивание свечи на классической буровой",
  operationId: "drilling",
  timeLimitSeconds: 180,
  startState: { operation: "drilling", phase: "drill", auto: false },
  requiredPhases: ["drill", "slips", "breakTD", "tdUp", "latch", "lift", "stab", "makeup", "tdConnect", "release"],
  // На классической БУ «powerslips» — клинья ПКР в роторе (см. EQUIPMENT.powerslips)
  requiredEquipment: ["topdrive", "travel", "mudpumps", "rotary", "powerslips"],
  forbiddenEvents: ["worker_entered_danger_zone_during_rotation", "pump_started_with_slips_closed", "topdrive_moved_with_worker_in_collision_zone"],
  scoring: [
    { type: "phase_order", weight: 40 },
    { type: "safety", weight: 35 },
    { type: "equipment_usage", weight: 15 },
    { type: "time", weight: 10 },
  ],
};

export const kickResponseExam: ClassicRigExamDefinition = {
  id: "classic-rig-kick-response",
  title: "ГНВП: обнаружение, герметизация устья, глушение",
  operationId: "kick",
  timeLimitSeconds: 120,
  // ГНВП доступно, когда пробурено ≥ 3 м сцены ниже точки забуривания (эталон fh("kick"))
  startState: { operation: "drilling", phase: "drill", auto: false, well: { md: 1700 } },
  startCommands: [{ type: "trigger_event", event: "kick" }],
  requiredPhases: ["influx", "alarm", "shutin", "kill", "open"],
  requiredEquipment: ["bop", "accumulator", "choke", "mudpumps"],
  requiredEvents: ["kick_detected", "bop_closed", "kick_killed"],
  forbiddenEvents: ["bop_opened_during_well_control", "worker_entered_danger_zone_during_rotation"],
  scoring: [
    { type: "phase_order", weight: 40 },
    { type: "safety", weight: 40 },
    { type: "equipment_usage", weight: 10 },
    { type: "time", weight: 10 },
  ],
};

export const casingCementingExam: ClassicRigExamDefinition = {
  id: "classic-rig-casing-cementing",
  title: "Подъём колонны, обсадка и цементирование",
  operationId: "cementing",
  timeLimitSeconds: 200,
  // подъём колонны доступен при md > ws + 8 (эталон fh("casing"))
  startState: { operation: "tripping", auto: false, well: { md: 1800 } },
  requiredPhases: ["pooh", "rigup", "rih", "circ", "pump", "disp", "bump", "woc"],
  requiredEquipment: ["drawworks", "topdrive", "cementFleet", "mudpumps"],
  requiredEvents: ["well_completed"],
  forbiddenEvents: ["worker_under_rig"],
  scoring: [
    { type: "phase_order", weight: 50 },
    { type: "safety", weight: 30 },
    { type: "equipment_usage", weight: 10 },
    { type: "time", weight: 10 },
  ],
};

export const CLASSIC_RIG_EXAMS: ClassicRigExamDefinition[] = [drillingConnectionExam, kickResponseExam, casingCementingExam];
