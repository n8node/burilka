/**
 * Загрузка GLB классической БУ, городка и персонажей через GLTFLoader (three 0.180).
 * Подвижные детали находятся по индексу узла glTF (parser.associations) и проверяются по сигнатуре.
 * Если сигнатура не совпала, деталь НЕ анимируется (агрегат целиком тоже не двигается), а в отчёт пишется причина.
 * SSR-safe: ничего не делает при импорте; загрузка — только в браузере.
 */
import type * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import {
  CAMP_ASSETS,
  CHARACTER_ASSETS,
  CLASSIC_RIG_ASSETS,
  TABLET_PROP,
  type ClassicRigAssetBinding,
  type MovablePartBinding,
} from "../equipment/equipment-bindings";

export type LoadedRigAsset = {
  binding: ClassicRigAssetBinding;
  scene: THREE.Group;
  /** корневой узел агрегата (несёт трансформацию группы эталона) */
  root: THREE.Object3D;
  /** проверенные подвижные детали по nodeName */
  parts: Map<string, THREE.Object3D>;
  /** детали, которые не прошли проверку и анимироваться не будут */
  rejected: { nodeName: string; reason: string }[];
};

export type LoadedCharacter = { workerId: string; scene: THREE.Group; joints: Map<string, THREE.Object3D> };

export type BindingReport = {
  verified: number;
  rejected: { assetId: string; nodeName: string; reason: string }[];
  missingAssets: string[];
};

export type LoadedAssets = {
  rig: Map<string, LoadedRigAsset>;
  camp: Map<string, THREE.Group>;
  characters: Map<string, LoadedCharacter>;
  tablet: THREE.Group | null;
  report: BindingReport;
};

export type AssetLoaderOptions = {
  /** basePath приложения Next.js (по умолчанию "/app") */
  basePath?: string;
  /** переопределить корень ассетов, например CDN; по умолчанию `${basePath}/` */
  assetRoot?: string;
  /** загружать городок */
  camp?: boolean;
  /** загружать персонажей */
  characters?: boolean;
  /** не загружать перечисленные ассеты (например, "trajectory", если траектории рисуются процедурно) */
  skip?: string[];
  onProgress?: (loaded: number, total: number, file: string) => void;
};

const TOL = 2e-3;
const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) <= TOL);

async function loadWithConcurrency<T>(items: T[], worker: (item: T) => Promise<void>, concurrency = 4): Promise<void> {
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

/** Проверка сигнатуры детали (число вершин + габарит геометрии; для групп — состав дочерних мешей). */
export function verifySignature(obj: THREE.Object3D, part: MovablePartBinding): string | null {
  const sig = part.signature;
  if ("vertices" in sig) {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return "узел не является мешем";
    const pos = mesh.geometry.getAttribute("position");
    if (!pos || pos.count !== sig.vertices) return `число вершин ${pos?.count} ≠ ${sig.vertices}`;
    if (part.part === "kelly_hose") return null; // геометрия рукава перестраивается, габарит не проверяется
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox!;
    if (!near(b.min.toArray(), sig.min) || !near(b.max.toArray(), sig.max)) return "габарит геометрии не совпал";
    return null;
  }
  const meshes = obj.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];
  if (meshes.length !== sig.childMeshes) return `дочерних мешей ${meshes.length} ≠ ${sig.childMeshes}`;
  const got = meshes.map((m) => m.geometry.getAttribute("position").count).sort((a, b) => a - b);
  const want = [...sig.childVertices].sort((a, b) => a - b);
  return got.every((v, i) => v === want[i]) ? null : "состав дочерних мешей не совпал";
}

export class ClassicRigAssetLoader {
  private readonly loader: GLTFLoader;
  private readonly root: string;

  constructor(private readonly opts: AssetLoaderOptions = {}) {
    this.loader = new GLTFLoader();
    const base = (opts.basePath ?? "/app").replace(/\/$/, "");
    this.root = (opts.assetRoot ?? `${base}/`).replace(/\/?$/, "/");
  }

