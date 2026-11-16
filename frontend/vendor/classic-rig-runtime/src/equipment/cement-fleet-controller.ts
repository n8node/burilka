/**
 * Цементировочный флот (эталон LS, ES, AS): скрыт вне программы цементирования,
 * подъезжает из городка (шаг rigup), стоит на шагах rih…bump, уезжает на шаге woc.
 */
import type { EquipmentController } from "./equipment-types";
import { CEMENT_FLEET_PARKS, cementFleetRoute } from "../reference/environment-reference";
import { clamp01 } from "../util/math";

/** AS(): точка на ломаной по доле пути. */
export function alongPath(pts: [number, number][], k: number): { x: number; z: number; h: number } {
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    seg.push(d);
    total += d;
  }
  let r = k * total;
  for (let i = 0; i < seg.length; i++) {
    if (r <= seg[i] || i === seg.length - 1) {
      const a = Math.min(1, r / seg[i]);
      return {
        x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * a,
        z: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * a,
        h: Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]),
      };
    }
    r -= seg[i];
  }
  return { x: pts[0][0], z: pts[0][1], h: 0 };
}

/** Позиции машин в системе группы флота (группа смещена на rigX), как в эталоне. */
export function fleetVehicles(rigX: number, arrive: number, leave: number) {
  return CEMENT_FLEET_PARKS.map((park, o) => {
    const route = cementFleetRoute(park).map(([x, z]) => [x - rigX, z] as [number, number]);
    route[0][0] = -62 - rigX;
    const c = clamp01((arrive - o * 0.12) / 0.62);
    const l = clamp01((leave - o * 0.1) / 0.6);
    const h = c * (1 - l);
    const p = alongPath(route, h);
    return { x: p.x, z: p.z, rotY: -(l > 0 ? p.h + Math.PI : p.h), visible: h > 0.001, travel: h };
  });
}

export const cementFleetController: EquipmentController = (f) => {
  const fl = f.program.fleet;
  const vehicles = fl.visible ? fleetVehicles(f.rigX, fl.arrive, fl.leave) : [];
  const moving = fl.visible && ((fl.arrive > 0 && fl.arrive < 1) || (fl.leave > 0 && fl.leave < 1));
  const pumping = ["pump", "disp", "bump"].includes(f.phase) && f.state.op === "cementing";
  return {
    id: "cementFleet",
    state: !fl.visible ? "idle" : pumping ? "running" : moving ? "moving" : "engaged",
    visible: fl.visible,
    position: [f.rigX, 0, 0],
    pressure: fl.visible ? f.state.cement.pressure : 0,
    progress: fl.arrive * (1 - fl.leave),
    activePhase: f.activeEquipment.has("cementFleet") ? f.phase : undefined,
    kinematics: {
      vehicles: vehicles.flatMap((v) => [v.x, v.z, v.rotY, v.visible ? 1 : 0]),
      hosesVisible: fl.hoses,
      headVisible: fl.head,
    },
  };
};
