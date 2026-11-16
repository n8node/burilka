import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { DEEP_ENOUGH_MD, runUntil, sample } from "../helpers";

describe("верховой рабочий", () => {
  it("никогда не стоит на земле и не спускается с балкона (бурение, СПО, обсадка, цемент, переезд)", () => {
    const sim = new ClassicRigSimulation();
    sim.applyStartState({ well: { md: DEEP_ENOUGH_MD } });
    sample(sim, 400, (s) => {
      expect(s.workers.derrick_A.level).toBe("derrick");
      expect(s.workers.derrick_A.position[1]).toBeGreaterThan(32.9);
    }, 1 / 15);
  });

  it("на захвате свечи подходит к свече по балкону и работает руками", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    runUntil(sim, (s) => s.phase === "latch", 60);
    const s = runUntil(sim, (x) => x.workers.derrick_A.task === "reach", 5);
    expect(s.phase).toBe("latch");
    expect(s.workers.derrick_A.routeId).toBe("derrick_balcony");
  });

  it("при ветре ≥ 15 м/с работы на балконе прекращены — ждёт у площадки балкона", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.dispatch({ type: "trigger_event", event: "high_wind" });
    runUntil(sim, (s) => s.drilling.windWait, 60);
    sample(sim, 5, () => {});
    const d = sim.getSnapshot().workers.derrick_A;
    expect(d.activity).toMatch(/ветер/);
    expect(d.task).not.toBe("reach");
  });
});
