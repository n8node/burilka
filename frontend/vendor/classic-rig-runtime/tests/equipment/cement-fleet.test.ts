import { describe, expect, it } from "vitest";
import { ClassicRigSimulation } from "../../src";
import { CAMP_AREA, CAMP_VEHICLE_POSITIONS, RIG_PAD } from "../../src/reference/environment-reference";
import { DEEP_ENOUGH_MD, runUntil, sample } from "../helpers";

describe("цементировочный флот и транспорт", () => {
  it("флот скрыт в бурении, подъёме колонны, ГНВП и переезде", () => {
    const sim = new ClassicRigSimulation();
    sim.applyStartState({ operation: "tripping", well: { md: DEEP_ENOUGH_MD } });
    sample(sim, 21, (s) => expect(s.equipment.cementFleet.visible).toBe(false));
    const k = new ClassicRigSimulation({ config: { auto: false } });
    k.applyStartState({ well: { md: DEEP_ENOUGH_MD } });
    k.dispatch({ type: "trigger_event", event: "kick" });
    sample(k, 40, (s) => expect(s.equipment.cementFleet.visible).toBe(false));
  });

  it("флот подъезжает на подготовке к цементированию, работает на закачке и уезжает на ОЗЦ", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sim.applyStartState({ operation: "tripping", well: { md: DEEP_ENOUGH_MD } });
    runUntil(sim, (s) => s.phase === "rigup", 30);
    expect(sim.getSnapshot().equipment.cementFleet.visible).toBe(true);
    const s = runUntil(sim, (x) => x.phase === "pump", 60);
    expect(s.equipment.cementFleet.state).toBe("running");
    const end = runUntil(sim, (x) => x.operation === "drilling", 60);
    expect(end.equipment.cementFleet.visible).toBe(false);
  });

  it("при бурении у манифольда нет транспорта: флот скрыт, вахтовый транспорт стоит в городке", () => {
    const sim = new ClassicRigSimulation({ config: { auto: false } });
    sample(sim, 30, (s) => {
      expect(s.equipment.cementFleet.visible).toBe(false);
      expect((s.equipment.cementFleet.kinematics!.vehicles as number[]).length).toBe(0);
    });
    for (const [x, z] of CAMP_VEHICLE_POSITIONS) {
      expect(x >= CAMP_AREA.minX && x <= CAMP_AREA.maxX && z >= CAMP_AREA.minZ && z <= CAMP_AREA.maxZ).toBe(true);
      expect(x >= RIG_PAD.minX && x <= RIG_PAD.maxX && z >= RIG_PAD.minZ && z <= RIG_PAD.maxZ).toBe(false);
    }
  });
});
