/** Время работы, число запусков и фазы использования агрегатов — по событиям equipment_started/stopped. */
import type { ClassicRigEquipmentId, ClassicRigTelemetryEvent, EquipmentState } from "../types";
import type { EquipmentUsage } from "./telemetry-types";

export class EquipmentStateTimer {
  private cur = new Map<ClassicRigEquipmentId, { state: EquipmentState; since: number }>();
  private acc = new Map<ClassicRigEquipmentId, Partial<Record<EquipmentState, number>>>();
  handle(e: ClassicRigTelemetryEvent): void {
    if (e.type !== "equipment_state_changed") return;
    const c = this.cur.get(e.equipmentId);
    if (c) this.add(e.equipmentId, c.state, e.timestamp - c.since);
    this.cur.set(e.equipmentId, { state: e.to, since: e.timestamp });
  }
  snapshot(now: number): Partial<Record<ClassicRigEquipmentId, Partial<Record<EquipmentState, number>>>> {
    const out: Partial<Record<ClassicRigEquipmentId, Partial<Record<EquipmentState, number>>>> = {};
    for (const [id, m] of this.acc) out[id] = { ...m };
    for (const [id, c] of this.cur) {
      const m = (out[id] ??= {});
      m[c.state] = (m[c.state] ?? 0) + (now - c.since);
    }
    return out;
  }
  private add(id: ClassicRigEquipmentId, st: EquipmentState, dt: number) {
    const m = this.acc.get(id) ?? {};
    m[st] = (m[st] ?? 0) + dt;
    this.acc.set(id, m);
  }
}

export class EquipmentUsageCounter {
  private open = new Map<ClassicRigEquipmentId, number>();
  private usage = new Map<ClassicRigEquipmentId, { runtime: number; starts: number; phases: Set<string> }>();

  handle(e: ClassicRigTelemetryEvent): void {
    if (e.type === "equipment_started") {
      const u = this.get(e.equipmentId);
      u.starts++;
      u.phases.add(e.phaseId);
      this.open.set(e.equipmentId, e.timestamp);
    } else if (e.type === "equipment_stopped") {
      const t0 = this.open.get(e.equipmentId);
      if (t0 != null) {
        this.get(e.equipmentId).runtime += e.timestamp - t0;
        this.open.delete(e.equipmentId);
      }
    } else if (e.type === "phase_started") {
      for (const id of this.open.keys()) this.get(id).phases.add(e.phaseId);
    }
  }

  snapshot(now: number): Partial<Record<ClassicRigEquipmentId, EquipmentUsage>> {
    const out: Partial<Record<ClassicRigEquipmentId, EquipmentUsage>> = {};
    for (const [id, u] of this.usage) {
      const t0 = this.open.get(id);
      out[id] = { runtimeSeconds: u.runtime + (t0 != null ? now - t0 : 0), starts: u.starts, phases: [...u.phases] };
    }
    return out;
  }

  reset(): void {
    this.open.clear();
    this.usage.clear();
  }

  private get(id: ClassicRigEquipmentId) {
    let u = this.usage.get(id);
    if (!u) this.usage.set(id, (u = { runtime: 0, starts: 0, phases: new Set() }));
    return u;
  }
}
