/**
 * Персонажи: положение, курс, масштаб и поза суставов из snapshot (поза считается в симуляции).
 * Суставы — именованные узлы GLB (pelvis, hip_L, knee_L, …). Планшет крепится к wrist_L.
 */
import * as THREE from "three";
import type { ClassicRigSnapshot, ClassicRigWorkerId } from "../types";
import type { LoadedAssets } from "./AssetLoader";
import { poseToJoints } from "../workers/worker-poses";

type Figure = { root: THREE.Group; joints: Map<string, THREE.Object3D>; tablet: THREE.Object3D | null };

export class ClassicRigWorkerRenderer {
  readonly group = new THREE.Group();
  private figures = new Map<ClassicRigWorkerId, Figure>();

  constructor(assets: LoadedAssets) {
    this.group.name = "workers";
    for (const [id, c] of assets.characters) {
      const root = c.scene;
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true;
        o.userData.workerId = id;
      });
      let tablet: THREE.Object3D | null = null;
      const wrist = c.joints.get("wrist_L");
      if (assets.tablet && wrist) {
        tablet = assets.tablet.clone();
        tablet.position.set(-0.04, -0.12, 0.05);
        tablet.rotation.set(Math.PI / 2 - 0.35, 0, 0);
        tablet.visible = false;
        wrist.add(tablet);
      }
      this.group.add(root);
      this.figures.set(id as ClassicRigWorkerId, { root, joints: c.joints, tablet });
    }
  }

  apply(snap: ClassicRigSnapshot): void {
    for (const [id, f] of this.figures) {
      const w = snap.workers[id];
      if (!w) {
        f.root.visible = false;
        continue;
      }
      f.root.visible = true;
      f.root.position.set(w.position[0], w.position[1], w.position[2]);
      f.root.rotation.set(0, w.rotation, 0);
      f.root.scale.setScalar(w.scale);
      const j = poseToJoints(w.pose);
      for (const [name, t] of Object.entries(j)) {
        const node = f.joints.get(name);
        if (!node) continue;
        node.rotation.set(t.rotation[0], t.rotation[1], t.rotation[2]);
        if (t.position) node.position.set(t.position[0], t.position[1], t.position[2]);
      }
      if (f.tablet) f.tablet.visible = w.tabletVisible;
    }
  }
}
