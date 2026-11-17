/**
 * Окружение: земля, площадка под одну буровую, дорога и площадка городка, лес, небо, свет, туман, осадки, факел.
 * Значения берутся из snapshot.weather и из положения солнца (environment/lighting.ts).
 * Плавное изменение погоды и снег/влага на материалах сцены.
 */
import * as THREE from "three";
import type { ClassicRigSnapshot } from "../types";
import { WEATHER_PRESETS } from "../reference/environment-reference";
import { sunPosition, daylight } from "../environment/lighting";
import { lcg } from "../util/math";
import { FlareEffect } from "./FlareEffect";
import { Windsock } from "./Windsock";

export type EnvironmentOptions = {
  /** широта/долгота площадки (по умолчанию ХМАО, Сургут) */
  lat?: number;
  lon?: number;
  /** функция «текущего времени» для солнца; по умолчанию Date.now() */
  clock?: () => number;
  trees?: boolean;
  precipitation?: boolean;
};

export class ClassicRigEnvironmentRenderer {
  readonly group = new THREE.Group();
  readonly sun = new THREE.DirectionalLight(0xffffff, 2.2);
  readonly moon = new THREE.DirectionalLight(0x9bbcff, 0);
  readonly hemi = new THREE.HemisphereLight(0xdfeaff, 0x5a5a48, 0.9);
  private pad: THREE.Mesh;
  private ground: THREE.Mesh;
  private readonly flare = new FlareEffect();
  private readonly windsocks = [new Windsock(-14, 17, true), new Windsock(-84, 26, false)];
  private effectTime = 0;
  private floods: THREE.PointLight[] = [];
  private precip: THREE.Points | null = null;
  private atmosphere = { cloud: 0, fog: 0, rain: 0, snow: 0, winter: 0, wet: 0 };
  private atmosphereInitialized = false;
  private readonly snowUniform = { value: 0 };
  private readonly wetUniform = { value: 0 };
  private readonly patchedMaterials = new WeakSet<THREE.Material>();
  private readonly opts: Required<Omit<EnvironmentOptions, "clock">> & { clock: () => number };

