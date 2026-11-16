import { describe, expect, it } from "vitest";
import { ClassicRigRuntime, drillingConnectionExam } from "../../src";

describe("экзамены: безопасность", () => {
  it("запрещённое событие (человек в красной зоне при вращении) проваливает экзамен", () => {
    // эталонное поведение без блокировки вращения: помбуры ещё у устья, когда после release снова пускается вращение.
    // Добавляем «drill» в конец, чтобы экзамен охватил этот пуск.
    const rt2 = new ClassicRigRuntime({ config: { rotationInterlock: false } });
    rt2.exams.start({ ...drillingConnectionExam, requiredPhases: [...drillingConnectionExam.requiredPhases, "drill"] });
    for (let i = 0; i < 180 * 30 && !rt2.exams.result(); i++) rt2.update(1 / 30);
    const r2 = rt2.exams.result()!;
    expect(r2.forbiddenEventsTriggered).toContain("worker_entered_danger_zone_during_rotation");
    expect(r2.passed).toBe(false);
    expect(r2.breakdown.find((b) => b.rule === "safety")!.earned).toBe(0);
  });

  it("экзамен использует тот же журнал событий, что и телеметрия", () => {
    const rt = new ClassicRigRuntime();
    rt.exams.start(drillingConnectionExam);
    for (let i = 0; i < 60 * 30 && !rt.exams.result(); i++) rt.update(1 / 30);
    const r = rt.exams.result()!;
    const agg = rt.telemetry.aggregates();
    expect(Math.abs(r.equipmentUsage.mudpumps - (agg.equipment.mudpumps?.runtimeSeconds ?? 0))).toBeLessThan(0.5);
  });
});
