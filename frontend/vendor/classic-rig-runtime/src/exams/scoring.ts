/** Подсчёт баллов по правилам экзамена. */
import type { ClassicRigExamDefinition, ScoringRule } from "./exam-types";

export type ScoringInput = {
  requiredPhases: string[];
  completedInOrder: string[];
  violations: string[];
  /** Ошибки порядка: ручные пропуски фаз и отклонённые команды. */
  orderErrors?: number;
  forbiddenTriggered: string[];
  requiredEquipment: string[];
  usedEquipment: string[];
  durationSeconds: number;
  timeLimitSeconds?: number;
};

export function scoreRule(rule: ScoringRule, inp: ScoringInput): number {
  switch (rule.type) {
    case "phase_order":
    {
      const frac = inp.requiredPhases.length ? inp.completedInOrder.length / inp.requiredPhases.length : 1;
      return rule.weight * frac * Math.max(0, 1 - (rule.penaltyPerViolation ?? 0.25) * (inp.orderErrors ?? 0));
    }
    case "safety": {
      if (inp.forbiddenTriggered.length) return 0;
      const pen = rule.penaltyPerViolation ?? 0.25;
      return rule.weight * Math.max(0, 1 - pen * inp.violations.length);
    }
    case "equipment_usage": {
      const req = inp.requiredEquipment;
      if (!req.length) return rule.weight;
      return (rule.weight * req.filter((e) => inp.usedEquipment.includes(e)).length) / req.length;
    }
    case "time": {
      const lim = inp.timeLimitSeconds;
      if (!lim) return rule.weight;
      return inp.durationSeconds <= lim ? rule.weight : rule.weight * Math.max(0, 1 - (inp.durationSeconds - lim) / lim);
    }
  }
}

export function scoreExam(def: ClassicRigExamDefinition, inp: ScoringInput) {
  const breakdown = def.scoring.map((r) => ({ rule: r.type, weight: r.weight, earned: Math.round(scoreRule(r, inp) * 100) / 100 }));
  const total = def.scoring.reduce((a, r) => a + r.weight, 0) || 1;
  const score = Math.round((breakdown.reduce((a, b) => a + b.earned, 0) / total) * 1000) / 10;
  return { score, breakdown };
}
