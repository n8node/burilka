import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { DEEP_ENOUGH_MD, collect, phasesStarted, runUntil } from "../helpers";

describe("обсадка", () => {
  it("недоступна, пока колонна в скважине", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.applyStartState({ well: { md: DEEP_ENOUGH_MD } });
    sim.dispatch({ type: "select_operation", operation: "casing" });
    expect(sim.getSnapshot().operation).toBe("drilling");
  });

  it("rigup → rih, башмак колонны доходит до забоя", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const ev = collect(sim);
    sim.applyStartState({ operation: "tripping", well: { md: DEEP_ENOUGH_MD } });
    runUntil(sim, (s) => s.operation === "casing", 30);
    const s0 = runUntil(sim, (s) => s.phase === "rih", 15);
    expect(s0.casing.casingShoe).toBeLessThan(5);
    const s1 = runUntil(sim, (s) => s.operation === "cementing", 40);
    expect(phasesStarted(ev, "casing")).toEqual(["rigup", "rih"]);
    expect(s1.casing.stage).toBe("casing_run");
    expect(s1.casing.casingShoe).toBeCloseTo(DEEP_ENOUGH_MD, -1);
  });
});
