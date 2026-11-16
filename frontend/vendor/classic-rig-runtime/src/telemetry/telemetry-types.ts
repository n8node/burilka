/** Типы телеметрии. */
import type { ClassicRigEquipmentId, ClassicRigWorkerId, EquipmentState } from "../types";
export type { ClassicRigTelemetryEvent, ClassicRigTelemetryEventType } from "../types";

export type EquipmentUsage = { runtimeSeconds: number; starts: number; phases: string[] };

export type TelemetryAggregates = {
  fromTime: number;
  toTime: number;
  durationSeconds: number;
  equipment: Partial<Record<ClassicRigEquipmentId, EquipmentUsage>>;
  /** время в каждом состоянии (running / moving / engaged / …), с */
  equipmentStateSeconds: Partial<Record<ClassicRigEquipmentId, Partial<Record<EquipmentState, number>>>>;
  /** время работы насосов (running), вращения стола ротора (running) и вращения СВП (running), с */
  pumpSeconds: number;
  rotarySeconds: number;
  topdriveSeconds: number;
  connections: number;
  standsTransferred: number;
  workers: {
    dangerZoneSeconds: Partial<Record<ClassicRigWorkerId, number>>;
    dangerZoneEntries: Partial<Record<ClassicRigWorkerId, number>>;
    tasksStarted: Partial<Record<ClassicRigWorkerId, number>>;
  };
  safety: {
    violations: Record<string, number>;
    totalViolations: number;
    emergencyStops: number;
  };
  delays: { windWaitSeconds: number; windWaits: number; emergencyStopSeconds: number };
  accidents: { kicksDetected: number; kicksKilled: number; lastKick: { detectMin: number; gain: number; maxSicp: number } | null };
  orderErrors: { count: number; items: { command: string; reason: string; at: number }[] };
  operations: Record<string, { started: number; completed: number; seconds: number }>;
  phasesCompleted: { operationId: string; phaseId: string; at: number }[];
};
