/**
 * Перенос свечи на классической БУ: штропы + элеватор СВП + подсвечник (эталон $S, JS, setStands).
 * Свеча в переносе — тот же узел подсвечника, перемещённый в точки bottom/top (подсвечник при этом неподвижен).
 */
import type { EquipmentController } from "./equipment-types";
import { quatFromUnitVectors, vNorm, vSub } from "../util/math";

export const rackerController: EquipmentController = (f) => {
  const s = f.state;
  const cs = s.drill.cs;
  const dir = vNorm(vSub(f.kin.elevator, f.kin.pivot));
  const links = quatFromUnitVectors([0, -1, 0], dir);
  const transferring = !!cs && ["breakTD", "tdUp", "latch", "lift", "stab", "makeup", "tdConnect"].includes(f.kin.phase);
  return {
    id: "racker",
    state: transferring ? "moving" : "idle",
    visible: true,
    position: [f.rigX, 0, 0],
    activePhase: f.activeEquipment.has("racker") ? f.phase : undefined,
    kinematics: {
      linksQuat: links,
      elevatorQuat: [-links[0], -links[1], -links[2], links[3]],
      elevatorClosed: f.kin.elevatorClosed,
      standIndex: cs ? cs.standIndex : null,
      standBottom: cs ? cs.bot : null,
      standTop: cs ? cs.top : null,
      standSpin: cs ? cs.spin : 0,
    },
  };
};

export const setbackController: EquipmentController = (f) => {
  const s = f.state;
  const inSetback = s.setbackVisible.filter((v, i) => v && s.drill.cs?.standIndex !== i).length;
  return {
    id: "setback",
    state: s.drill.cs ? "engaged" : "idle",
    visible: true,
    position: [f.rigX, 0, 0],
    progress: inSetback / s.setbackVisible.length,
    activePhase: f.activeEquipment.has("setback") ? f.phase : undefined,
    kinematics: {
      standsVisible: [...s.setbackVisible],
      standInTransfer: s.drill.cs ? s.drill.cs.standIndex : null,
      standsInSetback: inSetback,
    },
  };
};
