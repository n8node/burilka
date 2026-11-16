/** Сводка телеметрии за окно времени — строится из тех же событий, что получают экзамены. */
import type { ClassicRigTelemetryEvent } from "../types";
import type { TelemetryAggregates } from "./telemetry-types";
import { EquipmentStateTimer, EquipmentUsageCounter } from "./equipment-usage";
import { SafetyStatistics } from "./safety-statistics";

export function aggregate(events: ClassicRigTelemetryEvent[], fromTime: number, toTime: number): TelemetryAggregates {
  const eq = new EquipmentUsageCounter();
  const st = new EquipmentStateTimer();
  const safety = new SafetyStatistics();
  const tasks: TelemetryAggregates["workers"]["tasksStarted"] = {};
  const operations: TelemetryAggregates["operations"] = {};
  const opOpen = new Map<string, number>();
  const phasesCompleted: TelemetryAggregates["phasesCompleted"] = [];
  const orderErrors: TelemetryAggregates["orderErrors"]["items"] = [];
  let connections = 0;
  let stands = 0;
  let kicksDetected = 0;
  let kicksKilled = 0;
  let lastKick: TelemetryAggregates["accidents"]["lastKick"] = null;
  let currentOp: string | null = null;
  const op = (id: string) => (operations[id] ??= { started: 0, completed: 0, seconds: 0 });

  for (const e of events) {
    if (e.timestamp < fromTime || e.timestamp > toTime) continue;
    eq.handle(e);
    st.handle(e);
    safety.handle(e);
    switch (e.type) {
      case "worker_task_started":
        tasks[e.workerId] = (tasks[e.workerId] ?? 0) + 1;
        break;
      case "operation_started":
        if (currentOp && opOpen.has(currentOp)) {
          op(currentOp).seconds += e.timestamp - opOpen.get(currentOp)!;
          opOpen.delete(currentOp);
        }
        op(e.operationId).started++;
        opOpen.set(e.operationId, e.timestamp);
        currentOp = e.operationId;
        break;
      case "operation_completed":
        op(e.operationId).completed++;
        if (opOpen.has(e.operationId)) {
          op(e.operationId).seconds += e.timestamp - opOpen.get(e.operationId)!;
          opOpen.delete(e.operationId);
        }
        break;
      case "phase_completed":
        phasesCompleted.push({ operationId: e.operationId, phaseId: e.phaseId, at: e.timestamp });
        break;
      case "connection_completed":
        connections++;
        break;
      case "stand_transferred":
        stands++;
        break;
      case "kick_detected":
        kicksDetected++;
        break;
      case "kick_killed":
        kicksKilled++;
        lastKick = { detectMin: e.detectMin, gain: e.gain, maxSicp: e.maxSicp };
        break;
      case "command_rejected":
        orderErrors.push({ command: e.command, reason: e.reason, at: e.timestamp });
        break;
      case "phase_skipped":
        orderErrors.push({ command: "select_phase", reason: `пропуск фаз: ${e.fromPhase} → ${e.toPhase}`, at: e.timestamp });
        break;
    }
  }
  for (const [id, t0] of opOpen) op(id).seconds += toTime - t0;
  const equipment = eq.snapshot(toTime);
  const states = st.snapshot(toTime);
  const total = Object.values(safety.violations).reduce((a, b) => a + b, 0);
  return {
    fromTime,
    toTime,
    durationSeconds: toTime - fromTime,
    equipment,
    equipmentStateSeconds: states,
    pumpSeconds: states.mudpumps?.running ?? 0,
    rotarySeconds: states.rotary?.running ?? 0,
    topdriveSeconds: states.topdrive?.running ?? 0,
    connections,
    standsTransferred: stands,
    workers: { dangerZoneSeconds: safety.dangerSecondsAt(toTime), dangerZoneEntries: { ...safety.dangerEntries }, tasksStarted: tasks },
    safety: { violations: { ...safety.violations }, totalViolations: total, emergencyStops: safety.emergencyStops },
    delays: {
      windWaitSeconds: safety.windWaitSeconds + safety.pendingWindWait(toTime),
      windWaits: safety.windWaits,
      emergencyStopSeconds: safety.estopSeconds + safety.pendingEstop(toTime),
    },
    accidents: { kicksDetected, kicksKilled, lastKick },
    orderErrors: { count: orderErrors.length, items: orderErrors },
    operations,
    phasesCompleted,
  };
}
