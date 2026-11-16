import { describe, expect, it } from "vitest";
import { ClassicRigSimulation, DRILLING_PHASE_ORDER } from "../../src";
import { collect, phasesStarted, runUntil, sample } from "../helpers";

describe("бурение и наращивание свечи", () => {
  it("фазы наращивания идут в порядке эталона", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const ev = collect(sim);
    runUntil(sim, (s) => s.drilling.connections === 1, 120);
    expect(phasesStarted(ev, "drilling")).toEqual([...DRILLING_PHASE_ORDER, "drill"]);
  });

  it("длительности фаз совпадают с эталоном (bn)", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false, rotationInterlock: false } });
    const ev = collect(sim);
    runUntil(sim, (s) => s.drilling.connections === 1, 120);
    const starts = ev.filter((e) => e.type === "phase_started") as { phaseId: string; timestamp: number }[];
    const dur = (id: string) => {
      const i = starts.findIndex((e) => e.phaseId === id);
      return starts[i + 1].timestamp - starts[i].timestamp;
    };
    expect(dur("drill")).toBeCloseTo(25.4 / 1.15, 0);
    expect(dur("slips")).toBeCloseTo(2.2, 0);
    expect(dur("breakTD")).toBeCloseTo(2.4, 0);
    expect(dur("latch")).toBeCloseTo(3.2, 0);
    expect(dur("lift")).toBeCloseTo(5, 0);
    expect(dur("stab")).toBeCloseTo(2, 0);
    expect(dur("makeup")).toBeCloseTo(3.8, 0);
    expect(dur("tdConnect")).toBeCloseTo(2.4, 0);
    expect(dur("release")).toBeCloseTo(1.8, 0);
  });

  it("глубина растёт только на фазе drill, колонна вращается только в drill/breakTD/tdConnect", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    let md = sim.getSnapshot().well.md;
    let rot = sim.getSnapshot().drilling.rotation;
    let prev = sim.getSnapshot().phase;
    sample(sim, 60, (s) => {
      // фаза могла смениться в этом же шаге — изменение относится к фазе предыдущего кадра
      if (s.well.md > md + 1e-9) expect(prev).toBe("drill");
      if (Math.abs(s.drilling.rotation - rot) > 1e-9) expect(["drill", "breakTD", "tdConnect"]).toContain(prev);
      md = s.well.md;
      rot = s.drilling.rotation;
      prev = s.phase;
    });
  });

  it("при ветре ≥ 15 м/с наращивание ждёт на клиньях (эталон windWait)", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const ev = collect(sim);
    sim.dispatch({ type: "trigger_event", event: "high_wind" });
    runUntil(sim, (s) => s.phase === "slips", 60);
    const s = runUntil(sim, (x) => x.drilling.windWait, 30);
    expect(s.phase).toBe("slips");
    expect(ev.some((e) => e.type === "wind_wait_started")).toBe(true);
    sim.dispatch({ type: "trigger_event", event: "calm_wind" });
    runUntil(sim, (x) => x.phase === "breakTD", 30);
    expect(ev.some((e) => e.type === "wind_wait_ended")).toBe(true);
  });

  it("select_phase переводит на фазу наращивания с согласованным положением СВП", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.dispatch({ type: "select_phase", phase: "lift" });
    const s = sim.getSnapshot();
    expect(s.phase).toBe("lift");
    expect(s.drilling.standTransfer).not.toBeNull();
    sim.dispatch({ type: "select_phase", phase: "nope" });
    expect(sim.getSnapshot().phase).toBe("lift");
  });

  it("полный цикл: проектный забой → подъём → обсадка → цементирование → переезд", () => {
    const sim = new ClassicRigSimulation();
    const ev = collect(sim);
    runUntil(sim, (s) => s.well.wellId === 5, 1200, 1 / 20);
    const ops = ev.filter((e) => e.type === "operation_started").map((e) => (e as { operationId: string }).operationId);
    expect(ops).toEqual(["drilling", "tripping", "casing", "cementing", "moving"]);
  });
});
