/**
 * Оценка экзамена по журналу событий той же симуляции (telemetry recorder).
 */
import type { ClassicRigTelemetryEvent } from "../types";
import type { ClassicRigExamDefinition, ClassicRigExamResult } from "./exam-types";
import { aggregate } from "../telemetry/telemetry-aggregates";
import { eventMatches } from "../telemetry/telemetry-events";
import { scoreExam } from "./scoring";

/** Завершённые фазы после последнего ручного пропуска: перескок обнуляет последовательность. */
export function completedPhasesSinceSkip(events: ClassicRigTelemetryEvent[]): string[] {
  let out: string[] = [];
  for (const e of events) {
    if (e.type === "phase_skipped") out = [];
    else if (e.type === "phase_completed") out.push(e.phaseId);
  }
  return out;
}

/** Сопоставление требуемых фаз с фактически завершёнными: учитываются только фазы в правильном порядке. */
export function matchPhaseOrder(required: string[], completed: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  for (const p of completed) {
    if (i < required.length && p === required[i]) {
      out.push(p);
      i++;
    }
  }
  return out;
}

export function evaluateExam(
  def: ClassicRigExamDefinition,
  events: ClassicRigTelemetryEvent[],
  startTime: number,
  endTime: number,
  finishedBy: ClassicRigExamResult["finishedBy"],
): ClassicRigExamResult {
  const win = events.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime);
  const agg = aggregate(win, startTime, endTime);
  const completedPhases = completedPhasesSinceSkip(win);
  const ordered = matchPhaseOrder(def.requiredPhases, completedPhases);
  const missedPhases = def.requiredPhases.filter((_, i) => i >= ordered.length);
  const violations = win.filter((e) => e.type === "safety_violation").map((e) => (e as { code: string }).code);
  const forbidden = (def.forbiddenEvents ?? []).filter((n) => win.some((e) => eventMatches(e, n)));
  const missingEvents = (def.requiredEvents ?? []).filter((n) => !win.some((e) => eventMatches(e, n)));
  const equipmentUsage: Record<string, number> = {};
  for (const [id, u] of Object.entries(agg.equipment)) if (u) equipmentUsage[id] = Math.round(u.runtimeSeconds * 100) / 100;
  const used = Object.entries(agg.equipment).filter(([, u]) => u && (u.runtimeSeconds > 0 || u.starts > 0)).map(([id]) => id);
  const duration = endTime - startTime;
  const { score, breakdown } = scoreExam(def, {
    requiredPhases: def.requiredPhases,
    completedInOrder: ordered,
    violations,
    orderErrors: agg.orderErrors.count,
    forbiddenTriggered: forbidden,
    requiredEquipment: def.requiredEquipment ?? [],
    usedEquipment: used,
    durationSeconds: duration,
    timeLimitSeconds: def.timeLimitSeconds,
  });
  const danger: Record<string, number> = {};
  for (const [id, sec] of Object.entries(agg.workers.dangerZoneSeconds)) danger[id] = Math.round((sec ?? 0) * 100) / 100;
  const passed = score >= (def.passScore ?? 70) && agg.orderErrors.count === 0 && missedPhases.length === 0 && forbidden.length === 0 && missingEvents.length === 0;
  return {
    examId: def.id,
    passed,
    score,
    durationSeconds: Math.round(duration * 100) / 100,
    completedPhases: ordered,
    missedPhases,
    violations,
    orderErrors: agg.orderErrors.items.map((o) => o.reason),
    equipmentUsage,
    workerDangerZoneTime: danger,
    breakdown,
    finishedBy,
    missingEvents,
    forbiddenEventsTriggered: forbidden,
  };
}
