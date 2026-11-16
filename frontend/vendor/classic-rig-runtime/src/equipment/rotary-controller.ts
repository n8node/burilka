/**
 * Стол ротора. В эталоне неподвижен; вращение диска — ДОПОЛНЕНИЕ (config.rotaryTableFollowsString):
 * стол вращается вместе с колонной, только когда колонна не на клиньях.
 */
import type { EquipmentController } from "./equipment-types";

export const rotaryController: EquipmentController = (f) => {
  const s = f.state;
  const rotating = f.rotaryTableFollowsString && Math.abs(f.rotationRate) > 0.05 && f.kin.slipsK < 0.5;
  return {
    id: "rotary",
    state: s.estop ? "stopped" : rotating ? "running" : f.kin.slipsK > 0.5 ? "engaged" : "idle",
    visible: true,
    position: [f.rigX, 0, 0],
    rpm: rotating ? (f.rotationRate * 60) / (2 * Math.PI) : 0,
    activePhase: f.activeEquipment.has("rotary") ? f.phase : undefined,
    kinematics: { tableAngle: s.drill.rotaryAngle },
  };
};
