/** Камера и виды (эталон yT, Nf, Of) поверх OrbitControls из three/addons. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type CameraViewId = "overview" | "rig" | "floor" | "derrick" | "underground" | "camp";

/** Виды эталона для классической БУ, координаты буровой (сдвигаются на rigX). */
export const CAMERA_VIEWS: Record<CameraViewId, { pos: [number, number, number]; target: [number, number, number]; followsRig: boolean }> = {
  overview: { pos: [105, 70, 110], target: [-20, 6, 15], followsRig: false },
  rig: { pos: [62, 42, 72], target: [0, 14, 0], followsRig: true },
  floor: { pos: [10, 15, 15], target: [0, 10, -1], followsRig: true },
  derrick: { pos: [16, 40, 14], target: [2, 32, 1], followsRig: true },
  underground: { pos: [30, -24, 178], target: [8, -82, 24], followsRig: false },
  camp: { pos: [-62, 30, 92], target: [-106, 2, 37], followsRig: false },
};

export class ClassicRigCameraController {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private tween: { t: number; dur: number; p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3 } | null = null;

  constructor(dom: HTMLElement, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.3, 3000);
    this.camera.position.set(...CAMERA_VIEWS.rig.pos);
    this.controls = new OrbitControls(this.camera, dom);
    this.controls.target.set(...CAMERA_VIEWS.rig.target);
    this.controls.enableDamping = true;
    this.controls.maxDistance = 600;
    this.controls.update();
  }

  /** Плавный перелёт (эталон Of): 1.2 с по умолчанию */
  flyTo(pos: [number, number, number], target: [number, number, number], dur = 1.2): void {
    this.tween = { t: 0, dur, p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target) };
  }

  setView(id: CameraViewId, rigX = 0): void {
    const v = CAMERA_VIEWS[id];
    const dx = v.followsRig ? rigX : 0;
    this.flyTo([v.pos[0] + dx, v.pos[1], v.pos[2]], [v.target[0] + dx, v.target[1], v.target[2]]);
    this.controls.maxPolarAngle = id === "underground" ? Math.PI * 0.98 : Math.PI * 0.485;
  }

  update(dt: number): void {
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = tw.t < 0.5 ? 2 * tw.t * tw.t : 1 - Math.pow(-2 * tw.t + 2, 2) / 2;
      this.camera.position.lerpVectors(tw.p0, tw.p1, k);
      this.controls.target.lerpVectors(tw.t0, tw.t1, k);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
