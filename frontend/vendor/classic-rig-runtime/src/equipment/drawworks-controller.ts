/** Буровая лебёдка (эталон Ef: drum.rotation.x += (prevTd − tdY) × −1.6). */
import type { EquipmentController } from "./equipment-types";

export const drawworksController: EquipmentController = (f) => {
  const s = f.state;
  const moving = Math.abs(f.tdVelocity) > 0.02;
  return {
    id: "drawworks",
    state: s.estop ? "stopped" : moving ? "running" : "idle",
    visible: true,
    position: [f.rigX, 0, 0],
    rpm: (Math.abs(f.tdVelocity * 1.6) * 60) / (2 * Math.PI),
    activePhase: f.activeEquipment.has("drawworks") ? f.phase : undefined,
    kinematics: { drumAngle: s.drill.drumAngle },
  };
};
