import * as THREE from "three";

type Highlightable = THREE.Mesh | THREE.Line;
type OriginalMaterial = THREE.Material | THREE.Material[];

/** A per-mesh temporary material avoids changing shared GLTF materials or their emissive state. */
export class ObjectHighlight {
  private originals = new Map<Highlightable, OriginalMaterial>();

  set(root: THREE.Object3D, color: number | null, intensity = 0.35): void {
    root.traverse((object) => {
      const mesh = object as Highlightable;
      if (!(mesh instanceof THREE.Mesh || mesh instanceof THREE.Line) || !mesh.material || mesh.userData.ownMaterial) return;
      const original = this.originals.get(mesh);
      if (!color) {
        if (original) {
          const highlighted = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mesh.material = original;
          this.originals.delete(mesh);
          for (const material of highlighted) material.dispose();
        }
        return;
      }
      if (!original) {
        this.originals.set(mesh, mesh.material);
        const clone = (material: THREE.Material) => {
          const result = material.clone();
          // Three.js Material.clone() does not copy custom shader hooks.
          result.onBeforeCompile = material.onBeforeCompile;
          result.customProgramCacheKey = material.customProgramCacheKey;
          return result;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const standard = material as THREE.MeshStandardMaterial;
        if (standard.emissive?.isColor) {
          standard.emissive.setHex(color);
          standard.emissiveIntensity = intensity;
        } else {
          const colored = material as THREE.MeshBasicMaterial;
          const base = this.originals.get(mesh);
          const index = materials.indexOf(material);
          const source = (Array.isArray(base) ? base[index] : base) as THREE.MeshBasicMaterial | undefined;
          if (colored.color?.isColor && source?.color?.isColor) colored.color.copy(source.color).lerp(new THREE.Color(color), 0.6);
        }
      }
    });
  }

  clear(): void {
    for (const [mesh, original] of this.originals) {
      const highlighted = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = original;
      for (const material of highlighted) material.dispose();
    }
    this.originals.clear();
  }
}