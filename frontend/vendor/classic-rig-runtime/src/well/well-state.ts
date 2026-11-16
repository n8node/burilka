/** Снимок скважины (эталон: ja(), U1 — локальные a/c/l/h/u, lh[].state, i.trees). */
import type { ClassicRigState } from "../simulation/ClassicRigState";
import type { WellSnapshot } from "../types";
import { BHA_LENGTH, HOLE_DRAW_FROM } from "../reference/constants";
import { WELL_GEOMETRY, wellDepths } from "./depth-model";
import type { ProgramVisuals } from "../operations/casing/casing-program";

export function wellSnapshot(s: ClassicRigState, prog: ProgramVisuals): WellSnapshot {
  const w = WELL_GEOMETRY[s.wi];
  const d = wellDepths(w, s.drill.md, s.casing.casTD);
  const a = prog.stringMD;
  return {
    wellId: w.id,
    wellIndex: s.wi,
    x: w.x,
    md: d.md,
    tvd: d.tvd,
    inc: d.inc,
    td: d.td,
    casTD: d.casTD,
    scene: {
      md: a,
      holeMD: s.op === "drilling" && s.drill.phase === "complete" ? HOLE_DRAW_FROM : s.drill.holeMD,
      pipeTo: Math.max(0, a - BHA_LENGTH),
      casingTo: prog.casingTo,
      cementInside: prog.cementInside,
      cementAnnulus: prog.cementAnnulus,
      plugAt: prog.plug,
      bhaVisible: a > BHA_LENGTH * 0.5,
    },
    wells: WELL_GEOMETRY.map((g, i) => ({
      id: g.id,
      x: g.x,
      azimuth: g.az,
      kop: g.kop,
      horizontal: g.h,
      status: s.wellStatus[g.id] === "done" ? "done" : i === s.wi ? "active" : "plan",
    })),
    completedWellheads: [...s.completedWellheads],
  };
}
