import { describe, expect, it } from "vitest";
import { ClassicRigRuntime } from "../../src";
import { runFor, runUntil } from "../helpers";

describe("события персонажей", () => {
  it("смена заданий порождает worker_task_started; вход/выход из красной зоны парные", () => {
    const rt = new ClassicRigRuntime({ config: { auto: false } });
    runUntil(rt, (s) => s.drilling.connections === 1, 120);
    runFor(rt, 3);
    const ev = rt.telemetry.events();
    const tasks = ev.filter((e) => e.type === "worker_task_started");
    expect(new Set(tasks.map((e) => (e as { workerId: string }).workerId))).toEqual(new Set(["driller_A", "helper1_A", "helper2_A", "derrick_A", "mech_A", "mud_A", "electric_A", "master", "gti"]));
    const enter = ev.filter((e) => e.type === "worker_entered_danger_zone").length;
    const leave = ev.filter((e) => e.type === "worker_left_danger_zone").length;
    expect(enter).toBeGreaterThan(0);
    expect(leave).toBe(enter);
    const a = rt.telemetry.aggregates();
    expect(a.workers.dangerZoneSeconds.helper1_A).toBeGreaterThan(10);
    expect(a.workers.dangerZoneSeconds.derrick_A ?? 0).toBe(0);
  });
});
