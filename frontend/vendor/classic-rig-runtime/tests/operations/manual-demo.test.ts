import { describe, expect, it } from "vitest";
import { ClassicRigSimulation, type ClassicRigOperationId } from "../../src";
import { runFor, runUntil } from "../helpers";

const operations: ClassicRigOperationId[] = ["drilling", "tripping", "casing", "cementing", "moving", "kick"];

describe("manual operation demonstrations", () => {
  it.each(operations)("waits for the current step, plays %s once and resumes the main process", (operation) => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    runFor(sim, 1);
    sim.dispatch({ type: "queue_demo_operation", operation });
    expect(sim.getSnapshot().demo.status).toBe("waiting");
    const saved = runUntil(sim, (s) => s.demo.status === "countdown", 100);
    expect(saved.phase).toBe("slips");
    const depth = saved.well.md;
    const phase = saved.phase;
    runFor(sim, 3);
    expect(sim.getSnapshot().well.md).toBe(depth);
    sim.dispatch({ type: "begin_demo_operation" });
    expect(sim.getSnapshot().operation).toBe(operation);
    const resumed = runUntil(sim, (s) => s.demo.status === "idle", 300);
    expect(resumed.operation).toBe("drilling");
    expect(resumed.phase).toBe(phase);
    expect(resumed.well.md).toBeCloseTo(depth, 6);
  });

  it("queues additional selections while a demonstration is running", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.dispatch({ type: "queue_demo_operation", operation: "kick" });
    runUntil(sim, (s) => s.demo.status === "countdown", 100);
    sim.dispatch({ type: "begin_demo_operation" });
    sim.dispatch({ type: "queue_demo_operation", operation: "moving" });
    sim.dispatch({ type: "queue_demo_operation", operation: "casing" });
    expect(sim.getSnapshot().demo.queued).toEqual(["moving", "casing"]);
    const next = runUntil(sim, (s) => s.demo.status === "countdown", 300);
    expect(next.demo.operation).toBe("moving");
    expect(next.kick.active).toBe(false);
    sim.dispatch({ type: "begin_demo_operation" });
    expect(runUntil(sim, (s) => s.demo.status === "countdown", 300).demo.operation).toBe("casing");
    sim.dispatch({ type: "begin_demo_operation" });
    expect(runUntil(sim, (s) => s.demo.status === "idle", 300).operation).toBe("drilling");
  });

  it("starts the next demonstration after the current manual step, not the entire operation", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.dispatch({ type: "queue_demo_operation", operation: "kick" });
    runUntil(sim, (s) => s.demo.status === "countdown", 100);
    sim.dispatch({ type: "begin_demo_operation" });
    expect(sim.getSnapshot().phase).toBe("influx");
    sim.dispatch({ type: "queue_demo_operation", operation: "moving" });
    const next = runUntil(sim, (s) => s.demo.status === "countdown", 100);
    expect(next.demo.operation).toBe("moving");
    expect(next.operation).toBe("drilling");
  });

  it("assigns a distinct countdown to repeated identical requests", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.dispatch({ type: "queue_demo_operation", operation: "kick" });
    sim.dispatch({ type: "queue_demo_operation", operation: "kick" });
    const first = runUntil(sim, (s) => s.demo.status === "countdown", 100).demo.sequence;
    sim.dispatch({ type: "begin_demo_operation" });
    const second = runUntil(sim, (s) => s.demo.status === "countdown", 100);
    expect(second.demo.operation).toBe("kick");
    expect(second.demo.sequence).toBe(first + 1);
  });

  it("preserves selected weather and pause during demonstration", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.pause();
    sim.dispatch({ type: "queue_demo_operation", operation: "kick" });
    expect(sim.getSnapshot().demo.status).toBe("waiting");
    sim.start();
    runUntil(sim, (s) => s.demo.status === "countdown", 100);
    sim.dispatch({ type: "begin_demo_operation" });
    sim.dispatch({ type: "set_weather", weather: { preset: "fog", windOverride: 5 } });
    const resumed = runUntil(sim, (s) => s.demo.status === "idle", 300);
    expect(resumed.weather.preset).toBe("fog");
    expect(resumed.weather.windOverride).toBe(5);
  });

  it.each(["tripping", "casing", "cementing", "moving", "kick"] as const)("resumes interrupted %s after its current step", (operation) => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.applyStartState({ operation });
    runFor(sim, 0.5);
    sim.dispatch({ type: "queue_demo_operation", operation: "kick" });
    const suspended = runUntil(sim, (s) => s.demo.status === "countdown", 200);
    const before = { operation: suspended.operation, phase: suspended.phase, depth: suspended.well.md, rigOffsetX: suspended.rigOffsetX };
    sim.dispatch({ type: "begin_demo_operation" });
    const resumed = runUntil(sim, (s) => s.demo.status === "idle", 300);
    expect(resumed.operation).toBe(before.operation);
    expect(resumed.phase).toBe(before.phase);
    expect(resumed.well.md).toBeCloseTo(before.depth, 6);
    expect(resumed.rigOffsetX).toBe(before.rigOffsetX);
  });

  it("keeps user settings changed during countdown or demonstration", () => {
    const sim = new ClassicRigSimulation();
    sim.dispatch({ type: "queue_demo_operation", operation: "kick" });
    runUntil(sim, (s) => s.demo.status === "countdown", 100);
    sim.dispatch({ type: "set_weather", weather: { preset: "fog", windOverride: 4 } });
    sim.dispatch({ type: "begin_demo_operation" });
    expect(sim.getSnapshot().weather.preset).toBe("fog");
    sim.dispatch({ type: "set_auto", value: false });
    const resumed = runUntil(sim, (s) => s.demo.status === "idle", 300);
    expect(resumed.auto).toBe(false);
    expect(resumed.weather.windOverride).toBe(4);
  });

  it("finishes a drilling demonstration in strong wind and restores original weather", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.dispatch({ type: "set_weather", weather: { preset: "blizzard", season: "winter", windOverride: 18 } });
    sim.dispatch({ type: "queue_demo_operation", operation: "drilling" });
    runUntil(sim, (s) => s.demo.status === "countdown", 100);
    sim.dispatch({ type: "begin_demo_operation" });
    const resumed = runUntil(sim, (s) => s.demo.status === "idle", 300);
    expect(resumed.weather.windOverride).toBe(18);
    expect(resumed.weather.preset).toBe("blizzard");
  });
});