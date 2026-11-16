/**
 * Подземная часть: слои разреза, стволы скважин куста, текущий ствол, бурильная/обсадная колонна,
 * цемент, пробка, КНБК и пачка газа при ГНВП. Всё строится по snapshot (эталон ts/Rl/MS/DS).
 */
import * as THREE from "three";
import type { ClassicRigSnapshot } from "../types";
import { STRATA } from "../reference/constants";
import { WELL_GEOMETRY, trajectoryAt } from "../well/depth-model";
import { trajectoryPolyline, gasSlug } from "../well/trajectory-state";
import { BHA_COMPONENTS, bitAngle } from "../well/drillstring-state";

type Tube = { mesh: THREE.Mesh; key: string };

const mat = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3, ...opts });

export class ClassicRigWellRenderer {
  readonly group = new THREE.Group();
  private tubes = new Map<string, Tube>();
  private planLines = new Map<number, THREE.Line>();
  private doneTubes = new Map<number, THREE.Group>();
  private bit = new THREE.Group();
  private bha = new Map<string, THREE.Mesh>();
  private plug: THREE.Mesh;
  private gas: THREE.Mesh;
  private readonly materials = {
    hole: mat(1906450, { transparent: true, opacity: 0.6, roughness: 1, metalness: 0, depthWrite: false }),
    pipe: mat(4870231, { metalness: 0.6, roughness: 0.4 }),
    cas: mat(7305604, { metalness: 0.65, roughness: 0.35 }),
    cemA: mat(14736587, { transparent: true, opacity: 0.82, roughness: 0.95, metalness: 0 }),
    cemI: mat(13617584, { roughness: 0.95, metalness: 0 }),
    done: mat(4698234, { roughness: 0.5 }),
    gas: new THREE.MeshStandardMaterial({ color: 16747050, emissive: 16738832, emissiveIntensity: 1.1, transparent: true, opacity: 0.9, depthWrite: false }),
  };

