/**
 * Клинья ПКР (эталон U1: цикл по Y.slipsA). Позиции считаются в системе ротора — клинья НЕ вращаются со столом.
 * Для каждого клина: радиус 0.62 → 0.2, подъём над столом, поворот только во время установки (k < 0.5).
 */
import type { EquipmentController } from "./equipment-types";
import { FLOOR_Y } from "../reference/constants";
import { lerp } from "../util/math";

export const SLIP_ANGLES = [0, 2.094, 4.188];

export function slipPose(angle: number, k: number) {
  const r = lerp(0.62, 0.2, k);
  const y = lerp(FLOOR_Y + 0.66, FLOOR_Y + 0.5, k) + Math.sin(k * Math.PI) * 0.45;
  return {
    position: [Math.cos(angle) * r, y, Math.sin(angle) * r] as [number, number, number],
    rotation: [0, -angle, k < 0.5 ? (Math.PI / 2) * (1 - k * 2) : 0] as [number, number, number],
  };
}

export const slipsController: EquipmentController = (f) => {
  const k = f.kin.slipsK;
  const poses = SLIP_ANGLES.map((a) => slipPose(a, k));
  return {
    id: "powerslips",
    state: k > 0.98 ? "engaged" : k > 0.02 ? "moving" : "idle",
    visible: true,
    position: [f.rigX, 0, 0],
    progress: k,
    activePhase: f.activeEquipment.has("powerslips") ? f.phase : undefined,
    kinematics: { closed: k, positions: poses.flatMap((p) => p.position), rotations: poses.flatMap((p) => p.rotation) },
  };
};
