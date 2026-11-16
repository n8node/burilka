import { describe, expect, it } from "vitest";
import { PhaseMachine } from "../../src/simulation/PhaseMachine";
import type { ClassicRigOperationDefinition } from "../../src";
import type { OperationContext } from "../../src/simulation/OperationRegistry";

const def: ClassicRigOperationDefinition = {
  id: "moving",
  title: "test",
  initialState: {},
  phases: [
    { id: "a", title: "A", durationSeconds: 2, activeEquipment: [], workerAssignments: [] },
    { id: "b", title: "B", durationSeconds: 1, activeEquipment: [], workerAssignments: [] },
  ],
};

function ctx() {
  const events: string[] = [];
  const state = { stepIndex: 0, stepP: 0 } as unknown as OperationContext["state"];
  const c = {
    state,
    phaseStarted: (id: string) => events.push("start:" + id),
    phaseCompleted: (id: string) => events.push("done:" + id),
  } as unknown as OperationContext;
  return { c, events };
}

describe("PhaseMachine", () => {
  it("проходит фазы по порядку и по длительностям", () => {
    const m = new PhaseMachine(def);
    const { c, events } = ctx();
    m.start(c);
    let finished = false;
    let t = 0;
    while (!finished && t < 10) {
      finished = m.update(c, 0.1);
      t += 0.1;
    }
    expect(finished).toBe(true);
    expect(Math.abs(t - 3)).toBeLessThan(0.15);
    expect(events).toEqual(["start:a", "done:a", "start:b", "done:b"]);
  });

  it("считает прогресс операции по длительностям", () => {
    const m = new PhaseMachine(def);
    const { c } = ctx();
    m.start(c);
    for (let i = 0; i < 20; i++) m.update(c, 0.05);
    expect(m.progress(c)).toBeCloseTo(1 / 3, 2);
  });

  it("jumpTo переходит к фазе по id и отклоняет неизвестные", () => {
    const m = new PhaseMachine(def);
    const { c, events } = ctx();
    expect(m.jumpTo(c, "b")).toBe(true);
    expect(m.current(c).id).toBe("b");
    expect(m.jumpTo(c, "zzz")).toBe(false);
    expect(events).toContain("start:b");
  });

  it("длительность может подменяться хуком (как influx в ГНВП)", () => {
    const m = new PhaseMachine(def, { duration: (_c, p) => (p.id === "a" ? 0.5 : p.durationSeconds) });
    const { c } = ctx();
    m.start(c);
    let t = 0;
    while (!m.update(c, 0.05)) t += 0.05;
    expect(Math.abs(t - 1.5)).toBeLessThan(0.1);
  });
});
