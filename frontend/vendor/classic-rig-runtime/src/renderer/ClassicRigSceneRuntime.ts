/**
 * Three.js-renderer классической БУ: получает snapshot и только отображает его.
 * Не решает, можно ли включить насос, кто куда идёт, когда закончилась фаза и сколько баллов у студента.
 *
 * Использование (браузер):
 *   const renderer = new ClassicRigSceneRuntime({ canvas, basePath: "/app" });
 *   await renderer.load();
 *   runtime.attachRenderer(renderer);   // runtime.update(dt) вызовет renderer.apply(snapshot, dt)
 */
import * as THREE from "three";
import type { ClassicRigEquipmentId, ClassicRigSceneRenderer, ClassicRigSnapshot, ClassicRigWorkerId } from "../types";
import { ClassicRigAssetLoader, type AssetLoaderOptions, type BindingReport, type LoadedAssets } from "./AssetLoader";
import { ClassicRigSceneGraph } from "./SceneGraph";
import { ClassicRigCameraController, type CameraViewId } from "./CameraController";
import { ClassicRigEquipmentRenderer } from "./EquipmentRenderer";
import { ClassicRigWorkerRenderer } from "./WorkerRenderer";
import { ClassicRigWellRenderer } from "./WellRenderer";
import { ClassicRigEnvironmentRenderer, type EnvironmentOptions } from "./EnvironmentRenderer";

export type ClassicRigSceneRuntimeOptions = AssetLoaderOptions & {
  canvas: HTMLCanvasElement;
  environment?: EnvironmentOptions;
  pixelRatio?: number;
  /** показывать подземную часть (разрез) */
  underground?: boolean;
  antialias?: boolean;
};

export type PickResult = { kind: "equipment"; id: ClassicRigEquipmentId | string } | { kind: "worker"; id: ClassicRigWorkerId } | null;

export class ClassicRigSceneRuntime implements ClassicRigSceneRenderer {
  readonly graph = new ClassicRigSceneGraph();
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: ClassicRigCameraController;
  equipment: ClassicRigEquipmentRenderer | null = null;
  workers: ClassicRigWorkerRenderer | null = null;
  readonly well = new ClassicRigWellRenderer();
  readonly environment: ClassicRigEnvironmentRenderer;
  report: BindingReport | null = null;
  private assets: LoadedAssets | null = null;
  private lastSnapshot: ClassicRigSnapshot | null = null;
  private readonly raycaster = new THREE.Raycaster();

  constructor(private readonly opts: ClassicRigSceneRuntimeOptions) {
    const c = opts.canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: opts.antialias ?? true });
    this.renderer.setPixelRatio(opts.pixelRatio ?? Math.min(2, globalThis.devicePixelRatio ?? 1));
    this.renderer.setSize(c.clientWidth || c.width, c.clientHeight || c.height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new ClassicRigCameraController(c, (c.clientWidth || c.width) / (c.clientHeight || c.height || 1));
    this.environment = new ClassicRigEnvironmentRenderer(this.graph.scene, opts.environment);
    this.well.group.visible = opts.underground ?? true;
    this.graph.scene.add(this.well.group);
  }

  /** Загрузка всех GLB (буровая, городок, персонажи) и проверка привязок. */
  async load(): Promise<BindingReport> {
    const loader = new ClassicRigAssetLoader({ ...this.opts, skip: ["trajectory", "bha", ...(this.opts.skip ?? [])] });
    this.assets = await loader.loadAll();
    this.equipment = new ClassicRigEquipmentRenderer(this.assets, this.graph.rigRoot);
    this.graph.addCamp(this.assets);
    this.workers = new ClassicRigWorkerRenderer(this.assets);
    this.graph.scene.add(this.workers.group);
    this.report = this.assets.report;
    if (this.report.rejected.length) console.warn("[classic-rig] детали не прошли проверку и не анимируются:", this.report.rejected);
    return this.report;
  }

  /** ClassicRigSceneRenderer: применить снимок и отрисовать кадр. */
  apply(snapshot: ClassicRigSnapshot, deltaSeconds: number): void {
    this.lastSnapshot = snapshot;
    this.equipment?.apply(snapshot);
    this.workers?.apply(snapshot);
    this.well.apply(snapshot);
    this.environment.apply(snapshot, deltaSeconds);
    this.camera.update(deltaSeconds);
    this.renderer.render(this.graph.scene, this.camera.camera);
  }

  setView(id: CameraViewId): void {
    this.camera.setView(id, this.lastSnapshot?.rigOffsetX ?? 0);
    if (id === "underground") this.well.group.visible = true;
  }

  setUndergroundVisible(v: boolean): void {
    this.well.group.visible = v;
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.resize(width, height);
  }

  /** Что под курсором: агрегат (id из bindings) или персонаж. Координаты — в пикселях canvas. */
  pick(x: number, y: number): PickResult {
    const c = this.renderer.domElement;
    const ndc = new THREE.Vector2((x / c.clientWidth) * 2 - 1, -(y / c.clientHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera.camera);
    const hits = this.raycaster.intersectObjects([this.graph.rigRoot, this.workers?.group ?? new THREE.Group()], true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      if (h.object.userData.workerId) return { kind: "worker", id: h.object.userData.workerId };
      const asset = h.object.userData.assetId as string | undefined;
      if (asset) {
        const b = this.assets?.rig.get(asset)?.binding;
        return { kind: "equipment", id: (b?.equipmentId ?? asset) as ClassicRigEquipmentId };
      }
    }
    return null;
  }

  highlight(id: ClassicRigEquipmentId | null): void {
    this.equipment?.highlight(id);
  }

  dispose(): void {
    this.camera.dispose();
    this.graph.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
    this.renderer.dispose();
  }
}
