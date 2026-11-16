import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { runUntil, sample } from "../helpers";

describe("буровые насосы", () => {
  it("работают на бурении и останавливаются на наращивании", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    runUntil(sim, (s) => s.elapsedTime > 3, 5);
    expect(sim.getSnapshot().equipment.mudpumps.state).toBe("running");
    runUntil(sim, (s) => s.phase === "latch", 60);
    const s = sim.getSnapshot();
    expect(s.drilling.pump).toBeLessThan(0.05);
    expect(s.equipment.mudpumps.state).toBe("idle");
  });

  it("насосы работают только на фазах с подачей (drill, release→drill, circ, kill)", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sample(sim, 80, (s) => {
      if (s.drilling.pump > 0.5) expect(["drill", "slips", "release"]).toContain(s.phase);
    });
  });

  it("корпус насоса неподвижен, поршни совершают возвратно-поступательное движение", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const positions = new Set<string>();
    const offsets: number[] = [];
    sample(sim, 2, (s) => {
      positions.add(JSON.stringify(s.equipment.mudpumps.position));
      offsets.push((s.equipment.mudpumps.kinematics!.pistonOffsets as number[])[0]);
    });
    expect(positions.size).toBe(1);
    expect(Math.max(...offsets)).toBeGreaterThan(0.2);
    expect(Math.min(...offsets)).toBeLessThan(-0.2);
    // разные поршни в разных фазах (сдвиг 120°)
    const k = sim.getSnapshot().equipment.mudpumps.kinematics!.pistonOffsets as number[];
    expect(new Set(k.slice(0, 3).map((x) => x.toFixed(3))).size).toBe(3);
  });

  it("при остановленных насосах поршни стоят", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    runUntil(sim, (s) => s.phase === "lift", 60);
    const k = sim.getSnapshot().equipment.mudpumps.kinematics!.pistonOffsets as number[];
    k.forEach((x) => expect(Math.abs(x)).toBeLessThan(0.01));
  });
});
