import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { DEEP_ENOUGH_MD, collect, phasesStarted, runUntil, sample } from "../helpers";

function startKick(early: boolean) {
  const sim = new ClassicRigSimulation({ config: { auto: false, earlyKickDetection: early } });
  const ev = collect(sim);
  sim.applyStartState({ well: { md: DEEP_ENOUGH_MD } });
  sim.dispatch({ type: "trigger_event", event: "kick" });
  return { sim, ev };
}

describe("ГНВП", () => {
  it("недоступно на малой глубине и во время переноса свечи", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.dispatch({ type: "trigger_event", event: "kick" });
    expect(sim.getSnapshot().operation).toBe("drilling");
  });

  it("influx → alarm → shutin → kill → open; ПВО закрыт на глушении и открыт после", () => {
    const { sim, ev } = startKick(true);
    expect(sim.getSnapshot().operation).toBe("kick");
    let closedInKill = false;
    let alarmSeen = false;
    let flare = 0;
    sample(sim, 40.5, (s) => {
      if (s.phase === "kill") closedInKill ||= s.bop.state === "closed";
      if (s.phase === "influx") expect(s.bop.state).toBe("open");
      alarmSeen ||= s.kick.alarm;
      flare = Math.max(flare, s.kick.flare);
    });
    const s = runUntil(sim, (x) => x.operation === "drilling", 5);
    expect(phasesStarted(ev, "kick").filter((p) => ["influx", "alarm", "shutin", "kill", "open"].includes(p))).toEqual(["influx", "alarm", "shutin", "kill", "open"]);
    expect(closedInKill).toBe(true);
    expect(alarmSeen).toBe(true);
    expect(flare).toBeGreaterThan(0.5);
    expect(s.bop.state).toBe("open");
    const order = ev.filter((e) => e.type === "kick_detected" || e.type === "bop_closed" || e.type === "bop_opened" || e.type === "kick_killed").map((e) => e.type);
    expect(order).toEqual(["kick_detected", "bop_closed", "bop_opened", "kick_killed"]);
  });

  it("раннее обнаружение: 5 с (≈2.1 мин), визуальное: 14 с (≈5.8 мин), приток больше", () => {
    const early = startKick(true);
    runUntil(early.sim, (s) => s.operation === "drilling", 60);
    const late = startKick(false);
    runUntil(late.sim, (s) => s.operation === "drilling", 60);
    const e = early.sim.getSnapshot().kick.history[0];
    const l = late.sim.getSnapshot().kick.history[0];
    expect(e.detectMin).toBeCloseTo((5 * 25) / 60, 0);
    expect(l.detectMin).toBeCloseTo((14 * 25) / 60, 0);
    expect(l.gain).toBeGreaterThan(e.gain);
    expect(l.maxSicp).toBeGreaterThan(e.maxSicp);
  });
});
