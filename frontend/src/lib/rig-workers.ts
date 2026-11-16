import * as THREE from "three";
import type { RigSnapshot, WorkerAssignment, WorkerTask } from "./rig-simulation";
import { crewPlacement, routeBetweenLevels } from "./rig-layout";

type Worker = {
  root: THREE.Object3D;
  phase: number;
  joints: Record<string, THREE.Object3D | undefined>;
  position: THREE.Vector3;
  target: THREE.Vector3;
  task: WorkerTask;
  walkBlend: number;
  path: THREE.Vector3[];
  destinationKey: string;
};

function joint(root: THREE.Object3D, name: string) {
  let result: THREE.Object3D | undefined;
  root.traverse((item) => { if (item.name.toLowerCase() === name) result = item; });
  return result;
}

export function createRigWorkers(roots: Map<string, THREE.Object3D>) {
  const workers = new Map<string, Worker>();
  for (const [index, id] of ["crew-helper1", "crew-helper2", "crew-driller", "crew-derrick", "crew-mechanic", "crew-mud", "crew-electric", "crew-master"].entries()) {
    const root = roots.get(id);
    if (!root) continue;
    const joints: Record<string, THREE.Object3D | undefined> = {};
    for (const name of ["pelvis", "spine", "chest", "head", "hip_l", "hip_r", "knee_l", "knee_r", "ankle_l", "ankle_r", "shoulder_l", "shoulder_r", "elbow_l", "elbow_r"]) joints[name] = joint(root, name);
    workers.set(id, { root, phase: index * 1.7, joints, position: root.position.clone(), target: root.position.clone(), task: "idle", walkBlend: 0, path: [], destinationKey: "" });
  }

  const assignments = new Map<string, WorkerAssignment>();
  function update(snapshot: RigSnapshot, delta: number, time: number) {
    assignments.set("crew-helper1", snapshot.workers[0]);
    assignments.set("crew-helper2", snapshot.workers[1]);
    assignments.set("crew-derrick", snapshot.derrick);
    assignments.set("crew-driller", { destination: crewPlacement["crew-driller"], task: "console", face: [0, 0] });
    assignments.set("crew-mechanic", { destination: crewPlacement["crew-mechanic"], task: snapshot.pumpRpm ? "wrench" : "look", face: [-15, -10] });
    assignments.set("crew-mud", { destination: crewPlacement["crew-mud"], task: snapshot.pumpRpm ? "look" : "idle", face: [15, -8] });
    assignments.set("crew-electric", { destination: crewPlacement["crew-electric"], task: "look", face: [0, 0] });
    assignments.set("crew-master", { destination: crewPlacement["crew-master"], task: "look", face: [0, 0] });
    for (const [id, worker] of workers) {
      const assignment = assignments.get(id);
      if (!assignment) continue;
      const key = assignment.destination.join(",");
      if (worker.destinationKey !== key) {
        worker.destinationKey = key;
        worker.path = routeBetweenLevels(worker.position.toArray() as [number, number, number], assignment.destination).map((point) => new THREE.Vector3(...point));
      }
      while (worker.path.length && worker.position.distanceTo(worker.path[0]) < 0.04) worker.path.shift();
      if (!worker.path.length && worker.position.distanceTo(new THREE.Vector3(...assignment.destination)) > 0.04) continue;
      worker.target.copy(worker.path[0] ?? worker.position);
      const direction = worker.target.clone().sub(worker.position);
      const distance = direction.length();
      const moving = snapshot.running && distance > 0.04;
      if (moving) {
        const step = Math.min(distance, 1.45 * delta);
        worker.position.addScaledVector(direction, step / distance);
        if (step >= distance - 1e-5) worker.path.shift();
        worker.phase += step / 0.72 * Math.PI * 2;
        worker.root.rotation.y += Math.atan2(Math.sin(Math.atan2(direction.x, direction.z) - worker.root.rotation.y), Math.cos(Math.atan2(direction.x, direction.z) - worker.root.rotation.y)) * Math.min(1, delta * 7);
      } else if (snapshot.running && assignment.face) {
        const angle = Math.atan2(assignment.face[0] - worker.position.x, assignment.face[1] - worker.position.z);
        worker.root.rotation.y += Math.atan2(Math.sin(angle - worker.root.rotation.y), Math.cos(angle - worker.root.rotation.y)) * Math.min(1, delta * 4);
      }
      worker.root.position.copy(worker.position);
      worker.walkBlend += ((moving ? 1 : 0) - worker.walkBlend) * Math.min(1, delta * 6);
      worker.task = moving ? "walk" : assignment.task;
      const stride = Math.sin(worker.phase) * worker.walkBlend;
      const opposite = -stride;
      const set = (name: string, x: number, y = 0, z = 0) => { const part = worker.joints[name]; if (part) part.rotation.set(x, y, z); };
      set("hip_l", stride * 0.4); set("hip_r", opposite * 0.4);
      set("knee_l", Math.max(0, -stride) * 0.65); set("knee_r", Math.max(0, -opposite) * 0.65);
      set("ankle_l", -stride * 0.18); set("ankle_r", -opposite * 0.18);
      const working = snapshot.running && !moving;
      const reach = working && worker.task === "reach" ? -0.95 : 0;
      const consolePose = working && worker.task === "console" ? -0.6 : 0;
      const wrench = working && worker.task === "wrench" ? -0.7 + Math.sin(time * 4) * 0.2 : 0;
      set("shoulder_l", -stride * 0.28 + reach + consolePose + wrench);
      set("shoulder_r", -opposite * 0.28 + reach + consolePose);
      set("elbow_l", working && (worker.task === "reach" || worker.task === "console" || worker.task === "wrench") ? -0.65 : 0);
      set("elbow_r", working && (worker.task === "reach" || worker.task === "console") ? -0.65 : 0);
      const pelvis = worker.joints.pelvis;
      if (pelvis) pelvis.position.y = walkingBob(worker.phase, worker.walkBlend);
      set("chest", working && worker.task === "wrench" ? 0.12 : 0);
      set("head", 0, Math.sin(time * 0.45 + worker.phase) * 0.07);
    }
  }
  return update;
}

function walkingBob(phase: number, blend: number) { return Math.sin(phase) * blend * 0.025; }