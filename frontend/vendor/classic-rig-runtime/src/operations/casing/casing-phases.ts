/** Фазы операции «Обсадка» — данные эталона (rigup → rih). */
import type { ClassicRigPhaseDefinition } from "../../types";
import { CASING_STEPS } from "./casing-config";

export const CASING_PHASES: ClassicRigPhaseDefinition[] = [
  {
    id: "rigup",
    title: CASING_STEPS[0].name,
    text: CASING_STEPS[0].text,
    durationSeconds: CASING_STEPS[0].dur,
    // эталон: флот подъезжает до спуска колонны, чтобы обвязать цементировочную головку заранее
    activeEquipment: ["cementFleet"],
    workerAssignments: [
      { workerId: "helper1_A", task: "receive_cement_head", location: "rig_floor", animation: "look", label: "принимает цементировочную головку" },
      { workerId: "helper2_A", task: "receive_cement_head", location: "rig_floor", animation: "look", label: "принимает цементировочную головку" },
      { workerId: "derrick_A", task: "wait_on_derrick", location: "derrick_balcony", animation: "idle" },
    ],
    completion: { type: "timer", seconds: CASING_STEPS[0].dur },
    pumpTarget: 0,
  },
  {
    id: "rih",
    title: CASING_STEPS[1].name,
    text: CASING_STEPS[1].text,
    durationSeconds: CASING_STEPS[1].dur,
    activeEquipment: ["topdrive", "travel", "drawworks", "casing", "trajectory", "roughneck"],
    workerAssignments: [
      { workerId: "helper1_A", task: "make_up_casing", location: "rig_floor_red_zone", point: [-0.75, 0.65], animation: "reach", label: "у устья: свинчивание обсадных труб" },
      { workerId: "helper2_A", task: "make_up_casing", location: "rig_floor_red_zone", point: [0.8, 0.75], animation: "reach", label: "у устья: свинчивание обсадных труб" },
      { workerId: "derrick_A", task: "wait_on_derrick", location: "derrick_balcony", animation: "idle" },
    ],
    completion: { type: "timer", seconds: CASING_STEPS[1].dur },
    pumpTarget: 0,
  },
];
