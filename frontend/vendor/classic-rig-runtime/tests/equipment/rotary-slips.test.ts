import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { SLIP_ANGLES } from "../../src/equipment/slips-controller";
import { runUntil, sample } from "../helpers";

const slipAngles = (pos: number[]) => [0, 1, 2].map((i) => Math.atan2(pos[i * 3 + 2], pos[i * 3]));

describe("ротор и клинья", () => {
  it("стол ротора вращается при бурении", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const a0 = sim.getSnapshot().equipment.rotary.kinematics!.tableAngle as number;
    runUntil(sim, (s) => s.elapsedTime > 5, 10);
    const s = sim.getSnapshot();
    expect(s.equipment.rotary.state).toBe("running");
    expect(Math.abs((s.equipment.rotary.kinematics!.tableAngle as number) - a0)).toBeGreaterThan(10);
  });

  it("клинья не вращаются вместе с ротором: угол каждого клина постоянен", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sample(sim, 60, (s) => {
      const ang = slipAngles(s.equipment.powerslips.kinematics!.positions as number[]);
      ang.forEach((a, i) => {
        const want = Math.atan2(Math.sin(SLIP_ANGLES[i]), Math.cos(SLIP_ANGLES[i]));
        expect(Math.abs(a - want)).toBeLessThan(1e-9);
      });
    });
  });

  it("клинья закрываются отдельным состоянием на фазах наращивания и открываются в release", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    expect(sim.getSnapshot().drilling.slipsClosed).toBe(0);
    expect(sim.getSnapshot().equipment.powerslips.state).toBe("idle");
    runUntil(sim, (s) => s.phase === "breakTD", 60);
    const s = sim.getSnapshot();
    expect(s.drilling.slipsClosed).toBe(1);
    expect(s.equipment.powerslips.state).toBe("engaged");
    expect(s.equipment.rotary.state).toBe("engaged"); // стол не вращается, пока колонна на клиньях
    runUntil(sim, (x) => x.phase === "drill", 60);
    expect(sim.getSnapshot().drilling.slipsClosed).toBe(0);
  });
});
