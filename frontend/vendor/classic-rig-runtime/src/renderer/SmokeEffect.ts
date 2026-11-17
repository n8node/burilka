import * as THREE from "three";
import { lcg } from "../util/math";

const vertex = `
  attribute float particleSize;
  attribute float particleAlpha;
  attribute float particleSeed;
  uniform float projectionScale;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vAlpha = particleAlpha;
    vSeed = particleSeed;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = particleSize * projectionScale / max(1.0, -viewPosition.z);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const fragment = `
  uniform vec3 tint;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec2 point = gl_PointCoord - vec2(0.5);
    float radius = length(point);
    float angle = atan(point.y, point.x);
    float edge = 0.5 - 0.06 * sin(angle * 5.0 + vSeed * 20.0) - 0.04 * sin(angle * 11.0 + vSeed * 7.0);
    float alpha = (1.0 - smoothstep(edge * 0.2, edge, radius)) * vAlpha;
    if (alpha < 0.005) discard;
    gl_FragColor = vec4(tint, alpha);
  }
`;

type SmokeConfig = {
  name: string;
  position: [number, number, number];
  rigIndex: number;
  rate: number;
  life: number;
  size: [number, number];
  alpha: number;
  speed: number;
  spread: number;
  pumpDriven?: boolean;
  coldDriven?: boolean;
};

/** Lightweight shared point-cloud renderer for reference-style rig exhaust and boiler steam. */
class SmokeEmitter {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private readonly ages: Float32Array;
  private readonly lives: Float32Array;
  private readonly startSizes: Float32Array;
  private readonly endSizes: Float32Array;
  private readonly velocities: Float32Array;
  private readonly seeds: Float32Array;
  private readonly random: () => number;
  private cursor = 0;
  private pending = 0;

  constructor(readonly config: SmokeConfig, count: number, color: number, seed: number) {
    this.positions = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.ages = new Float32Array(count).fill(Number.POSITIVE_INFINITY);
    this.lives = new Float32Array(count).fill(1);
    this.startSizes = new Float32Array(count);
    this.endSizes = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);
    this.seeds = new Float32Array(count);
    this.random = lcg(seed);
    for (let i = 0; i < count; i++) this.seeds[i] = this.random();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("particleSize", new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("particleAlpha", new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("particleSeed", new THREE.BufferAttribute(this.seeds, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { tint: { value: new THREE.Color(color) }, projectionScale: { value: 600 } },
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.name = config.name;
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
  }

  setProjectionScale(scale: number): void {
    (this.points.material as THREE.ShaderMaterial).uniforms.projectionScale.value = scale;
  }

  update(dt: number, rateMultiplier: number, windX: number, windZ: number): void {
    const elapsed = Math.max(0, dt);
    const spawnElapsed = Math.min(elapsed, 0.1);
    this.pending += spawnElapsed * this.config.rate * rateMultiplier;
    const spawn = Math.min(this.ages.length, Math.floor(this.pending));
    this.pending -= spawn;

    for (let n = 0; n < spawn; n++) {
      const i = this.cursor++ % this.ages.length;
      const p = i * 3;
      const spread = this.config.spread;
      this.positions[p] = (this.random() - 0.5) * spread;
      this.positions[p + 1] = 0;
      this.positions[p + 2] = (this.random() - 0.5) * spread;
      this.velocities[p] = (this.random() - 0.5) * spread * 0.5;
      this.velocities[p + 1] = this.config.speed * (0.75 + this.random() * 0.5);
      this.velocities[p + 2] = (this.random() - 0.5) * spread * 0.5;
      const sizeJitter = 0.8 + this.random() * 0.4;
      this.startSizes[i] = this.config.size[0] * sizeJitter;
      this.endSizes[i] = this.config.size[1] * sizeJitter;
      this.lives[i] = this.config.life * (0.8 + this.random() * 0.4);
      this.ages[i] = 0;
    }

    for (let i = 0; i < this.ages.length; i++) {
      if (this.ages[i] >= this.lives[i]) {
        this.alphas[i] = 0;
        continue;
      }
      const p = i * 3;
      this.ages[i] += elapsed;
      const progress = Math.min(1, this.ages[i] / this.lives[i]);
      const drift = 0.35 * (0.4 + progress);
      this.velocities[p] += (windX * drift - this.velocities[p] * 0.6) * elapsed;
      this.velocities[p + 2] += (windZ * drift - this.velocities[p + 2] * 0.6) * elapsed;
      this.velocities[p + 1] *= Math.max(0, 1 - 0.35 * elapsed);
      this.positions[p] += this.velocities[p] * elapsed;
      this.positions[p + 1] += this.velocities[p + 1] * elapsed;
      this.positions[p + 2] += this.velocities[p + 2] * elapsed;
      this.sizes[i] = this.startSizes[i] + (this.endSizes[i] - this.startSizes[i]) * Math.sqrt(progress);
      const fade = Math.min(1, progress * 6) * (1 - progress) ** 2;
      this.alphas[i] = this.config.alpha * (0.2 + 0.8 * fade);
    }

    for (const name of ["position", "particleSize", "particleAlpha"]) {
      this.points.geometry.getAttribute(name).needsUpdate = true;
    }
  }
}

/** Reference smoke emitters positioned only at the visible flue outlets. */
export class SmokeEffect {
  readonly group = new THREE.Group();
  private readonly emitters: SmokeEmitter[] = [];

  constructor() {
    this.group.name = "rig-smoke";
    const exhaustX = [-29, -33, -37];
    for (let rig = 0; rig < 2; rig++) {
      const offset = rig === 0 ? 0 : 85;
      exhaustX.forEach((x, index) => this.emitters.push(new SmokeEmitter({
        name: `pump-exhaust-${rig + 1}-${index + 1}`,
        position: [x, 5.25, -18.5 + offset],
        rigIndex: rig,
        rate: 4.5,
        life: 5.5,
        size: [0.55, 3.6],
        alpha: 0.38,
        speed: 2.4,
        spread: 0.25,
        pumpDriven: true,
      }, 64, 0x4f5257, 310 + rig * 10 + index)));
      this.emitters.push(new SmokeEmitter({
        name: `boiler-steam-${rig + 1}`,
        position: [35.5, 11.8, -23 + offset],
        rigIndex: rig,
        rate: 1.2,
        life: 6.5,
        size: [1, 6.5],
        alpha: 0.55,
        speed: 1.9,
        spread: 0.4,
        coldDriven: true,
      }, 80, 0xd9d9d5, 350 + rig));
    }

    for (const emitter of this.emitters) {
      emitter.points.position.set(...emitter.config.position);
      this.group.add(emitter.points);
    }
  }

  setProjection(height: number, fov: number, pixelRatio = 1): void {
    const scale = Math.max(1, height) * Math.max(1, pixelRatio) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    for (const emitter of this.emitters) emitter.setProjectionScale(scale);
  }

  update(dt: number, _time: number, rigX: number, pump: number, winter: boolean, wind: number, windDirDeg: number): void {
    const angle = THREE.MathUtils.degToRad(windDirDeg);
    const windX = -Math.sin(angle) * wind;
    const windZ = Math.cos(angle) * wind;
    for (const emitter of this.emitters) {
      emitter.points.position.x = emitter.config.position[0] + (emitter.config.rigIndex === 0 ? rigX : 0);
      let rateMultiplier = 1;
      if (emitter.config.pumpDriven && emitter.config.rigIndex === 0) rateMultiplier = 0.55 + 0.45 * Math.max(0, Math.min(1, pump));
      if (emitter.config.coldDriven && winter) {
        rateMultiplier = 1 + 9 / emitter.config.rate;
      }
      emitter.update(dt, rateMultiplier, windX, windZ);
    }
  }
}