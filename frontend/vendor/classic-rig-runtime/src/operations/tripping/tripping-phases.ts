/** Фазы СПО: подъём бурильной колонны (эталон pooh, 22 с). */
import type { ClassicRigPhaseDefinition } from "../../types";
import { TRIPPING_STEPS } from "./tripping-config";

export const TRIPPING_PHASES: ClassicRigPhaseDefinition[] = [
  {
    id: "pooh",
    title: TRIPPING_STEPS[0].name,
    text: TRIPPING_STEPS[0].text,
    durationSeconds: TRIPPING_STEPS[0].dur,
    activeEquipment: ["topdrive", "travel", "drawworks", "setback", "racker", "drillstring", "roughneck"],
    workerAssignments: [
      { workerId: "helper1_A", task: "break_out_stands", location: "rig_floor_red_zone", point: [-0.75, 0.65], animation: "reach", label: "у устья: развинчивание свечей при подъёме" },
      { workerId: "helper2_A", task: "break_out_stands", location: "rig_floor_red_zone", point: [0.8, 0.75], animation: "reach", label: "у устья: развинчивание свечей при подъёме" },
      { workerId: "derrick_A", task: "rack_stands", location: "derrick_balcony", animation: "reach", label: "на балконе: выводит свечу из элеватора и ставит за палец" },
    ],
    completion: { type: "timer", seconds: TRIPPING_STEPS[0].dur },
    pumpTarget: 0,
  },
];
