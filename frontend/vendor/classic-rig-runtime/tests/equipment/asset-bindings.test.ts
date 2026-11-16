import { describe, expect, it } from "vitest";
import { CLASSIC_RIG_ASSETS, CHARACTER_ASSETS, EQUIPMENT_IDS, WORKER_IDS } from "../../src";

describe("GLB-привязки", () => {
  it("только классическая буровая: нет 02_robotic_rig и роботов", () => {
    for (const a of CLASSIC_RIG_ASSETS) expect(a.path).toMatch(/^rig-glb\/01_classic_rig\//);
    const robotIds = ["racker_robot", "floorrobot", "ironroughneck", "pipearm", "catwalkmachine", "mhwrench", "robotcabin", "redzone"];
    for (const id of robotIds) expect(EQUIPMENT_IDS as string[]).not.toContain(id);
    expect(WORKER_IDS).not.toContain("helper_B");
    expect(WORKER_IDS).not.toContain("mech_B");
    expect(CHARACTER_ASSETS.map((c) => c.workerId).sort()).toEqual([...WORKER_IDS].sort());
  });

  it("у каждой подвижной детали явный узел и сигнатура; индексы узлов в ассете уникальны", () => {
    let total = 0;
    for (const a of CLASSIC_RIG_ASSETS) {
      const idx = a.movableParts.filter((p) => !p.part.endsWith("_root")).map((p) => p.nodeIndex);
      expect(new Set(idx).size).toBe(idx.length);
      for (const p of a.movableParts) {
        expect(p.nodeIndex).toBeGreaterThanOrEqual(0);
        expect(p.nodeIndex).toBeLessThan(a.nodeCount);
        expect(p.signature).toBeTruthy();
        total++;
      }
    }
    expect(total).toBe(83);
  });

  it("персонажи: у каждого 17 именованных суставов", () => {
    for (const c of CHARACTER_ASSETS) expect(Object.keys(c.joints).length).toBe(17);
  });
});
