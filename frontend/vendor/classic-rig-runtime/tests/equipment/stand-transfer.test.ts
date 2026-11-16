import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { SETBACK_SLOTS } from "../../src/operations/drilling/drilling-state";
import { runUntil, sample } from "../helpers";

describe("перенос свечи", () => {
  it("свеча отделяется от подсвечника и приходит на ось скважины", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    runUntil(sim, (s) => s.phase === "latch", 60);
    const s0 = sim.getSnapshot();
    const idx = s0.drilling.standTransfer!.standIndex;
    const slot = SETBACK_SLOTS[idx];
    expect(s0.drilling.standTransfer!.bottom[0]).toBeCloseTo(slot[0], 5);
    let leftSlot = false;
    sample(sim, 12, (s) => {
      const t = s.drilling.standTransfer;
      if (t && Math.hypot(t.bottom[0] - slot[0], t.bottom[2] - slot[1]) > 0.5) leftSlot = true;
    });
    expect(leftSlot).toBe(true);
    runUntil(sim, (s) => s.phase === "makeup", 20);
    const t = sim.getSnapshot().drilling.standTransfer!;
    expect(Math.hypot(t.bottom[0], t.bottom[2])).toBeLessThan(1e-6);
    expect(t.top[1] - t.bottom[1]).toBeCloseTo(25.4, 3);
  });

  it("подсвечник не двигается со свечой; после свинчивания свеча уходит из подсвечника", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const pos = new Set<string>();
    sample(sim, 55, (s) => pos.add(JSON.stringify(s.equipment.setback.position)));
    expect(pos.size).toBe(1);
    const s = runUntil(sim, (x) => x.drilling.connections === 1, 60);
    expect(s.drilling.standsInSetback).toBe(23);
    const vis = s.equipment.setback.kinematics!.standsVisible as boolean[];
    expect(vis.filter(Boolean).length).toBe(23);
    expect(s.drilling.standTransfer).toBeNull();
  });
});
