import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { autoSeason } from "../../src/environment/season";
import { ClassicRigSimulation } from "../../src/simulation/ClassicRigSimulation";
import { ClassicRigEnvironmentRenderer } from "../../src/renderer/EnvironmentRenderer";
import { FlareEffect } from "../../src/renderer/FlareEffect";
import { Windsock } from "../../src/renderer/Windsock";
import { FLARE_POSITION } from "../../src/reference/environment-reference";

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

  it("creates reference-style windsocks that respond to speed, direction and rig movement", () => {
    const rig = new Windsock(-14, 17, true);
    const camp = new Windsock(-84, 26, false);
    expect(rig.sock.children).toHaveLength(5);
    const colors = rig.sock.children.map((child) => ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHex());
    expect(colors).toEqual([0xff6a1a, 0xffffff, 0xff6a1a, 0xffffff, 0xff6a1a]);
    rig.update(0, 0, 0, 10);
    expect(rig.sock.rotation.x).toBeCloseTo(1.25);
    rig.update(0, 13, 90, 10);
    expect(Math.abs(rig.sock.rotation.x)).toBeLessThan(0.06);
    expect(rig.head.rotation.y).toBeCloseTo(-Math.PI / 2);
    expect(rig.group.position.x).toBe(-4);
    camp.update(0, 13, 90, 10);
    expect(camp.group.position.x).toBe(-84);
  });

  it("keeps a pilot flame and increases light and particles during flare", () => {
    const effect = new FlareEffect();
    effect.update(0.1, 0, 10, 0, 0, 0, 1);
    const pilotLight = effect.light.intensity;
    const flame = effect.group.getObjectByName("flare-flame") as THREE.Points;
    const alphas = flame.geometry.getAttribute("particleAlpha") as THREE.BufferAttribute;
    expect(pilotLight).toBeGreaterThan(0);
    expect(Array.from(alphas.array as Float32Array).some((alpha) => alpha > 0)).toBe(true);
    expect(effect.group.position.x).toBe(FLARE_POSITION[0] + 10);
    effect.update(0.1, 0, 10, 1, 0, 0, 1);
    expect(effect.light.intensity).toBeGreaterThan(pilotLight * 4);
    expect(effect.group.getObjectByName("flare-smoke")).toBeTruthy();
  });
});