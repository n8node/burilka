import { describe, expect, it } from "vitest";
import { ClassicRigRuntime } from "../../src";
import { runFor, runUntil } from "../helpers";

describe("телеметрия агрегатов", () => {
  it("время работы насосов, вращения ротора и СВП, число запусков — по реальным событиям", () => {
    const rt = new ClassicRigRuntime({ config: { auto: false } });
    runUntil(rt, (s) => s.drilling.connections === 2, 200);
    runFor(rt, 2);
    const a = rt.telemetry.aggregates();
    const t = a.durationSeconds;
    // три отрезка бурения + циркуляция; насосы стоят на клиньях и при свинчивании
    expect(a.pumpSeconds).toBeGreaterThan(40);
    expect(a.pumpSeconds).toBeLessThan(t);
    expect(a.topdriveSeconds).toBeGreaterThan(40);
    expect(a.rotarySeconds).toBeGreaterThan(40);
    expect(a.pumpSeconds).toBeLessThan(t - 20); // паузы на наращивание действительно вычитаются
    expect(a.equipment.mudpumps!.starts).toBeGreaterThanOrEqual(3);
    expect(a.equipment.roughneck!.starts).toBeGreaterThanOrEqual(2);
    expect(a.equipment.powerslips!.phases).toContain("slips");
    expect(a.connections).toBe(2);
    expect(a.standsTransferred).toBe(2);
    // сумма времени по состояниям не превышает длительность
    for (const st of Object.values(a.equipmentStateSeconds)) {
      const sum = Object.values(st ?? {}).reduce((x, y) => x + (y ?? 0), 0);
      expect(sum).toBeLessThanOrEqual(t + 1e-6);
    }
  });

  it("сброс телеметрии вместе с runtime.reset()", () => {
    const rt = new ClassicRigRuntime();
    runFor(rt, 10);
    rt.reset();
    expect(rt.telemetry.events().length).toBe(0);
  });
});
