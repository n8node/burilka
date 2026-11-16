/** СВП (эталон: Y.u.topdrive.position.y = tdY, Y.tdRot.rotation.y = rot). Движется целиком по вертикали. */
import type { EquipmentController } from "./equipment-types";

export const topdriveController: EquipmentController = (f) => {
  const s = f.state;
  const rotating = Math.abs(f.rotationRate) > 0.05;
  const moving = Math.abs(f.tdVelocity) > 0.02;
  return {
    id: "topdrive",
    state: s.estop ? "stopped" : rotating ? "running" : moving ? "moving" : "idle",
    visible: true,
    position: [f.rigX, s.drill.tdY, 0],
    rpm: (f.rotationRate * 60) / (2 * Math.PI),
    activePhase: f.activeEquipment.has("topdrive") ? f.phase : undefined,
    kinematics: { y: s.drill.tdY, quillAngle: s.drill.rot },
  };
};
