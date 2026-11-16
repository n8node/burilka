import { describe, expect, it } from "vitest";
import { scoreExam, scoreRule } from "../../src/exams/scoring";
import { matchPhaseOrder } from "../../src/exams/exam-evaluator";
import { drillingConnectionExam } from "../../src";

const base = {
  requiredPhases: ["a", "b", "c", "d"],
  completedInOrder: ["a", "b", "c", "d"],
  violations: [] as string[],
  forbiddenTriggered: [] as string[],
  requiredEquipment: ["x", "y"],
  usedEquipment: ["x", "y"],
  durationSeconds: 60,
  timeLimitSeconds: 100,
};

describe("экзамены: баллы", () => {
  it("идеальное выполнение — 100", () => {
    expect(scoreExam(drillingConnectionExam, base).score).toBe(100);
  });
  it("порядок фаз: засчитываются только фазы в правильном порядке", () => {
    expect(matchPhaseOrder(["a", "b", "c"], ["a", "c", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(matchPhaseOrder(["a", "b", "c"], ["c", "b", "a"])).toEqual(["a"]);
    expect(scoreRule({ type: "phase_order", weight: 40 }, { ...base, completedInOrder: ["a", "b"] })).toBe(20);
    expect(scoreRule({ type: "phase_order", weight: 40 }, { ...base, orderErrors: 2 })).toBe(20);
  });
  it("безопасность: −25 % за нарушение, 0 при запрещённом событии", () => {
    expect(scoreRule({ type: "safety", weight: 40 }, { ...base, violations: ["v"] })).toBe(30);
    expect(scoreRule({ type: "safety", weight: 40 }, { ...base, forbiddenTriggered: ["f"] })).toBe(0);
  });
  it("использование агрегатов и время", () => {
    expect(scoreRule({ type: "equipment_usage", weight: 10 }, { ...base, usedEquipment: ["x"] })).toBe(5);
    expect(scoreRule({ type: "time", weight: 10 }, { ...base, durationSeconds: 150 })).toBe(5);
    expect(scoreRule({ type: "time", weight: 10 }, { ...base, durationSeconds: 250 })).toBe(0);
  });
});
