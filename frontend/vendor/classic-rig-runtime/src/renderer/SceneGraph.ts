/** Граф сцены: корни буровой, городка, персонажей, подземной части. */
import * as THREE from "three";
import type { LoadedAssets } from "./AssetLoader";

export class ClassicRigSceneGraph {
  readonly scene = new THREE.Scene();
  /** Агрегаты буровой (координаты куста; переезд — смещение корней агрегатов на rigX) */
  readonly rigRoot = new THREE.Group();
  readonly campRoot = new THREE.Group();

  constructor() {
    this.rigRoot.name = "classic_rig";
    this.campRoot.name = "camp";
    this.scene.add(this.rigRoot, this.campRoot);
  }

  addCamp(assets: LoadedAssets): void {
    for (const [id, g] of assets.camp) {
      g.name = id;
      g.traverse((o) => { o.userData.campId = id; });
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.campRoot.add(g);
    }
  }
}
