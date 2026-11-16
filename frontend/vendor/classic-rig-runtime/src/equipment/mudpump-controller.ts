/**
 * Буровые насосы (эталон Ef: pumpRods z = z0 + sin(t·9 + ph)·0.25·pump).
 * Корпус неподвижен; движутся только штоки-поршни (6 шт.). Кривошипа в модели нет — см. ограничения.
 */
import type { EquipmentController } from "./equipment-types";

export const PISTON_PHASES = [-2.09, 0, 2.09, -2.09, 0, 2.09];
export const PISTON_Z0 = -20.9;

export const pistonOffsets = (time: number, pump: number): number[] => PISTON_PHASES.map((ph) => Math.sin(time * 9 + ph) * 0.25 * pump);

export const mudpumpController: EquipmentController = (f) => {
  const s = f.state;
  const pump = s.drill.pump;
  return {
    id: "mudpumps",
    state: s.estop && pump < 0.05 ? "stopped" : pump > 0.05 ? "running" : "idle",
    visible: true,
    position: [f.rigX, 0, 0],
    flow: pump * 100,
    pressure: 19 * pump,
    rpm: pump > 0.05 ? (9 * 60) / (2 * Math.PI) : 0,
    activePhase: f.activeEquipment.has("mudpumps") ? f.phase : undefined,
    kinematics: { pump, pistonOffsets: pistonOffsets(s.time, pump) },
  };
};
