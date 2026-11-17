import * as THREE from "three";
import { FLARE_POSITION } from "../reference/environment-reference";
import { lcg } from "../util/math";

const vertex = `
  attribute float particleSize;
  attribute float particleAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = particleAlpha;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = particleSize * (350.0 / max(1.0, -viewPosition.z));
    gl_Position = projectionMatrix * viewPosition;
  }
`;
const fragment = `
  uniform vec3 tint;
  varying float vAlpha;
  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    float alpha = (1.0 - smoothstep(0.12, 0.5, radius)) * vAlpha;
    if (alpha < 0.005) discard;
    gl_FragColor = vec4(tint, alpha);
  }
`;

class Plume {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly velocity: Float32Array;
  private readonly random = lcg(418);
  private cursor = 0;
  private pending = 0;

  constructor(private readonly count: number, color: number, additive: boolean) {
    this.positions = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.age = new Float32Array(count).fill(1);
    this.life = new Float32Array(count).fill(1);
    this.velocity = new Float32Array(count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("particleSize", new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("particleAlpha", new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: { tint: { value: new THREE.Color(color) } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  update(dt: number, rate: number, strength: number, windX: number, windZ: number, smoke: boolean): void {
    const elapsed = Math.max(0, Math.min(dt, 0.1));
    this.pending += elapsed * rate;
    const spawn = Math.min(this.count, Math.floor(this.pending));
    this.pending -= spawn;
    for (let n = 0; n < spawn; n++) {
      const i = this.cursor++ % this.count;
      const p = i * 3;
      const spread = smoke ? 0.3 : 0.18 + 0.6 * strength;
      this.positions[p] = (this.random() - 0.5) * spread;
      this.positions[p + 1] = smoke ? 1.4 : 0;
      this.positions[p + 2] = (this.random() - 0.5) * spread;
      this.velocity[p] = (this.random() - 0.5) * 0.5;
      this.velocity[p + 1] = (smoke ? 1.6 : 2.8 + 6 * strength) * (0.75 + this.random() * 0.5);
      this.velocity[p + 2] = (this.random() - 0.5) * 0.5;
      this.age[i] = 0;
      this.life[i] = (smoke ? 3 : 0.65 + 0.8 * strength) * (0.75 + this.random() * 0.5);
    }
    for (let i = 0; i < this.count; i++) {
      if (this.age[i] >= this.life[i]) { this.alphas[i] = 0; continue; }
      const p = i * 3;
      this.age[i] += elapsed;
      const progress = Math.min(1, this.age[i] / this.life[i]);
      const drift = 0.35 * (0.4 + progress);
      this.velocity[p] += (windX * drift - this.velocity[p] * 0.6) * elapsed;
      this.velocity[p + 2] += (windZ * drift - this.velocity[p + 2] * 0.6) * elapsed;
      this.velocity[p + 1] *= Math.max(0, 1 - 0.35 * elapsed);
      this.positions[p] += this.velocity[p] * elapsed;
      this.positions[p + 1] += this.velocity[p + 1] * elapsed;
      this.positions[p + 2] += this.velocity[p + 2] * elapsed;
      this.sizes[i] = smoke ? 0.4 + 1.8 * progress : 0.55 + 1.4 * strength + (1.5 + 6 * strength) * progress;
      this.alphas[i] = (smoke ? 0.12 : 0.9) * (1 - progress);
    }
    for (const name of ["position", "particleSize", "particleAlpha"]) this.points.geometry.getAttribute(name).needsUpdate = true;
  }
}

/** Always-on pilot flame, smoke and stronger flare during well control. */
export class FlareEffect {
  readonly group = new THREE.Group();
  readonly light = new THREE.PointLight(0xff8a3a, 1.2, 24, 1.6);
  private readonly flame = new Plume(512, 0xff8a1a, true);
  private readonly smoke = new Plume(128, 0x777879, false);

  constructor() {
    this.group.name = "rig-flare";
    this.group.position.set(FLARE_POSITION[0], FLARE_POSITION[1] - 0.75, FLARE_POSITION[2]);
    this.light.position.y = 0.8;
    this.flame.points.name = "flare-flame";
    this.smoke.points.name = "flare-smoke";
    this.group.add(this.flame.points, this.smoke.points, this.light);
  }

  update(dt: number, time: number, rigX: number, flare: number, wind: number, windDirDeg: number, night: number): void {
    const strength = Math.max(0, Math.min(1, flare));
    const angle = THREE.MathUtils.degToRad(windDirDeg);
    const windX = -Math.sin(angle) * wind;
    const windZ = Math.cos(angle) * wind;
    this.group.position.x = FLARE_POSITION[0] + rigX;
    this.light.intensity = Math.max(0, (1.1 + 0.35 * Math.sin(time * 13) + 0.25 * Math.sin(time * 29.7)) * (0.55 + 0.65 * night) * (1 + 3.5 * strength));
    this.flame.update(dt, 38 + 260 * strength, strength, windX, windZ, false);
    this.smoke.update(dt, 3, strength, windX, windZ, true);
  }
}