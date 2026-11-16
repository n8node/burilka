/** Статистика безопасности: время людей в красной зоне, нарушения, аварийные остановки, ожидание по ветру. */
import type { ClassicRigTelemetryEvent, ClassicRigWorkerId } from "../types";

export class SafetyStatistics {
  private inZone = new Map<ClassicRigWorkerId, number>();
  dangerSeconds: Partial<Record<ClassicRigWorkerId, number>> = {};
  dangerEntries: Partial<Record<ClassicRigWorkerId, number>> = {};
  violations: Record<string, number> = {};
  emergencyStops = 0;
  private estopSince: number | null = null;
  estopSeconds = 0;
  windWaits = 0;
  windWaitSeconds = 0;
  private windSince: number | null = null;

  handle(e: ClassicRigTelemetryEvent): void {
    switch (e.type) {
      case "worker_entered_danger_zone":
        this.inZone.set(e.workerId, e.timestamp);
        this.dangerEntries[e.workerId] = (this.dangerEntries[e.workerId] ?? 0) + 1;
        break;
      case "worker_left_danger_zone": {
        const t0 = this.inZone.get(e.workerId);
        if (t0 != null) {
          this.dangerSeconds[e.workerId] = (this.dangerSeconds[e.workerId] ?? 0) + (e.timestamp - t0);
          this.inZone.delete(e.workerId);
        }
        break;
      }
      case "safety_violation":
        this.violations[e.code] = (this.violations[e.code] ?? 0) + 1;
        break;
      case "emergency_stop":
        this.emergencyStops++;
        this.estopSince = e.timestamp;
        break;
      case "emergency_stop_released":
        if (this.estopSince != null) this.estopSeconds += e.timestamp - this.estopSince;
        this.estopSince = null;
        break;
      case "wind_wait_started":
        this.windWaits++;
        this.windSince = e.timestamp;
        break;
      case "wind_wait_ended":
        this.windWaitSeconds += e.durationSeconds;
        this.windSince = null;
        break;
    }
  }

  dangerSecondsAt(now: number): Partial<Record<ClassicRigWorkerId, number>> {
    const out = { ...this.dangerSeconds };
    for (const [id, t0] of this.inZone) out[id] = (out[id] ?? 0) + (now - t0);
    return out;
  }
  pendingWindWait(now: number): number {
    return this.windSince != null ? now - this.windSince : 0;
  }
  pendingEstop(now: number): number {
    return this.estopSince != null ? now - this.estopSince : 0;
  }
}
