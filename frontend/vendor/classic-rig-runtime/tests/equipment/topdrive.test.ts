import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { sample } from "../helpers";

describe("верхний привод и талевая система", () => {
  it("СВП перемещается только по вертикали, талевый блок — синхронно", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const ys = new Set<number>();
    sample(sim, 60, (s) => {
      const td = s.equipment.topdrive.position!;
      const tr = s.equipment.travel.position!;
      expect(td[0]).toBe(s.rigOffsetX);
      expect(td[2]).toBe(0);
      expect(tr[1]).toBe(td[1]);
      ys.add(Math.round(td[1]));
    });
    expect(Math.min(...ys)).toBeLessThanOrEqual(10);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(34);
  });

  it("канат укорачивается при подъёме блока, барабан лебёдки вращается", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    const l0 = sim.getSnapshot().equipment.crown.kinematics!.ropeLength as number;
    const d0 = sim.getSnapshot().equipment.drawworks.kinematics!.drumAngle as number;
    sample(sim, 10, () => {});
    const s = sim.getSnapshot();
    expect(s.equipment.crown.kinematics!.ropeLength as number).toBeGreaterThan(l0); // блок опустился → канат длиннее
    expect(Math.abs((s.equipment.drawworks.kinematics!.drumAngle as number) - d0)).toBeGreaterThan(1);
  });
});
