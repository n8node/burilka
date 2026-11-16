import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { collect, runUntil, sample } from "../helpers";

describe("красная зона", () => {
  it("помбуры в красной зоне на посадке в клинья; при вращении без разрешения — никого (блокировка вращения)", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const ev = collect(sim);
    let inZoneOnSlips = false;
    sample(sim, 160, (s) => {
      if (s.phase === "slips" && s.safety.dangerZoneWorkers.length) inZoneOnSlips = true;
      if (s.phase === "drill" && s.safety.rotating) expect(s.safety.dangerZoneWorkers).toEqual([]);
    });
    expect(inZoneOnSlips).toBe(true);
    expect(ev.filter((e) => e.type === "safety_violation")).toEqual([]);
    expect(sim.getSnapshot().drilling.connections).toBeGreaterThanOrEqual(3);
  });

  it("эталонное поведение без блокировки: помбуры ещё у устья, когда колонна начинает вращаться", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false, rotationInterlock: false } });
    const ev = collect(sim);
    runUntil(sim, (s) => s.drilling.connections === 1, 120);
    sample(sim, 3, () => {});
    expect(ev.some((e) => e.type === "safety_violation" && e.code === "worker_entered_danger_zone_during_rotation")).toBe(true);
  });

  it("блокировка удлиняет фазу release, пока помбуры не вышли из зоны", () => {
    const run = (interlock: boolean) => {
      const sim = new ClassicRigSimulation({ config: { auto: false, rotationInterlock: interlock } });
      const ev = collect(sim);
      runUntil(sim, (s) => s.drilling.connections === 1, 120);
      const st = ev.filter((e) => e.type === "phase_started") as { phaseId: string; timestamp: number }[];
      const i = st.findIndex((e) => e.phaseId === "release");
      return st[i + 1].timestamp - st[i].timestamp;
    };
    expect(run(false)).toBeCloseTo(1.8, 0);
    expect(run(true)).toBeGreaterThan(1.8);
  });
});