  constructor(private readonly scene: THREE.Scene, opts: EnvironmentOptions = {}) {
    this.opts = { lat: 61.25, lon: 73.4, trees: true, precipitation: true, clock: () => Date.now(), ...opts };
    this.group.name = "environment";
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: 7304536, roughness: 1 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.62;
    this.ground.receiveShadow = true;
    this.group.add(this.ground);
    // площадка под одну классическую буровую (130 × 95 м), с въездом дороги из городка
    this.pad = new THREE.Mesh(new THREE.BoxGeometry(130, 0.6, 95), new THREE.MeshStandardMaterial({ color: 13022094, roughness: 1 }));
    this.pad.position.set(0, -0.3, -2.5);
    this.pad.receiveShadow = true;
    this.group.add(this.pad);
    const campMat = new THREE.MeshStandardMaterial({ color: 12298634, roughness: 1 });
    const camp = new THREE.Mesh(new THREE.BoxGeometry(52, 0.5, 64), campMat);
    camp.position.set(-108, -0.37, 37);
    const road = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 7), campMat);
    road.position.set(-73, -0.37, 37);
    camp.receiveShadow = road.receiveShadow = true;
    this.group.add(camp, road);
    if (this.opts.trees) this.group.add(this.buildForest());
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -130, right: 130, top: 110, bottom: -110, near: 10, far: 450 });
    this.sun.shadow.bias = -6e-4;
    this.sun.target.position.set(-40, 0, 20);
    this.group.add(this.sun, this.sun.target, this.hemi);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    Object.assign(this.moon.shadow.camera, { left: -130, right: 130, top: 110, bottom: -110, near: 10, far: 450 });
    this.moon.shadow.bias = -8e-4;
    this.moon.target.position.set(-40, 0, 20);
    this.group.add(this.moon, this.moon.target);
    this.group.add(this.flare.group, ...this.windsocks.map((windsock) => windsock.group));
    for (const p of [[0, 15.2, 4], [0, 30, 2], [12, 9, -14]] as const) {
      const l = new THREE.PointLight(0xfff1d6, 0, 45, 1.6);
      l.position.set(p[0], p[1], p[2]);
      l.userData.x0 = p[0];
      this.floods.push(l);
      this.group.add(l);
    }
    scene.add(this.group);
    scene.fog = new THREE.Fog(0xc9d6e2, 220, 900);
  }

  setEnvironment(opts: Pick<EnvironmentOptions, "lat" | "lon" | "clock">): void {
    if (opts.lat != null) this.opts.lat = opts.lat;
    if (opts.lon != null) this.opts.lon = opts.lon;
    if (opts.clock != null) this.opts.clock = opts.clock;
  }

  setViewport(height: number, fov: number, pixelRatio: number): void {
    this.flare.setProjection(height, fov, pixelRatio);
  }

  /** Apply shared snow/wet uniforms to outdoor PBR materials after assets load. */
  prepareSurfaces(root: THREE.Object3D): void {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const standard = material as THREE.MeshStandardMaterial;
        if (!standard.isMeshStandardMaterial || standard.transparent || this.patchedMaterials.has(material)) continue;
        this.patchedMaterials.add(material);
        const previous = material.onBeforeCompile;
        const previousKey = material.customProgramCacheKey();
        material.onBeforeCompile = (shader, renderer) => {
          previous.call(material, shader, renderer);
          shader.uniforms.rigSnow = this.snowUniform;
          shader.uniforms.rigWet = this.wetUniform;
          shader.vertexShader = `varying vec3 rigWeatherPosition;\n${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>
            vec4 rigWeatherWorld = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              rigWeatherWorld = instanceMatrix * rigWeatherWorld;
            #endif
            rigWeatherPosition = (modelMatrix * rigWeatherWorld).xyz;`);
          shader.fragmentShader = `uniform float rigSnow; uniform float rigWet; varying vec3 rigWeatherPosition;\n${shader.fragmentShader}`.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
            vec3 rigWeatherNormal = inverseTransformDirection(normal, viewMatrix);
            float rigCoverage = smoothstep(0.45, 0.75, rigWeatherNormal.y);
            float rigSnowAmount = rigSnow * rigCoverage;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), rigSnowAmount * 0.85);
            roughnessFactor = mix(roughnessFactor, 0.92, rigSnowAmount);
            metalnessFactor = mix(metalnessFactor, 0.0, rigSnowAmount);
            float rigWetAmount = rigWet * rigCoverage * (1.0 - rigSnowAmount);
            diffuseColor.rgb *= 1.0 - 0.25 * rigWetAmount;
            roughnessFactor = mix(roughnessFactor, 0.2, rigWetAmount * 0.8);`);
        };
        material.customProgramCacheKey = () => `${previousKey}|rig-weather-v1`;
        material.needsUpdate = true;
      }
    });
  }

  /** Лес: тот же генератор, что в эталоне (LCG seed 7), вырез под площадку одной буровой и городок. */
  private buildForest(): THREE.Group {
    const g = new THREE.Group();
    const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(2.4, 9, 7), new THREE.MeshStandardMaterial({ color: 3099187, roughness: 1 }), 360);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.3, 2, 6), new THREE.MeshStandardMaterial({ color: 4930090, roughness: 1 }), 360);
    const o = new THREE.Object3D();
    const rnd = lcg(7);
    let n = 0;
    while (n < 360) {
      const h = (rnd() - 0.5) * 560;
      const u = 35 + (rnd() - 0.5) * 600;
      if ((Math.abs(h) < 73 && u > -58 && u < 53) || (h > -142 && h < -60 && u > -2 && u < 76) || Math.hypot(h, (u + 2.5) * 1.27) < 83) continue;
      const d = 0.7 + rnd() * 0.9;
      o.position.set(h, -0.6 + 6.1 * d, u);
      o.scale.setScalar(d);
      o.rotation.y = rnd() * 6;
      o.updateMatrix();
      crown.setMatrixAt(n, o.matrix);
      o.position.y = -0.6 + 1 * d;
      o.updateMatrix();
      trunk.setMatrixAt(n, o.matrix);
      n++;
    }
    crown.castShadow = true;
    g.add(crown, trunk);
    return g;
  }

  apply(snap: ClassicRigSnapshot, dt: number): void {
    const w = WEATHER_PRESETS[snap.weather.preset];
    const winter = snap.weather.season === "winter";
    const atmosphere = this.atmosphere;
    if (!this.atmosphereInitialized) {
      Object.assign(atmosphere, { cloud: w.cloud, fog: w.fog, rain: w.rain, snow: w.snow, winter: winter ? 1 : 0, wet: w.rain > 0.05 ? 1 : 0 });
      this.atmosphereInitialized = true;
    }
    const blend = (value: number, target: number, rate: number) => value + (target - value) * (1 - Math.exp(-Math.max(0, dt) * rate));
    atmosphere.cloud = blend(atmosphere.cloud, w.cloud, 0.7);
    atmosphere.fog = blend(atmosphere.fog, w.fog, 0.7);
    atmosphere.rain = blend(atmosphere.rain, w.rain, 0.7);
    atmosphere.snow = blend(atmosphere.snow, w.snow, 0.7);
    atmosphere.winter = blend(atmosphere.winter, winter ? 1 : 0, 0.45);
    atmosphere.wet = blend(atmosphere.wet, atmosphere.rain > 0.05 ? 1 : 0, atmosphere.rain > 0.05 ? 0.35 : 0.04);
    this.snowUniform.value = atmosphere.winter;
    this.wetUniform.value = atmosphere.wet * (1 - atmosphere.winter);
    const sun = sunPosition(this.opts.clock(), this.opts.lat, this.opts.lon);
    const day = daylight(sun);
    const el = (Math.max(sun.elevation, 3) * Math.PI) / 180;
    const az = (sun.azimuth * Math.PI) / 180;
    this.sun.position.set(-40 + Math.sin(az) * Math.cos(el) * 200, Math.sin(el) * 200, 20 - Math.cos(az) * Math.cos(el) * 200);
    this.sun.intensity = 2.4 * day * (1 - 0.6 * atmosphere.cloud);
    const night = 1 - day;
    const moonAz = az + Math.PI;
    this.moon.position.set(-40 + Math.sin(moonAz) * 200, 80, 20 - Math.cos(moonAz) * 200);
    this.moon.intensity = 0.16 * night * (1 - 0.55 * atmosphere.cloud);
    this.hemi.intensity = 0.25 + 0.75 * day;
    const skyDay = new THREE.Color(0x9ec4e8).lerp(new THREE.Color(0xc5d3df), atmosphere.winter);
    const sky = new THREE.Color(0x0b1424).lerp(skyDay, day).lerp(new THREE.Color(0xb6bec6), atmosphere.cloud * 0.6);
    this.scene.background = sky;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(sky);
    const haze = Math.max(atmosphere.fog, atmosphere.snow * 0.65, atmosphere.rain * 0.35);
    fog.far = 600 * Math.pow(1 - haze, 1.6) + 40 + 300;
    fog.near = 220 * Math.pow(1 - haze, 2) + 2;
    this.effectTime += Math.max(0, Math.min(dt, 0.1));
    this.flare.update(dt, this.effectTime, snap.rigOffsetX, snap.kick.flare, snap.weather.wind, snap.weather.windDirDeg, night);
    for (const windsock of this.windsocks) windsock.update(this.effectTime, snap.weather.wind, snap.weather.windDirDeg, snap.rigOffsetX);
    // прожекторы буровой ночью, едут вместе с буровой
    for (const l of this.floods) {
      l.intensity = 40 * (1 - day);
      l.position.x = (l.userData.x0 as number) + snap.rigOffsetX;
    }
    this.applyPrecipitation(atmosphere.rain, atmosphere.snow, snap.weather.wind, dt);
  }

  private applyPrecipitation(rain: number, snow: number, wind: number, dt: number) {
    if (!this.opts.precipitation) return;
    const amount = Math.max(rain, snow);
    if (!this.precip) {
      const n = 6000;
      const pos = new Float32Array(n * 3);
      const r = lcg(11);
      for (let i = 0; i < n; i++) pos.set([(r() - 0.5) * 200, r() * 60, (r() - 0.5) * 200], i * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.precip = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0.8 }));
      this.group.add(this.precip);
    }
    this.precip.visible = amount > 0.01;
    if (!this.precip.visible) return;
    const m = this.precip.material as THREE.PointsMaterial;
    m.size = snow > rain ? 0.35 : 0.12;
    m.opacity = 0.35 + 0.5 * amount;
    const fall = snow > rain ? 2.2 : 14;
    const p = this.precip.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - fall * dt;
      let x = p.getX(i) + wind * 0.4 * dt;
      if (y < 0) y += 60;
      if (x > 100) x -= 200;
      p.setXY(i, x, y);
    }
    p.needsUpdate = true;
  }
}
