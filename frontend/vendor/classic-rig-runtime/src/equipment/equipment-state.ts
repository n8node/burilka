/**
 * Сборка снимков всех агрегатов за кадр (эталон U1/Ef/Pl/LS/DS — только вычисления, без отрисовки).
 */
import type { ClassicRigEquipmentId, EquipmentSnapshot, EquipmentState } from "../types";
import type { EquipmentController, EquipmentFrame } from "./equipment-types";
import { EQUIPMENT, EQUIPMENT_IDS } from "./equipment-registry";
import { topdriveController } from "./topdrive-controller";
import { crownController, travelController } from "./travel-controller";
import { drawworksController } from "./drawworks-controller";
import { rotaryController } from "./rotary-controller";
import { slipsController } from "./slips-controller";
import { mudpumpController } from "./mudpump-controller";
import { roughneckController } from "./roughneck-controller";
import { rackerController, setbackController } from "./racker-controller";
import { bopController } from "./bop-controller";
import { cementFleetController } from "./cement-fleet-controller";
import { BHA_LENGTH, GOOSENECK, TANK_TOP } from "../reference/constants";
import { drillstringTop } from "../operations/drilling/drilling-kinematics";

const circulating = (f: EquipmentFrame) => f.state.drill.pump > 0.05;

const simple =
  (id: ClassicRigEquipmentId, decide: (f: EquipmentFrame) => EquipmentState, extra?: (f: EquipmentFrame) => Partial<EquipmentSnapshot>): EquipmentController =>
  (f) => ({
    id,
    state: decide(f),
    visible: true,
    position: [EQUIPMENT[id].movesWithRig ? f.rigX : 0, 0, 0],
    activePhase: f.activeEquipment.has(id) ? f.phase : undefined,
    ...(extra ? extra(f) : {}),
  });

/** Точки бурового рукава (эталон Ef: CatmullRom по 4 точкам, трубка r = 0.09). */
export function kellyHosePoints(tdY: number): [number, number, number][] {
  const o: [number, number, number] = [GOOSENECK[0] - 0.7, GOOSENECK[1], GOOSENECK[2]];
  const a: [number, number, number] = [0.45, tdY + 4.7, 0];
  const c = Math.min(o[1], a[1]) - 5.5;
  return [o, [o[0] - 0.6, o[1] - 3, o[2] + 0.4], [(o[0] + a[0]) / 2 + 0.6, c, 0.9], a];
}

const CONTROLLERS: Record<ClassicRigEquipmentId, EquipmentController> = {
  mast: simple("mast", () => "idle"),
  crown: crownController,
  travel: travelController,
  topdrive: topdriveController,
  drawworks: drawworksController,
  deadline: simple("deadline", (f) => (Math.abs(f.tdVelocity) > 0.02 ? "engaged" : "idle")),
  rotary: rotaryController,
  powerslips: slipsController,
  roughneck: roughneckController,
  racker: rackerController,
  setback: setbackController,
  bop: bopController,
  accumulator: simple("accumulator", (f) => {
    const b = f.state.bop;
    const moving = (b.annular > 0.02 && b.annular < 0.98) || (b.rams > 0.02 && b.rams < 0.98);
    return moving ? "running" : b.annular > 0.98 ? "engaged" : "idle";
  }),
  choke: simple("choke", (f) => (f.state.op === "kick" && f.phase === "kill" ? "running" : "idle"), (f) => ({
    pressure: f.state.op === "kick" ? f.state.kick.sicp : 0,
  })),
  mudpumps: mudpumpController,
  standpipe: simple("standpipe", (f) => (circulating(f) ? "running" : "idle"), (f) => ({
    pressure: 19 * f.state.drill.pump,
    flow: f.state.drill.pump * 100,
    kinematics: { hosePoints: kellyHosePoints(f.state.drill.tdY).flat() },
  })),
  tanks: simple("tanks", (f) => (circulating(f) ? "running" : "idle"), (f) => ({ kinematics: { gain: f.state.kick.gain } })),
  shakers: simple("shakers", (f) => (circulating(f) ? "running" : "idle"), (f) => ({
    kinematics: { deckY: TANK_TOP + 1.15 + Math.sin(f.state.time * 60) * 0.02 * f.state.drill.pump },
  })),
  cuttings: simple("cuttings", (f) => (circulating(f) ? "running" : "idle")),
  desander: simple("desander", (f) => (circulating(f) ? "running" : "idle")),
  degasser: simple("degasser", (f) => (circulating(f) || (f.state.op === "kick" && f.phase === "kill") ? "running" : "idle")),
  centrifuge: simple("centrifuge", (f) => (circulating(f) ? "running" : "idle"), (f) => ({ kinematics: { bowlAngle: f.state.drill.bowlAngle } })),
  gensets: simple("gensets", (f) => (f.state.estop ? "engaged" : "running")),
  vfd: simple("vfd", (f) => (f.state.estop ? "engaged" : "running")),
  drillstring: (f) => {
    const s = f.state;
    const p = f.program;
    const md = p.stringMD;
    const casingTo = p.casingTo;
    const shown = md > 0.2 || casingTo > 0.2;
    const top = shown ? drillstringTop(s, p.stringTop) : 0;
    const rotating = Math.abs(f.rotationRate) > 0.05;
    return {
      id: "drillstring",
      state: s.estop ? "stopped" : rotating ? "running" : "idle",
      visible: shown && top > 0.05,
      position: [f.rigX, 0, 0],
      rpm: (f.rotationRate * 60) / (2 * Math.PI),
      activePhase: f.activeEquipment.has("drillstring") ? f.phase : undefined,
      kinematics: {
        top,
        length: Math.max(0.01, top),
        angle: shown ? s.drill.rot : 0,
        casingColor: casingTo > 0.2 && md <= 0.2,
      },
    };
  },
  casing: simple("casing", (f) => (f.state.op === "casing" && f.phase === "rih" ? "moving" : f.program.casingTo > 0.2 ? "engaged" : "idle"), (f) => ({
    progress: f.state.casing.casTD > 0 ? f.program.casingTo / f.state.casing.casTD : 0,
  })),
  bha: (f) => {
    const md = f.program.stringMD;
    const rotating = Math.abs(f.rotationRate) > 0.05;
    return {
      id: "bha",
      state: rotating && md > BHA_LENGTH * 0.5 ? "running" : "idle",
      visible: md > BHA_LENGTH * 0.5,
      activePhase: f.activeEquipment.has("bha") ? f.phase : undefined,
      kinematics: { md, bitAngle: f.state.drill.rot * 1.8 },
    };
  },
  trajectory: simple("trajectory", (f) => (f.activeEquipment.has("trajectory") ? "engaged" : "idle")),
  cementFleet: cementFleetController,
};

export function computeEquipment(f: EquipmentFrame): Record<ClassicRigEquipmentId, EquipmentSnapshot> {
  const out = {} as Record<ClassicRigEquipmentId, EquipmentSnapshot>;
  for (const id of EQUIPMENT_IDS) out[id] = CONTROLLERS[id](f);
  if (f.state.estop) {
    for (const id of EQUIPMENT_IDS) {
      const e = out[id];
      if (e.state === "running" || e.state === "moving") e.state = id === "mudpumps" && f.state.drill.pump > 0.05 ? "running" : "stopped";
    }
  }
  return out;
}
