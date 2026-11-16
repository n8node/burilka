import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { runFor } from "../helpers";

describe("пауза и reset", () => {
  it("пауза замораживает состояние", () => {
    const sim = new ClassicRigSimulation();
    runFor(sim, 5);
    sim.pause();
    const a = JSON.stringify(sim.getSnapshot());
    runFor(sim, 5);
    const b = JSON.stringify(sim.getSnapshot());
    expect(b).toBe(a);
    expect(sim.getSnapshot().running).toBe(false);
    sim.start();
    runFor(sim, 1);
    expect(sim.getSnapshot().elapsedTime).toBeGreaterThan(5.5);
  });

  it("reset возвращает начальное состояние", () => {
    const fresh = new ClassicRigSimulation().getSnapshot();
    const sim = new ClassicRigSimulation();
    runFor(sim, 40);
    sim.dispatch({ type: "set_weather", weather: { preset: "fog" } });
    sim.reset();
    const s = sim.getSnapshot();
    expect(s.elapsedTime).toBe(0);
    expect(s.operation).toBe(fresh.operation);
    expect(s.phase).toBe(fresh.phase);
    expect(s.drilling.tdY).toBe(fresh.drilling.tdY);
    expect(s.well.md).toBe(fresh.well.md);
    expect(s.drilling.standsInSetback).toBe(24);
    expect(s.weather.preset).toBe("clear");
    expect(JSON.stringify(s.workers)).toBe(JSON.stringify(fresh.workers));
  });

  it("set_speed ускоряет время симуляции", () => {
    const sim = new ClassicRigSimulation();
    sim.dispatch({ type: "set_speed", value: 4 });
    runFor(sim, 1);
    expect(sim.getSnapshot().elapsedTime).toBeCloseTo(4, 1);
  });

  it("симуляция не зависит от DOM (работает в Node)", () => {
    expect(typeof (globalThis as { document?: unknown }).document).toBe("undefined");
    expect(() => runFor(new ClassicRigSimulation(), 1)).not.toThrow();
  });
});
