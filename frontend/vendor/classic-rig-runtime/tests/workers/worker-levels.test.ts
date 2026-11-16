import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { DEEP_ENOUGH_MD, sample } from "../helpers";

describe("уровни персонажей", () => {
  it("бурильщик у пульта, помбуры на рабочем полу, верховой на балконе — в течение двух наращиваний", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sample(sim, 110, (s) => {
      expect(s.workers.driller_A.level).toBe("rig_floor");
      expect(s.workers.driller_A.task).toBe("console");
      expect(s.workers.helper1_A.level).toBe("rig_floor");
      expect(s.workers.helper2_A.level).toBe("rig_floor");
      expect(s.workers.derrick_A.level).toBe("derrick");
    });
  });

  it("при ГНВП помбуры спускаются по лестнице на свои места по тревоге и возвращаются на пол", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.applyStartState({ well: { md: DEEP_ENOUGH_MD } });
    sim.dispatch({ type: "trigger_event", event: "kick" });
    const levels = new Set<string>();
    sample(sim, 40, (s) => levels.add(s.workers.helper1_A.level));
    expect(levels.has("ground")).toBe(true);
    sample(sim, 25, () => {});
    expect(sim.getSnapshot().workers.helper1_A.level).toBe("rig_floor");
  });

  it("люди не телепортируются: смещение за кадр не больше скорости ходьбы", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.applyStartState({ well: { md: DEEP_ENOUGH_MD } });
    let prev = sim.getSnapshot().workers;
    sample(sim, 120, (s) => {
      for (const id of Object.keys(s.workers) as (keyof typeof s.workers)[]) {
        const a = prev[id].position;
        const b = s.workers[id].position;
        expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeLessThan(2.4 * (1 / 30) + 1e-6);
      }
      prev = s.workers;
    });
  });
});
