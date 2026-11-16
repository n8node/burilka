import { describe, expect, it } from "vitest";
import { ClassicRigRuntime, drillingConnectionExam, kickResponseExam, casingCementingExam } from "../../src";
import { runFor } from "../helpers";

function runExam(rt: ClassicRigRuntime, seconds: number) {
  let done = rt.exams.result();
  const off = rt.exams.onFinished((r) => (done = r));
  for (let i = 0; i < seconds * 30 && !rt.exams.result(); i++) rt.update(1 / 30);
  off();
  return done ?? rt.exams.result();
}

describe("экзамены: порядок фаз", () => {
  it("наращивание свечи проходит по порядку и сдаётся на той же симуляции", () => {
    const rt = new ClassicRigRuntime();
    rt.exams.start(drillingConnectionExam);
    expect(rt.getSnapshot().auto).toBe(false);
    const r = runExam(rt, 180)!;
    expect(r.finishedBy).toBe("completed");
    expect(r.completedPhases).toEqual(drillingConnectionExam.requiredPhases);
    expect(r.missedPhases).toEqual([]);
    expect(r.violations).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.equipmentUsage.mudpumps).toBeGreaterThan(20);
  });

  it("ГНВП: обнаружение, закрытие ПВО, глушение", () => {
    const rt = new ClassicRigRuntime();
    rt.exams.start(kickResponseExam);
    expect(rt.getSnapshot().operation).toBe("kick");
    const r = runExam(rt, 120)!;
    expect(r.finishedBy).toBe("completed");
    expect(r.passed).toBe(true);
    expect(r.missingEvents).toEqual([]);
  });

  it("обсадка и цементирование", () => {
    const rt = new ClassicRigRuntime();
    rt.exams.start(casingCementingExam);
    const r = runExam(rt, 200)!;
    expect(r.completedPhases).toEqual(casingCementingExam.requiredPhases);
    expect(r.passed).toBe(true);
  });

  it("пропуск фаз через select_phase — ошибка порядка: последовательность начинается заново, экзамен не сдан", () => {
    const rt = new ClassicRigRuntime();
    rt.exams.start(drillingConnectionExam);
    runFor(rt, 1);
    rt.dispatch({ type: "select_phase", phase: "makeup" });
    expect(rt.exams.status()!.completedPhases).toEqual([]);
    const r = runExam(rt, 180)!;
    expect(r.orderErrors).toHaveLength(1);
    expect(r.orderErrors[0]).toContain("drill → makeup");
    expect(r.passed).toBe(false);
    expect(r.score).toBeLessThan(95);
  });

  it("пропуск фаз с ограничением по времени: незавершённые фазы попадают в missedPhases", () => {
    const rt = new ClassicRigRuntime();
    rt.exams.start({ ...drillingConnectionExam, timeLimitSeconds: 40 });
    runFor(rt, 1);
    rt.dispatch({ type: "select_phase", phase: "makeup" });
    const r = runExam(rt, 60)!;
    expect(r.finishedBy).toBe("time_limit");
    expect(r.missedPhases.length).toBeGreaterThan(0);
    expect(r.passed).toBe(false);
  });
});