  url(path: string): string {
    return this.root + path;
  }

  async loadAll(): Promise<LoadedAssets> {
    const skip = new Set(this.opts.skip ?? []);
    const rigList = CLASSIC_RIG_ASSETS.filter((a) => !skip.has(a.assetId));
    const campList = this.opts.camp === false ? [] : CAMP_ASSETS;
    const charList = this.opts.characters === false ? [] : CHARACTER_ASSETS;
    const total = rigList.length + campList.length + charList.length + (charList.length ? 1 : 0);
    let done = 0;
    const tick = (f: string) => this.opts.onProgress?.(++done, total, f);
    const report: BindingReport = { verified: 0, rejected: [], missingAssets: [] };

    const rig = new Map<string, LoadedRigAsset>();
    await loadWithConcurrency(rigList, async (b) => {
        try {
          const gltf = await this.loader.loadAsync(this.url(b.path));
          rig.set(b.assetId, this.bindRigAsset(b, gltf, report));
        } catch (e) {
          report.missingAssets.push(`${b.path}: ${(e as Error).message}`);
        }
        tick(b.file);
      });
    const camp = new Map<string, THREE.Group>();
    await loadWithConcurrency(campList, async (c) => {
        try {
          camp.set(c.assetId, (await this.loader.loadAsync(this.url(c.path))).scene);
        } catch (e) {
          report.missingAssets.push(`${c.path}: ${(e as Error).message}`);
        }
        tick(c.file);
      });
    const characters = new Map<string, LoadedCharacter>();
    await loadWithConcurrency(charList, async (c) => {
        try {
          const scene = (await this.loader.loadAsync(this.url(c.path))).scene;
          const joints = new Map<string, THREE.Object3D>();
          scene.traverse((o) => {
            if (o.name && o.name in c.joints) joints.set(o.name, o);
          });
          characters.set(c.workerId, { workerId: c.workerId, scene, joints });
        } catch (e) {
          report.missingAssets.push(`${c.path}: ${(e as Error).message}`);
        }
        tick(c.file);
      });
    let tablet: THREE.Group | null = null;
    if (charList.length) {
      try {
        tablet = (await this.loader.loadAsync(this.url(TABLET_PROP.path))).scene;
      } catch {
        report.missingAssets.push(TABLET_PROP.path);
      }
      tick(TABLET_PROP.file);
    }
    return { rig, camp, characters, tablet, report };
  }

  private bindRigAsset(b: ClassicRigAssetBinding, gltf: GLTF, report: BindingReport): LoadedRigAsset {
    const byIndex = new Map<number, THREE.Object3D>();
    gltf.scene.traverse((o) => {
      const assoc = gltf.parser.associations.get(o as THREE.Mesh);
      if (assoc && assoc.nodes !== undefined && !byIndex.has(assoc.nodes)) byIndex.set(assoc.nodes, o);
    });
    const root = byIndex.get(b.rootNode) ?? gltf.scene.children[0] ?? gltf.scene;
    const parts = new Map<string, THREE.Object3D>();
    const rejected: LoadedRigAsset["rejected"] = [];
    for (const p of b.movableParts) {
      const obj = p.part === "topdrive_root" || p.part === "travel_root" ? root : byIndex.get(p.nodeIndex);
      const reason = !obj ? `узел ${p.nodeIndex} не найден` : p.part.endsWith("_root") ? null : verifySignature(obj, p);
      if (reason || !obj) {
        rejected.push({ nodeName: p.nodeName, reason: reason ?? "нет узла" });
        report.rejected.push({ assetId: b.assetId, nodeName: p.nodeName, reason: reason ?? "нет узла" });
        continue;
      }
      obj.name = p.nodeName;
      obj.userData.binding = p;
      parts.set(p.nodeName, obj);
      report.verified++;
    }
    gltf.scene.traverse((o) => {
      o.userData.assetId = b.assetId;
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return { binding: b, scene: gltf.scene, root, parts, rejected };
  }
}
