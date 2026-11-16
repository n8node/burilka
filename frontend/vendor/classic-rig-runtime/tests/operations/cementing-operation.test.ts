import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { DEEP_ENOUGH_MD, collect, phasesStarted, runUntil, sample } from "../helpers";

describe("цементирование", () => {
  it("circ → pump → disp → bump → woc, давление «стоп» до 22 МПа, скважина закреплена", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const ev = collect(sim);
    sim.applyStartState({ operation: "tripping", well: { md: DEEP_ENOUGH_MD } });
    runUntil(sim, (s) => s.operation === "cementing", 80);
    let peak = 0;
    let pumpDuringCirc = 0;
    sample(sim, 44.5, (s) => {
      peak = Math.max(peak, s.cementing.pressure);
      if (s.phase === "circ") pumpDuringCirc = Math.max(pumpDuringCirc, s.drilling.pump);
    });
    const s = runUntil(sim, (x) => x.operation === "drilling", 5);
    expect(phasesStarted(ev, "cementing")).toEqual(["circ", "pump", "disp", "bump", "woc"]);
    expect(peak).toBeGreaterThan(21);
    expect(peak).toBeLessThanOrEqual(22.01);
    expect(pumpDuringCirc).toBeGreaterThan(0.9);
    expect(s.phase).toBe("complete");
    expect(ev.some((e) => e.type === "well_completed" && e.wellId === 4)).toBe(true);
    expect(s.well.wells.find((w) => w.id === 4)!.status).toBe("done");
  });

  it("в режиме «полный цикл» после цементирования начинается переезд", () => {
    const sim = new ClassicRigSimulation();
    sim.applyStartState({ operation: "tripping", well: { md: DEEP_ENOUGH_MD } });
    runUntil(sim, (s) => s.operation === "moving", 140);
  });
});
