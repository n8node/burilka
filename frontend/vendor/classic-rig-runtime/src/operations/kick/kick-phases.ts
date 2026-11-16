/** Фазы ГНВП — данные эталона (influx → alarm → shutin → kill → open). */
import type { ClassicRigEquipmentId, ClassicRigPhaseDefinition } from "../../types";
import { KICK_CONFIG } from "./kick-config";

const EQUIPMENT: Record<string, ClassicRigEquipmentId[]> = {
  influx: ["tanks", "trajectory", "topdrive", "mudpumps"],
  alarm: ["topdrive", "mudpumps", "drawworks"],
  shutin: ["bop", "accumulator"],
  kill: ["choke", "mudpumps", "degasser", "trajectory"],
  open: ["bop", "accumulator"],
};

export const KICK_PHASES: ClassicRigPhaseDefinition[] = KICK_CONFIG.steps.map((s) => ({
  id: s.key,
  title: s.name,
  text: s.text,
  // influx: подменяется параметром detect (5 с — раннее обнаружение, 14 с — визуальное)
  durationSeconds: s.dur,
  activeEquipment: EQUIPMENT[s.key],
  workerAssignments:
    s.key === "influx"
      ? [{ workerId: "driller_A", task: "console", location: "driller_cabin", animation: "console" }]
      : [
          { workerId: "driller_A", task: "console", location: "driller_cabin", animation: "console" },
          { workerId: "helper1_A", task: "kick_muster", location: "choke_manifold", point: [10.6, 10.9], animation: "wrench" },
          { workerId: "helper2_A", task: "kick_muster", location: "bop_control_unit", point: [-10, 12.4], animation: "console" },
          { workerId: "derrick_A", task: "wait_on_derrick", location: "derrick_balcony", animation: "look" },
          { workerId: "mud_A", task: "kick_muster", location: "mud_tanks", point: [5.6, -17.4], animation: "write" },
          { workerId: "mech_A", task: "kick_muster", location: "mud_pumps", point: [-13.5, -14.4], animation: "look" },
          { workerId: "electric_A", task: "kick_muster", location: "muster_point", point: [-18, 24], animation: "talk" },
          { workerId: "gti", task: "kick_muster", location: "gti_station", point: [13.4, 17], animation: "write" },
        ],
  completion: { type: "timer", seconds: s.dur },
  rotation: s.key === "influx",
  pumpTarget: s.key === "kill" ? KICK_CONFIG.killPumpRate : 0,
}));
