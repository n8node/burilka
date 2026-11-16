/** Фазы переезда — данные эталона (prep → move → center). */
import type { ClassicRigEquipmentId, ClassicRigPhaseDefinition } from "../../types";
import { MOVING_CONFIG } from "./moving-config";

const EQUIPMENT: Record<string, ClassicRigEquipmentId[]> = {
  prep: ["bop"],
  move: ["mast", "drawworks", "mudpumps", "tanks", "gensets", "vfd"],
  center: ["bop", "rotary"],
};

export const MOVING_PHASES: ClassicRigPhaseDefinition[] = MOVING_CONFIG.steps.map((s) => ({
  id: s.key,
  title: s.name,
  text: s.text,
  durationSeconds: s.dur,
  activeEquipment: EQUIPMENT[s.key],
  workerAssignments: [
    { workerId: "helper1_A", task: "check_fastenings", location: "rig_floor_safe_zone", animation: "look", label: "переезд: на буровой, проверяет крепления" },
    { workerId: "helper2_A", task: "check_fastenings", location: "rig_floor_safe_zone", animation: "look", label: "переезд: на буровой, проверяет крепления" },
    { workerId: "derrick_A", task: "wait_on_derrick", location: "derrick_balcony", animation: "idle", label: "переезд: ждёт на балконе окончания движения" },
  ],
  completion: { type: "timer", seconds: s.dur },
  pumpTarget: 0,
}));
