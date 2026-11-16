import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { DEEP_ENOUGH_MD, runUntil, sample } from "../helpers";

describe("переезд по кусту", () => {
  it("буровая сдвигается на 10 м, люди на полу едут вместе с ней, на старом устье появляется арматура", () => {
    const sim = new ClassicRigSimulation();
    sim.applyStartState({ operation: "tripping", well: { md: DEEP_ENOUGH_MD } });
    runUntil(sim, (s) => s.operation === "moving", 140);
    const before = sim.getSnapshot();
    const driller0 = before.workers.driller_A.position[0];
    let maxX = 0;
    sample(sim, 31, (s) => (maxX = Math.max(maxX, s.rigOffsetX)));
    const s = runUntil(sim, (x) => x.operation === "drilling", 5);
    expect(maxX).toBeCloseTo(10, 5);
    expect(s.rigOffsetX).toBeCloseTo(10, 5);
    expect(s.workers.driller_A.position[0] - driller0).toBeCloseTo(10, 1);
    expect(s.workers.derrick_A.level).toBe("derrick");
    expect(s.well.wellId).toBe(5);
    expect(s.well.completedWellheads).toContain(0);
    expect(s.equipment.topdrive.position![0]).toBeCloseTo(10, 5);
    expect(s.equipment.trajectory.position![0]).toBe(0); // трасса и куст не едут
  });

  it("доступен только когда скважина закреплена", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.dispatch({ type: "select_operation", operation: "moving" });
    expect(sim.getSnapshot().operation).toBe("drilling");
  });
});
