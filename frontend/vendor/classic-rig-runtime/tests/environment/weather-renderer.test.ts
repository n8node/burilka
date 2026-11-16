import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { autoSeason } from "../../src/environment/season";
import { ClassicRigSimulation } from "../../src/simulation/ClassicRigSimulation";
import { ClassicRigEnvironmentRenderer } from "../../src/renderer/EnvironmentRenderer";

describe("environment renderer", () => {
  it("selects automatic seasons by local month and latitude", () => {
    expect(autoSeason(0, 61)).toBe("winter");
    expect(autoSeason(6, 61)).toBe("summer");
    expect(autoSeason(9, 61)).toBe("winter");
    expect(autoSeason(9, 52)).toBe("summer");
  });

  it("transitions fog gradually and patches outdoor material only once", () => {
    const scene = new THREE.Scene();
    const renderer = new ClassicRigEnvironmentRenderer(scene, { trees: false, precipitation: false, clock: () => Date.UTC(2026, 6, 1, 8) });
    const simulation = new ClassicRigSimulation();
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    renderer.prepareSurfaces(mesh);
    const handler = material.onBeforeCompile;
    renderer.prepareSurfaces(mesh);
    expect(material.onBeforeCompile).toBe(handler);
    expect(material.customProgramCacheKey()).toContain("rig-weather-v1");
    renderer.apply(simulation.getSnapshot(), 0.1);
    const start = (scene.fog as THREE.Fog).near;
    simulation.dispatch({ type: "set_weather", weather: { preset: "fog" } });
    renderer.apply(simulation.getSnapshot(), 0.1);
    const afterShort = (scene.fog as THREE.Fog).near;
    renderer.apply(simulation.getSnapshot(), 10);
    const afterLong = (scene.fog as THREE.Fog).near;
    expect(afterShort).toBeLessThan(start);
    expect(afterShort).toBeGreaterThan(afterLong);
  });
});