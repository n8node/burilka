/** Фазы цементирования — данные эталона (circ → pump → disp → bump → woc). */
import type { ClassicRigEquipmentId, ClassicRigPhaseDefinition } from "../../types";
import { CEMENTING_STEPS } from "./cementing-config";

const EQUIPMENT: Record<string, ClassicRigEquipmentId[]> = {
  circ: ["mudpumps", "standpipe", "shakers", "tanks", "trajectory", "casing"],
  pump: ["cementFleet", "trajectory", "casing"],
  disp: ["cementFleet", "trajectory", "casing"],
  bump: ["cementFleet", "casing"],
  woc: ["cementFleet", "trajectory", "casing"],
};

export const CEMENTING_PHASES: ClassicRigPhaseDefinition[] = CEMENTING_STEPS.map((s) => ({
  id: s.key,
  title: s.name,
  text: s.text,
  durationSeconds: s.dur,
  activeEquipment: EQUIPMENT[s.key],
  workerAssignments: [
    { workerId: "helper1_A", task: "stay_clear_of_hp_lines", location: "rig_floor_safe_zone", animation: "look", label: "цементирование: в стороне от линий высокого давления" },
    { workerId: "helper2_A", task: "stay_clear_of_hp_lines", location: "rig_floor_safe_zone", animation: "look", label: "цементирование: в стороне от линий высокого давления" },
    { workerId: "derrick_A", task: "wait_on_derrick", location: "derrick_balcony", animation: "idle", label: "балкон верхового: работы нет, колонна обсадная" },
  ],
  completion: { type: "timer", seconds: s.dur },
  pumpTarget: s.key === "circ" ? 1 : 0,
  telemetry: s.key === "circ" ? [] : [{ metric: "cement_pressure", description: "давление закачки, МПа" }],
}));
