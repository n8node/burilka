import { describe, expect, it } from "vitest";
import { ClassicRigRuntime } from "../../src";
import { runFor } from "../helpers";

describe("события безопасности", () => {
  it("аварийная остановка: вращение и насосы останавливаются, время простоя учитывается", () => {
    const rt = new ClassicRigRuntime({ config: { auto: false } });
    runFor(rt, 5);
    rt.dispatch({ type: "emergency_stop" });
    runFor(rt, 4);
    const s = rt.getSnapshot();
    expect(s.safety.emergencyStop).toBe(true);
    expect(s.drilling.pump).toBeLessThan(0.01);
    expect(s.safety.rotating).toBe(false);
    const md = s.well.md;
    runFor(rt, 2);
    expect(rt.getSnapshot().well.md).toBe(md);
    rt.dispatch({ type: "start" });
    runFor(rt, 2);
    expect(rt.getSnapshot().well.md).toBeGreaterThan(md);
    const a = rt.telemetry.aggregates();
    expect(a.safety.emergencyStops).toBe(1);
    expect(a.delays.emergencyStopSeconds).toBeCloseTo(6, 0);
  });

  it("закрытие ПВО при вращении — нарушение; бурение блокируется до открытия", () => {
    const rt = new ClassicRigRuntime({ config: { auto: false } });
    runFor(rt, 3);
    rt.dispatch({ type: "close_bop" });
    runFor(rt, 3);
    const s = rt.getSnapshot();
    expect(s.bop.state).toBe("closed");
    expect(s.equipment.bop.state).toBe("engaged");
    const md = s.well.md;
    runFor(rt, 2);
    expect(rt.getSnapshot().well.md).toBe(md);
    rt.dispatch({ type: "open_bop" });
    runFor(rt, 3);
    expect(rt.getSnapshot().bop.state).toBe("open");
    const a = rt.telemetry.aggregates();
    expect(a.safety.violations.bop_closed_while_rotating).toBe(1);
  });

  it("ошибки порядка действий: недоступные команды отклоняются и считаются", () => {
    const rt = new ClassicRigRuntime({ config: { auto: false } });
    rt.dispatch({ type: "select_operation", operation: "cementing" });
    rt.dispatch({ type: "select_operation", operation: "moving" });
    rt.dispatch({ type: "open_bop" });
    const a = rt.telemetry.aggregates();
    expect(a.orderErrors.count).toBe(3);
    expect(rt.getSnapshot().operation).toBe("drilling");
  });

  it("в штатном наращивании насосы не запускаются на закрытых клиньях", () => {
    const rt = new ClassicRigRuntime({ config: { auto: false } });
    let worst = 0;
    for (let i = 0; i < 120 * 30 && rt.getSnapshot().drilling.connections < 2; i++) {
      const prev = rt.getSnapshot().drilling.pump;
      rt.update(1 / 30);
      const s = rt.getSnapshot();
      // на клиньях подача может только убывать (выбег), но не расти
      if (s.drilling.slipsClosed > 0.99) worst = Math.max(worst, s.drilling.pump - prev);
    }
    expect(worst).toBeLessThanOrEqual(1e-9);
    const v = rt.telemetry.events().filter((e) => e.type === "safety_violation").map((e) => (e as { code: string }).code);
    expect(v).not.toContain("pump_started_with_slips_closed");
  });
});
