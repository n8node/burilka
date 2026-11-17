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
import { ObjectHighlight } from "./Highlight";

export type ClassicRigSceneRuntimeOptions = AssetLoaderOptions & {
  canvas: HTMLCanvasElement;
  environment?: EnvironmentOptions;
  pixelRatio?: number;
  /** показывать подземную часть (разрез) */
  underground?: boolean;
  antialias?: boolean;
};

export type PickResult = { kind: "equipment"; id: ClassicRigEquipmentId | string } | { kind: "worker"; id: ClassicRigWorkerId } | { kind: "camp"; id: string } | null;

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
  private readonly campHighlighter = new ObjectHighlight();
  private selectedCamp: string | null = null;
  private hoveredCamp: string | null = null;
  private readonly wellHighlighter = new ObjectHighlight();
  private selectedWell: string | null = null;
  private hoveredWell: string | null = null;

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
    this.environment.prepareSurfaces(this.graph.rigRoot);
    this.environment.prepareSurfaces(this.environment.group);
    const camp = this.graph.scene.getObjectByName("camp");
    if (camp) this.environment.prepareSurfaces(camp);
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

  setEnvironment(opts: Pick<EnvironmentOptions, "lat" | "lon" | "clock">): void { this.environment.setEnvironment(opts); }
  flyTo(pos: [number, number, number], target: [number, number, number], dur = 1.2, followsRig = false): void {
    const dx = followsRig ? (this.lastSnapshot?.rigOffsetX ?? 0) : 0;
    this.camera.flyTo([pos[0] + dx, pos[1], pos[2]], [target[0] + dx, target[1], target[2]], dur);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.resize(width, height);
  }

  /** Что под курсором: агрегат (id из bindings) или персонаж. Координаты — в пикселях canvas. */
  pick(x: number, y: number, accepts?: (target: NonNullable<PickResult>) => boolean): PickResult {
    const c = this.renderer.domElement;
    if (c.clientWidth <= 0 || c.clientHeight <= 0) return null;
    const ndc = new THREE.Vector2((x / c.clientWidth) * 2 - 1, -(y / c.clientHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera.camera);
    const hits = this.raycaster.intersectObjects([this.graph.rigRoot, this.workers?.group ?? new THREE.Group(), this.graph.campRoot, this.well.group], true);
    for (const h of hits) {
      let visible = true;
      for (let node: THREE.Object3D | null = h.object; node; node = node.parent) if (!node.visible) { visible = false; break; }
      if (!visible) continue;
      let target: NonNullable<PickResult> | null = null;
      if (h.object.userData.workerId) target = { kind: "worker", id: h.object.userData.workerId };
      else if (h.object.userData.campId) target = { kind: "camp", id: h.object.userData.campId };
      let asset: string | undefined;
      for (let node: THREE.Object3D | null = h.object; node && !asset; node = node.parent) asset = node.userData.assetId as string | undefined;
      if (!target && asset) {
        const b = this.assets?.rig.get(asset)?.binding;
        target = { kind: "equipment", id: (b?.equipmentId ?? asset) as ClassicRigEquipmentId };
      }
      if (target && (!accepts || accepts(target))) return target;
    }
    return null;
  }

  highlight(target: PickResult | ClassicRigEquipmentId | null): void {
    const t: PickResult = typeof target === "string" ? { kind: "equipment", id: target } : target;
    this.equipment?.highlight(t?.kind === "equipment" ? t.id : null);
    this.workers?.highlight(t?.kind === "worker" ? t.id : null);
    this.selectedCamp = t?.kind === "camp" ? t.id : null;
    this.selectedWell = t?.kind === "equipment" ? t.id : null;
    this.repaintCamp();
    this.repaintWell();
  }
  setActors(ids: string[]): void { this.equipment?.setActors(ids); this.workers?.setActors(ids); }
  hover(target: PickResult): void {
    this.equipment?.hover(target?.kind === "equipment" ? target.id as string : null);
    this.workers?.hover(target?.kind === "worker" ? target.id : null);
    this.hoveredCamp = target?.kind === "camp" ? target.id : null;
    this.hoveredWell = target?.kind === "equipment" ? target.id : null;
    this.repaintCamp();
    this.repaintWell();
  }
  private repaintWell(): void {
    for (const child of this.well.group.children) {
      const id = child.userData.assetId as string | undefined;
      if (!id) continue;
      const selected = id === this.selectedWell;
      this.wellHighlighter.set(child, selected ? 0x2f86ff : id === this.hoveredWell ? 0x9ed0ff : null, selected ? 0.5 : 0.35);
    }
  }
  private repaintCamp(): void {
    for (const child of this.graph.campRoot.children) {
      const id = child.userData.campId as string | undefined;
      const color = id && id === this.selectedCamp ? 0x2f86ff : id && id === this.hoveredCamp ? 0x9ed0ff : null;
      this.campHighlighter.set(child, color, id === this.selectedCamp ? 0.5 : 0.35);
    }
  }
  focus(target: PickResult): void {
    if (!target) return;
    const obj = target.kind === "equipment" ? (this.assets?.rig.get(target.id) ?? [...(this.assets?.rig.values() ?? [])].find((asset) => asset.binding.equipmentId === target.id))?.scene ?? this.well.group.children.find((child) => child.userData.assetId === target.id && child.visible) : target.kind === "worker" ? this.workers?.group.children.find((child) => child.userData.workerId === target.id) : this.graph.campRoot.children.find((child) => child.userData.campId === target.id);
    if (!obj) return;
    const box = new THREE.Box3().setFromObject(obj); const center = box.getCenter(new THREE.Vector3()); const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 2);
    this.camera.flyTo([center.x + radius * 2.5, center.y + radius, center.z + radius * 2.5], [center.x, center.y, center.z], 1.2);
  }

  dispose(): void {
    this.camera.dispose();
    this.equipment?.dispose();
    this.workers?.dispose();
    this.campHighlighter.clear();
    this.wellHighlighter.clear();
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
