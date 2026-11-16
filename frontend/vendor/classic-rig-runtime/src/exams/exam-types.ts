/** Типы экзаменов классической буровой. */
import type { ClassicRigCommand, ClassicRigEquipmentId, ClassicRigOperationId, ClassicRigSnapshot, DeepPartial } from "../types";

export type ScoringRule =
  | { type: "phase_order"; weight: number; penaltyPerViolation?: number }
  | { type: "safety"; weight: number; penaltyPerViolation?: number }
  | { type: "equipment_usage"; weight: number }
  | { type: "time"; weight: number };

export type ClassicRigExamDefinition = {
  id: string;
  title: string;
  operationId: ClassicRigOperationId;
  timeLimitSeconds?: number;
  /** ТЗ: Partial<ClassicRigSnapshot>; здесь — глубокий Partial (можно задать, например, well.md) */
  startState: DeepPartial<ClassicRigSnapshot>;
  requiredPhases: string[];
  requiredEquipment?: ClassicRigEquipmentId[];
  requiredEvents?: string[];
  forbiddenEvents?: string[];
  scoring: ScoringRule[];
  /** проходной балл, по умолчанию 70 */
  passScore?: number;
  /** команды, выполняемые при старте экзамена (например, вызвать ГНВП) */
  startCommands?: ClassicRigCommand[];
};

export type ClassicRigExamResult = {
  examId: string;
  passed: boolean;
  score: number;
  durationSeconds: number;
  completedPhases: string[];
  missedPhases: string[];
  violations: string[];
  /** Ошибки порядка действий (пропуски фаз, отклонённые команды). */
  orderErrors: string[];
  equipmentUsage: Record<string, number>;
  workerDangerZoneTime: Record<string, number>;
  /** расширение: баллы по правилам и причина завершения */
  breakdown: { rule: ScoringRule["type"]; weight: number; earned: number }[];
  finishedBy: "completed" | "time_limit" | "aborted";
  missingEvents: string[];
  forbiddenEventsTriggered: string[];
};
