/**
 * Отображение снимков агрегатов на детали GLB. Никакой логики: только применение значений из snapshot.
 * Каждый агрегат двигается своими деталями из asset-bindings; если деталь не прошла проверку — она не трогается.
 */
import * as THREE from "three";
import type { ClassicRigSnapshot, EquipmentSnapshot } from "../types";
import type { LoadedAssets, LoadedRigAsset } from "./AssetLoader";
import { STATIONARY_ASSETS } from "../equipment/equipment-registry";
import { FLOOR_Y, STAND_LENGTH } from "../reference/constants";
import { ObjectHighlight } from "./Highlight";

const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const GREEN = 0x47c98a;
const ORANGE = 0xff7a1a;
const RED = 0xff3b30;

type Num = number;
const num = (e: EquipmentSnapshot | undefined, k: string, d = 0): Num => (typeof e?.kinematics?.[k] === "number" ? (e!.kinematics![k] as number) : d);
const arr = (e: EquipmentSnapshot | undefined, k: string): number[] | null => (Array.isArray(e?.kinematics?.[k]) ? (e!.kinematics![k] as number[]) : null);

function setLamp(obj: THREE.Object3D | undefined, color: number, intensity?: number) {
  const m = (obj as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined;
  if (!m || !("emissive" in m)) return;
  if (!obj!.userData.ownMaterial) {
    (obj as THREE.Mesh).material = m.clone();
    obj!.userData.ownMaterial = true;
  }
  const mm = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
  mm.color.setHex(color);
  mm.emissive.setHex(color);
  if (intensity != null) mm.emissiveIntensity = intensity;
}

export class ClassicRigEquipmentRenderer {
  private rig: Map<string, LoadedRigAsset>;
  private hose: THREE.Mesh | null = null;
  private wellheadClones = new Map<number, THREE.Group>();
  private wellheadTemplate: THREE.Object3D[] = [];
  private selected: string | null = null;
  private actors = new Set<string>();
  private hovered: string | null = null;
  private readonly highlighter = new ObjectHighlight();

  constructor(assets: LoadedAssets, rigRoot: THREE.Object3D) {
    this.rig = assets.rig;
    for (const a of this.rig.values()) rigRoot.add(a.scene);
    const cl = this.rig.get("cluster");
    if (cl) this.wellheadTemplate = [...cl.parts.entries()].filter(([n]) => n.startsWith("cluster.wellhead_tree_template")).map(([, o]) => o);
    const hp = this.part("standpipe", "standpipe.kelly_hose");
    if (hp && (hp as THREE.Mesh).isMesh) this.hose = hp as THREE.Mesh;
  }

  private part(asset: string, name: string): THREE.Object3D | undefined {
    return this.rig.get(asset)?.parts.get(name);
  }

  private parts(asset: string, prefix: string): THREE.Object3D[] {
    const a = this.rig.get(asset);
    if (!a) return [];
    return [...a.parts.entries()]
      .filter(([n]) => n === prefix || n.startsWith(prefix + "_"))
      .sort((x, y) => (x[1].userData.binding.index as number) - (y[1].userData.binding.index as number))
      .map(([, o]) => o);
  }

  /** Применить снимок ко всем агрегатам. */
  apply(snap: ClassicRigSnapshot): void {
    const eq = snap.equipment;
    const rigX = snap.rigOffsetX;
    // переезд: всё, кроме неподвижных ассетов, смещается на rigX (эталон Af)
    for (const [id, a] of this.rig) {
      if (STATIONARY_ASSETS.has(id)) continue;
      a.root.position.x = rigX;
    }
    this.applyTopdrive(eq.topdrive, eq.travel, eq.racker);
    this.applyCrown(eq.crown);
    this.applyDrawworks(eq.drawworks);
    this.applyRotary(eq.rotary, eq.powerslips);
    this.applyRoughneck(eq.roughneck);
    this.applySetback(eq.setback, eq.racker);
    this.applyPumps(eq.mudpumps);
    this.applyCirculation(eq.shakers, eq.centrifuge, eq.standpipe);
    this.applyDrillstring(eq.drillstring);
    this.applyBop(eq.bop, snap);
    this.applyCementFleet(eq.cementFleet, rigX);
    this.applyWellheads(snap.well.completedWellheads);
  }

  private applyTopdrive(td?: EquipmentSnapshot, tr?: EquipmentSnapshot, rk?: EquipmentSnapshot) {
    const tdA = this.rig.get("topdrive");
    if (tdA && td) tdA.root.position.y = num(td, "y", tdA.root.position.y);
    const trA = this.rig.get("travel");
    if (trA && tr) trA.root.position.y = num(tr, "y", trA.root.position.y);
    const quill = this.part("topdrive", "topdrive.td_quill");
    if (quill && td) quill.rotation.y = num(td, "quillAngle");
    const links = this.part("topdrive", "topdrive.links");
    const lq = arr(rk, "linksQuat");
    if (links && lq) links.quaternion.set(lq[0], lq[1], lq[2], lq[3]);
    const elev = this.part("topdrive", "topdrive.elevator");
    const eqq = arr(rk, "elevatorQuat");
    if (elev && eqq) elev.quaternion.set(eqq[0], eqq[1], eqq[2], eqq[3]);
    setLamp(this.part("topdrive", "topdrive.elevator_lamp"), rk?.kinematics?.elevatorClosed ? GREEN : ORANGE);
  }

  private applyCrown(cr?: EquipmentSnapshot) {
    const len = num(cr, "ropeLength", NaN);
    if (!Number.isFinite(len)) return;
    const cy = num(cr, "ropeCenterY");
    for (const r of this.parts("crown", "crown.rope")) {
      r.scale.y = len;
      r.position.y = cy;
    }
  }

  private applyDrawworks(dw?: EquipmentSnapshot) {
    const drum = this.part("drawworks", "drawworks.drum");
    if (drum && dw) drum.rotation.set(num(dw, "drumAngle"), 0, Math.PI / 2); // gt(): базовый поворот z = π/2
  }

  private applyRotary(rt?: EquipmentSnapshot, sl?: EquipmentSnapshot) {
    for (const t of this.parts("rotary", "rotary.rotary_table")) t.rotation.y = num(rt, "tableAngle");
    const pos = arr(sl, "positions");
    const rot = arr(sl, "rotations");
    if (!pos || !rot) return;
    this.parts("rotary", "rotary.slips").forEach((s, i) => {
      s.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      s.rotation.set(rot[i * 3], rot[i * 3 + 1], rot[i * 3 + 2]);
    });
  }

  private applyRoughneck(rn?: EquipmentSnapshot) {
    const arm = this.part("roughneck", "roughneck.akb_arm");
    if (arm && rn) arm.rotation.y = num(rn, "armAngle");
    for (const r of this.parts("roughneck", "roughneck.akb_roller")) r.rotation.y = num(rn, "rollerAngle");
  }

  private applySetback(sb?: EquipmentSnapshot, rk?: EquipmentSnapshot) {
    const vis = sb?.kinematics?.standsVisible as boolean[] | undefined;
    const stands = this.parts("setback", "setback.stand");
    const moving = typeof rk?.kinematics?.standIndex === "number" ? (rk.kinematics.standIndex as number) : -1;
    stands.forEach((m, i) => {
      if (vis) m.visible = vis[i];
      if (i === moving) {
        const b = rk!.kinematics!.standBottom as number[];
        const t = rk!.kinematics!.standTop as number[];
        tmpA.set(b[0], b[1], b[2]);
        tmpB.set(t[0], t[1], t[2]);
        const dir = tmpB.clone().sub(tmpA);
        m.position.copy(tmpA).addScaledVector(dir, 0.5);
        m.quaternion.setFromUnitVectors(UP, dir.normalize());
        m.rotateY(num(rk, "standSpin"));
        m.visible = true;
      } else {
        const slot = m.userData.binding.slot as [number, number];
        m.position.set(slot[0], FLOOR_Y + STAND_LENGTH / 2, slot[1]);
        m.quaternion.identity();
      }
    });
  }

  private applyPumps(mp?: EquipmentSnapshot) {
    const off = arr(mp, "pistonOffsets");
    if (!off) return;
    this.parts("mudpumps", "mudpumps.piston").forEach((p, i) => {
      const z0 = p.userData.binding.z0 as number;
      p.position.z = z0 + off[i];
    });
  }

  private applyCirculation(sh?: EquipmentSnapshot, cf?: EquipmentSnapshot, sp?: EquipmentSnapshot) {
    for (const d of this.parts("shakers", "shakers.shaker_deck")) d.position.y = num(sh, "deckY", d.position.y);
    const bowl = this.part("centrifuge", "centrifuge.centrifuge_bowl");
    if (bowl && cf) bowl.rotation.set(num(cf, "bowlAngle"), 0, Math.PI / 2);
    const pts = arr(sp, "hosePoints");
    if (this.hose && pts) {
      const v = [0, 1, 2, 3].map((i) => new THREE.Vector3(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]));
      const old = this.hose.geometry;
      this.hose.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), 40, 0.09, 8, false);
      old.dispose();
    }
  }

  private applyDrillstring(ds?: EquipmentSnapshot) {
    const m = this.part("drillstring", "drillstring.drillstring") as THREE.Mesh | undefined;
    if (!m || !ds) return;
    const len = num(ds, "length", 0.01);
    m.visible = ds.visible;
    m.scale.y = len;
    m.position.y = len / 2;
    m.rotation.y = num(ds, "angle");
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat.map) mat.map.repeat.set(1, len / 1.5);
    mat.color.setHex(ds.kinematics?.casingColor ? 0xc9d0d6 : 0xffffff);
  }

  private applyBop(bop: EquipmentSnapshot | undefined, snap: ClassicRigSnapshot) {
    if (!bop) return;
    const travel = num(bop, "ramTravel");
    for (const r of this.parts("bop", "bop.bop_ram")) {
      const x0 = (r.userData.binding.referencePosition as number[])[0];
      r.position.x = x0 - Math.sign(x0) * travel;
    }
    const ann = this.part("bop", "bop.bop_annular");
    const o = num(bop, "annular");
    if (ann) ann.scale.set(1 - 0.06 * o, 1 - 0.12 * o, 1 - 0.06 * o);
    const lamps = this.parts("bop", "bop.bop_lamp");
    const ramRed = !!bop.kinematics?.lampRams;
    const annRed = !!bop.kinematics?.lampAnnular;
    lamps.forEach((l, i) => setLamp(l, (i < 2 ? ramRed : annRed) ? RED : GREEN));
    const alarm = this.part("doghouse", "doghouse.alarm_lamp");
    const blink = snap.kick.alarm && Math.sin(snap.elapsedTime * 9) > 0;
    setLamp(alarm, snap.kick.alarm ? 0xff2a2a : 0x550000, snap.kick.alarm ? 0.3 + 1.7 * (blink ? 1 : 0) : 0);
  }

  private applyCementFleet(cf: EquipmentSnapshot | undefined, rigX: number) {
    const a = this.rig.get("cementFleet");
    if (!a || !cf) return;
    a.root.visible = cf.visible;
    a.root.position.x = rigX;
    const v = arr(cf, "vehicles");
    this.parts("cementFleet", "cementFleet.fleet_vehicle").forEach((m, i) => {
      if (!v || v.length < (i + 1) * 4) {
        m.visible = false;
        return;
      }
      m.position.set(v[i * 4], 0, v[i * 4 + 1]);
      m.rotation.set(0, v[i * 4 + 2], 0);
      m.visible = v[i * 4 + 3] > 0.5;
    });
    const hoses = this.part("cementFleet", "cementFleet.fleet_hoses");
    if (hoses) hoses.visible = !!cf.kinematics?.hosesVisible;
    const head = this.part("cementFleet", "cementFleet.cement_head");
    if (head) head.visible = !!cf.kinematics?.headVisible;
  }

  /** Фонтанная арматура на законченных устьях: клон шаблона устья x = −10 (в GLB скрытые деревья не экспортированы). */
  private applyWellheads(xs: number[]) {
    const cl = this.rig.get("cluster");
    if (!cl || this.wellheadTemplate.length === 0) return;
    for (const x of xs) {
      if (this.wellheadClones.has(x)) continue;
      const g = new THREE.Group();
      for (const t of this.wellheadTemplate) g.add(t.clone());
      g.position.x = x - -10;
      cl.root.add(g);
      this.wellheadClones.set(x, g);
    }
    for (const [x, g] of this.wellheadClones) g.visible = xs.includes(x);
  }

  /** Подсветка агрегата (для UI: наведение/выбор). */
  highlight(id: string | null, color = 0x2f86ff): void {
    this.selected = id;
    this.repaint(color);
  }

  setActors(ids: string[]): void { this.actors = new Set(ids); this.repaint(); }
  hover(id: string | null): void { this.hovered = id; this.repaint(); }
  private repaint(selectedColor = 0x2f86ff): void {
    for (const [id, a] of this.rig) {
      const matches = (target: string | null) => !!target && (target === id || target === a.binding.equipmentId || (target === "powerslips" && id === "rotary"));
      const selected = matches(this.selected);
      const color = selected ? selectedColor : matches(this.hovered) ? 0x9ed0ff : this.actors.has(id) ? GREEN : null;
      this.highlighter.set(a.scene, color, selected ? 0.5 : 0.35);
    }
  }

  dispose(): void { this.highlighter.clear(); }
}
