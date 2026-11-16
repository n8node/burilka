/** Талевый блок и канат (эталон Ef: travel.y = tdY; ropes: scale.y = (Ko − 0.3) − (tdY + 6.45)). */
import type { EquipmentController } from "./equipment-types";
import { CROWN_Y } from "../reference/constants";

export const ropeSpan = (tdY: number) => {
  const bottom = tdY + 6.45;
  const top = CROWN_Y - 0.3;
  const len = top - bottom;
  return { length: len, centerY: bottom + len / 2 };
};

export const travelController: EquipmentController = (f) => {
  const s = f.state;
  const moving = Math.abs(f.tdVelocity) > 0.02;
  return {
    id: "travel",
    state: s.estop ? "stopped" : moving ? "moving" : "idle",
    visible: true,
    position: [f.rigX, s.drill.tdY, 0],
    activePhase: f.activeEquipment.has("travel") ? f.phase : undefined,
    kinematics: { y: s.drill.tdY },
  };
};

export const crownController: EquipmentController = (f) => {
  const r = ropeSpan(f.state.drill.tdY);
  return {
    id: "crown",
    state: Math.abs(f.tdVelocity) > 0.02 ? "running" : "idle",
    visible: true,
    position: [f.rigX, 0, 0],
    kinematics: { ropeLength: r.length, ropeCenterY: r.centerY },
  };
};