  constructor() {
    this.group.name = "underground";
    for (const [top, bot, color] of STRATA) {
      const h = top - bot;
      const m = new THREE.Mesh(new THREE.BoxGeometry(165, h, 34), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
      m.position.set(27.5, (top + bot) / 2, -18.5);
      this.group.add(m);
    }
    this.plug = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), mat(13777450));
    this.plug.visible = false;
    this.group.add(this.plug);
    this.gas = new THREE.Mesh(new THREE.BufferGeometry(), this.materials.gas);
    this.gas.renderOrder = 20;
    this.group.add(this.gas);
    const bitHead = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.16, 0.45, 18), mat(9411237, { metalness: 0.7 }));
    bitHead.position.y = 0.22;
    this.bit.add(bitHead);
    this.group.add(this.bit);
    for (const c of BHA_COMPONENTS) {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), mat(c.color, { metalness: 0.5, roughness: 0.45 }));
      this.bha.set(c.id, m);
      this.group.add(m);
    }
  }

  private tube(name: keyof ClassicRigWellRenderer["materials"], wellIdx: number, a: number, b: number, r: number) {
    const key = `${wellIdx}:${a.toFixed(1)}:${b.toFixed(1)}`;
    let t = this.tubes.get(name);
    if (!t) {
      t = { mesh: new THREE.Mesh(new THREE.BufferGeometry(), this.materials[name]), key: "" };
      this.group.add(t.mesh);
      this.tubes.set(name, t);
    }
    if (b - a < 0.05) {
      t.mesh.visible = false;
      return;
    }
    t.mesh.visible = true;
    if (t.key === key) return;
    t.key = key;
    const pts = trajectoryPolyline(WELL_GEOMETRY[wellIdx], a, b).map((p) => new THREE.Vector3(...p));
    t.mesh.geometry.dispose();
    t.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(4, pts.length * 2), r, 10, false);
  }

  apply(snap: ClassicRigSnapshot): void {
    const w = snap.well;
    const wi = w.wellIndex;
    const sc = w.scene;
    w.wells.forEach((wd, i) => {
      const geo = WELL_GEOMETRY[i];
      if (wd.status === "done") {
        if (!this.doneTubes.has(i)) {
          const g = new THREE.Group();
          const pts = trajectoryPolyline(geo, 0, geo.TD).map((p) => new THREE.Vector3(...p));
          g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.3, 10), this.materials.done));
          const c = trajectoryPolyline(geo, geo.kop - 12, geo.TD).map((p) => new THREE.Vector3(...p));
          g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(c), c.length * 2, 0.46, 10), this.materials.cemA));
          this.group.add(g);
          this.doneTubes.set(i, g);
        }
        this.planLines.get(i)?.removeFromParent();
        this.planLines.delete(i);
      } else {
        this.doneTubes.get(i)?.removeFromParent();
        this.doneTubes.delete(i);
        if (!this.planLines.has(i)) {
          const pts = trajectoryPolyline(geo, 0, geo.TD, 1).map((p) => new THREE.Vector3(...p));
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: geo.x === 0 ? 0xffffff : 0xffd34d, dashSize: 1.6, gapSize: 1, transparent: true, opacity: 0.85 }));
          line.computeLineDistances();
          this.group.add(line);
          this.planLines.set(i, line);
        }
      }
    });
    this.tube("pipe", wi, 0, sc.pipeTo, 0.2);
    this.tube("hole", wi, 60, sc.holeMD, 0.5);
    this.tube("cas", wi, 0, sc.casingTo, 0.32);
    if (sc.cementInside) this.tube("cemI", wi, sc.cementInside[0], sc.cementInside[1], 0.24);
    else this.tube("cemI", wi, 0, 0, 0.1);
    if (sc.cementAnnulus) this.tube("cemA", wi, sc.cementAnnulus[0], sc.cementAnnulus[1], 0.52);
    else this.tube("cemA", wi, 0, 0, 0.1);
    const geo = WELL_GEOMETRY[wi];
    if (sc.plugAt != null) {
      const t = trajectoryAt(geo, sc.plugAt);
      this.plug.visible = true;
      this.plug.position.set(...t.position);
      this.plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...t.tangent));
    } else this.plug.visible = false;
    // КНБК и долото (эталон MS)
    this.bit.visible = sc.bhaVisible;
    for (const c of BHA_COMPONENTS) {
      const m = this.bha.get(c.id)!;
      m.visible = sc.bhaVisible;
      if (!sc.bhaVisible) continue;
      const from = Math.max(0, sc.md - c.from);
      const to = Math.max(from + 0.05, sc.md - c.to);
      const key = `${wi}:${from.toFixed(1)}`;
      if (m.userData.key !== key) {
        m.userData.key = key;
        const pts = trajectoryPolyline(geo, from, to, 0.5).map((p) => new THREE.Vector3(...p));
        m.geometry.dispose();
        m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, c.radius, 12);
      }
    }
    if (sc.bhaVisible) {
      const t = trajectoryAt(geo, sc.md);
      this.bit.position.set(...t.position);
      this.bit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-t.tangent[0], -t.tangent[1], -t.tangent[2]));
      this.bit.scale.setScalar(1.6);
      this.bit.rotateY(bitAngle(snap.drilling.rotation));
    }
    // пачка газа при ГНВП
    const slug = gasSlug(snap.operation, snap.kick.step, snap.well.md / 25, snap.phaseProgress, snap.kick.gain, snap.kick.gainAtDetect);
    if (slug && slug[1] - slug[0] > 0.05) {
      const pts = trajectoryPolyline(geo, slug[0], slug[1], 0.5).map((p) => new THREE.Vector3(...p));
      this.gas.geometry.dispose();
      this.gas.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.46, 10);
      this.gas.visible = true;
    } else this.gas.visible = false;
  }
}
