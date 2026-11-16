import { describe, expect, it } from "vitest";
import { ClassicRigSimulation, allRoutes } from "../../src";
import { STAIRS_FLIGHT } from "../../src/workers/worker-routes";
import { levelOf, underSubstructure } from "../../src/workers/worker-safety";
import { RIG_PAD, CAMP_AREA } from "../../src/reference/environment-reference";
import { DEEP_ENOUGH_MD, sample } from "../helpers";
import type { Vec3 } from "../../src";

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

describe("маршруты персонажей", () => {
  it("ни один маршрут не проходит под вышечным блоком", () => {
    for (const r of allRoutes()) {
      for (let i = 0; i + 1 < r.points.length; i++) {
        for (let k = 0; k <= 50; k++) {
          const p = lerp3(r.points[i], r.points[i + 1], k / 50);
          expect(underSubstructure(p, 0), `${r.id} проходит под буровой в ${p}`).toBe(false);
        }
      }
    }
  });

  it("переход между землёй и рабочим полом — только по лестничному маршу", () => {
    for (const r of allRoutes()) {
      for (let i = 0; i + 1 < r.points.length; i++) {
        const a = r.points[i];
        const b = r.points[i + 1];
        if (levelOf(a) === levelOf(b)) continue;
        for (const p of [a, b]) {
          expect(Math.abs(p[0] - STAIRS_FLIGHT.x), `${r.id}: переход вне лестницы`).toBeLessThanOrEqual(STAIRS_FLIGHT.halfWidth);
          expect(p[2]).toBeGreaterThanOrEqual(STAIRS_FLIGHT.zFloor - 1e-9);
          expect(p[2]).toBeLessThanOrEqual(8.4 + 1e-9);
        }
      }
    }
  });

  it("на земле люди ходят только по площадке буровой, дороге и площадке городка", () => {
    const road = { minX: -86, maxX: -60, minZ: 33.5, maxZ: 40.5 };
    const inside = (p: Vec3, a: { minX: number; maxX: number; minZ: number; maxZ: number }) => p[0] >= a.minX && p[0] <= a.maxX && p[2] >= a.minZ && p[2] <= a.maxZ;
    for (const r of allRoutes()) {
      for (let i = 0; i + 1 < r.points.length; i++) {
        for (let k = 0; k <= 20; k++) {
          const p = lerp3(r.points[i], r.points[i + 1], k / 20);
          expect(inside(p, RIG_PAD) || inside(p, road) || inside(p, CAMP_AREA), `${r.id}: ${p}`).toBe(true);
        }
      }
    }
  });

  it("в динамике никто не оказывается под буровой (полный цикл + ГНВП)", () => {
    const sim = new ClassicRigSimulation();
    sim.applyStartState({ well: { md: DEEP_ENOUGH_MD } });
    sim.dispatch({ type: "trigger_event", event: "kick" });
    sample(sim, 300, (s) => {
      for (const w of Object.values(s.workers)) expect(underSubstructure(w.position, s.rigOffsetX), w.id).toBe(false);
    }, 1 / 15);
  });
});
