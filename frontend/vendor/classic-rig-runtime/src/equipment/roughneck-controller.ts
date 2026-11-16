/** Ключ АКБ (эталон U1: akb.piv.rotation.y = lerp(park, work, akb); ролики вращаются при свинчивании). */
import type { EquipmentController } from "./equipment-types";
import { lerp } from "../util/math";

export const AKB_WORK = Math.atan2(-2.8, 2.4);
export const AKB_PARK = AKB_WORK + 1.25;

export const roughneckController: EquipmentController = (f) => {
  const s = f.state;
  const k = f.kin.akb;
  const spinning = f.kin.phase === "makeup" && s.drill.timer > 0.8 && s.drill.timer < 2.8;
  return {
    id: "roughneck",
    state: spinning ? "running" : k > 0.98 ? "engaged" : k > 0.01 ? "moving" : "idle",
    visible: true,
    position: [f.rigX, 0, 0],
    progress: k,
    activePhase: f.activeEquipment.has("roughneck") ? f.phase : undefined,
    kinematics: { armAngle: lerp(AKB_PARK, AKB_WORK, k), rollerAngle: s.drill.rollerSpin },
  };
};
