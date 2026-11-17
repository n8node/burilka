import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { ObjectHighlight } from "../../src/renderer/Highlight";
import { ClassicRigEquipmentRenderer } from "../../src/renderer/EquipmentRenderer";
import { ClassicRigWorkerRenderer } from "../../src/renderer/WorkerRenderer";
import { ClassicRigSceneRuntime } from "../../src/renderer/ClassicRigSceneRuntime";
import { ClassicRigSceneGraph } from "../../src/renderer/SceneGraph";
import { ClassicRigWellRenderer } from "../../src/renderer/WellRenderer";
import { ClassicRigSimulation } from "../../src/simulation/ClassicRigSimulation";
import type { LoadedAssets, LoadedRigAsset } from "../../src/renderer/AssetLoader";

const assets = (): LoadedAssets => ({ rig: new Map(), camp: new Map(), characters: new Map(), tablet: null, report: { verified: 0, rejected: [], missingAssets: [] } });
const rigAsset = (id: string, equipmentId: string | null, scene: THREE.Group): LoadedRigAsset => ({ binding: { assetId: id, equipmentId } as LoadedRigAsset["binding"], scene, root: scene, parts: new Map(), rejected: [] });

describe("scene hover and selection", () => {
  it("clones shared material only while highlighted and restores its original emissive state", () => {
    const original = new THREE.MeshStandardMaterial({ emissive: 0x880000, emissiveIntensity: 0.7 });
    const root = new THREE.Group();
    const first = new THREE.Mesh(new THREE.BoxGeometry(), original);
    const second = new THREE.Mesh(new THREE.BoxGeometry(), original);
    root.add(first);
    const highlighter = new ObjectHighlight();
    highlighter.set(root, 0x9ed0ff);
    expect(first.material).not.toBe(original);
    expect(second.material).toBe(original);
    expect(original.emissive.getHex()).toBe(0x880000);
    expect((first.material as THREE.MeshStandardMaterial).emissive.getHex()).toBe(0x9ed0ff);
    highlighter.set(root, null);
    expect(first.material).toBe(original);
    expect(original.emissiveIntensity).toBe(0.7);
  });

  it("restores multi-material meshes and leaves animated lamp materials alone", () => {
    const first = new THREE.MeshStandardMaterial({ emissive: 0x110000, emissiveIntensity: 0.3 });
    const second = new THREE.MeshStandardMaterial({ emissive: 0x001100, emissiveIntensity: 0.4 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [first, second]);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    lamp.userData.ownMaterial = true;
    const lampMaterial = lamp.material;
    const root = new THREE.Group();
    root.add(mesh, lamp);
    const highlighter = new ObjectHighlight();
    highlighter.set(root, 0x9ed0ff);
    expect(mesh.material).not.toEqual([first, second]);
    expect(lamp.material).toBe(lampMaterial);
    highlighter.clear();
    expect(mesh.material).toEqual([first, second]);
    expect(first.emissiveIntensity).toBe(0.3);
    expect(second.emissiveIntensity).toBe(0.4);
  });

  it("highlights assets with null or aliased equipment ids and maintains selection", () => {
    const data = assets();
    const root = new THREE.Group();
    const scene = new THREE.Group();
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    scene.add(mesh);
    data.rig.set("substructure", rigAsset("substructure", null, scene));
    const renderer = new ClassicRigEquipmentRenderer(data, root);
    renderer.hover("substructure");
    expect((mesh.material as THREE.MeshStandardMaterial).emissive.getHex()).toBe(0x9ed0ff);
    renderer.highlight("substructure");
    renderer.hover(null);
    expect((mesh.material as THREE.MeshStandardMaterial).emissive.getHex()).toBe(0x2f86ff);
    renderer.highlight(null);
    expect(mesh.material).toBe(material);
    renderer.dispose();
  });

  it("highlights workers and camp without changing shared originals", () => {
    const data = assets();
    const scene = new THREE.Group();
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    scene.add(mesh);
    data.characters.set("driller_A", { workerId: "driller_A", scene, joints: new Map() });
    const workers = new ClassicRigWorkerRenderer(data);
    workers.hover("driller_A");
    expect((mesh.material as THREE.MeshStandardMaterial).emissive.getHex()).toBe(0x9ed0ff);
    workers.hover(null);
    expect(mesh.material).toBe(material);
    workers.dispose();

    const graph = new ClassicRigSceneGraph();
    const camp = new THREE.Group();
    camp.add(mesh);
    data.camp.set("camp_living", camp);
    graph.addCamp(data);
    const fake = Object.create(ClassicRigSceneRuntime.prototype) as ClassicRigSceneRuntime;
    Object.assign(fake, { graph, campHighlighter: new ObjectHighlight(), wellHighlighter: new ObjectHighlight(), well: { group: new THREE.Group() }, selectedCamp: null, hoveredCamp: null, equipment: null, workers: null });
    fake.hover({ kind: "camp", id: "camp_living" });
    expect((mesh.material as THREE.MeshStandardMaterial).emissive.getHex()).toBe(0x9ed0ff);
    fake.hover(null);
    expect(mesh.material).toBe(material);
  });

  it("highlights line materials and restores their original color", () => {
    const material = new THREE.LineBasicMaterial({ color: 0x112233 });
    const line = new THREE.Line(new THREE.BufferGeometry(), material);
    const highlighter = new ObjectHighlight();
    highlighter.set(line, 0x9ed0ff);
    expect((line.material as THREE.LineBasicMaterial).color.getHex()).not.toBe(0x112233);
    highlighter.set(line, null);
    expect(line.material).toBe(material);
    expect(material.color.getHex()).toBe(0x112233);
  });

  it("marks procedural BHA and trajectory objects with card ids", () => {
    const renderer = new ClassicRigWellRenderer();
    const simulation = new ClassicRigSimulation();
    renderer.apply(simulation.getSnapshot());
    expect(renderer.group.children.some((child) => child.userData.assetId === "bha")).toBe(true);
    expect(renderer.group.children.some((child) => child.userData.assetId === "trajectory")).toBe(true);
  });

  it("skips invisible parents and objects rejected by the card filter", () => {
    const graph = new ClassicRigSceneGraph();
    const hidden = new THREE.Group();
    hidden.visible = false;
    const invisibleMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    invisibleMesh.userData.assetId = "hidden";
    hidden.add(invisibleMesh);
    const unsupported = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    unsupported.userData.assetId = "unsupported";
    const supported = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    supported.userData.assetId = "substructure";
    graph.rigRoot.add(hidden, unsupported, supported);
    const fake = Object.create(ClassicRigSceneRuntime.prototype) as ClassicRigSceneRuntime;
    Object.assign(fake, { graph, well: { group: new THREE.Group() }, workers: null, assets: assets(), renderer: { domElement: { clientWidth: 500, clientHeight: 500 } }, camera: { camera: new THREE.PerspectiveCamera() }, raycaster: { setFromCamera: vi.fn(), intersectObjects: () => [{ object: invisibleMesh }, { object: unsupported }, { object: supported }] } });
    expect(fake.pick(100, 100, (target) => target.id === "substructure")).toEqual({ kind: "equipment", id: "substructure" });
  });
});