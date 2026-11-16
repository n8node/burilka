import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { DEEP_ENOUGH_MD, collect, runUntil, sample } from "../helpers";

describe("СПО: подъём колонны", () => {
  it("недоступен на малой глубине (эталон fh: md > ws + 8)", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const ev = collect(sim);
    sim.dispatch({ type: "select_operation", operation: "tripping" });
    expect(sim.getSnapshot().operation).toBe("drilling");
    expect(ev.some((e) => e.type === "command_rejected")).toBe(true);
  });

  it("поднимает колонну за 22 с: СВП совершает ходы, свечи возвращаются в подсвечник, затем обсадка", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.applyStartState({ well: { md: DEEP_ENOUGH_MD } });
    // убрать часть свечей, как после нескольких наращиваний
    runUntil(sim, (s) => s.drilling.connections === 2, 200);
    expect(sim.getSnapshot().drilling.standsInSetback).toBe(22);
    sim.dispatch({ type: "select_operation", operation: "tripping" });
    expect(sim.getSnapshot().operation).toBe("tripping");
    let minTd = 99;
    let maxTd = 0;
    sample(sim, 21.5, (s) => {
      minTd = Math.min(minTd, s.drilling.tdY);
      maxTd = Math.max(maxTd, s.drilling.tdY);
    });
    expect(minTd).toBeLessThan(10);
    expect(maxTd).toBeGreaterThan(33);
    const s = runUntil(sim, (x) => x.operation === "casing", 5);
    expect(s.drilling.standsInSetback).toBe(24);
    expect(s.casing.stage).toBe("string_out");
  });
});
