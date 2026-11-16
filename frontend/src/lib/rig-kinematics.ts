import * as THREE from "three";
import type { RigSnapshot } from "./rig-simulation";

// Explicit mesh map for 01_classic_rig/rotary.glb. Meshes 4–6 are slips;
// grouping by proximity to the well axis rotated them with the table.
export const ROTARY_PARTS = { table: ["mesh_1", "mesh_2"], slips: ["mesh_4", "mesh_5", "mesh_6"] } as const;
export const PUMP_PARTS = [
  { x: -17, cylinders: ["mesh_6", "mesh_7", "mesh_8"], crank: "mesh_40" },
  { x: -10, cylinders: ["mesh_20", "mesh_21", "mesh_22"], crank: "mesh_50" },
] as const;

function namedMesh(root: THREE.Object3D | undefined, name: string) {
  const item = root?.getObjectByName(name);
  return item instanceof THREE.Mesh ? item : undefined;
}

function makePivot(root: THREE.Object3D | undefined, names: readonly string[], position: readonly [number, number, number]) {
  if (!root) return undefined;
  const meshes = names.map((name) => namedMesh(root, name));
  if (meshes.some((mesh) => !mesh)) return undefined;
  root.updateWorldMatrix(true, true);
  const pivot = new THREE.Group();
  pivot.position.set(...position);
  root.add(pivot);
  root.updateWorldMatrix(true, true);
  meshes.forEach((mesh) => pivot.attach(mesh!));
  return pivot;
}

export function createRigKinematics(roots: Map<string, THREE.Object3D>) {
  const drive = roots.get("topdrive");
  const travel = roots.get("travel");
  const string = roots.get("drillstring");
  const stringMesh = string?.getObjectByName("mesh_0");
  // The exported string includes its own positioning transform: only its
  // mesh may rotate, not the baked world-space scene root.
  // The drive and travelling block are separate exports at the same well axis.
  // Lift their assemblies together; never rotate the gearbox housing.
  const driveBase = drive?.position.y ?? 0;
  const travelBase = travel?.position.y ?? 0;
  const rotaryRoot = roots.get("rotary");
  const rotary = makePivot(rotaryRoot, ROTARY_PARTS.table, [0, 8.7, 0]);
  const slips = ROTARY_PARTS.slips.map((name) => namedMesh(rotaryRoot, name));
  const slipPositions = slips.map((mesh) => mesh?.position.clone());
  const rack = roots.get("setback");
  const stand = namedMesh(rack, "mesh_13");
  const standBase = stand?.position.clone();
  const pumpRoot = roots.get("mudpumps");
  const pumps = PUMP_PARTS.map((part) => {
    const cylinders = part.cylinders.map((name) => namedMesh(pumpRoot, name));
    const bases = cylinders.map((mesh) => mesh?.position.clone());
    const crank = makePivot(pumpRoot, [part.crank], [part.x, 1.3, -15.35]);
    return { cylinders, bases, crank };
  });
  return (snapshot: RigSnapshot) => {
    if (drive) drive.position.y = driveBase + snapshot.height;
    if (travel) travel.position.y = travelBase + snapshot.height;
    if (stringMesh) stringMesh.rotation.y = snapshot.driveAngle;
    if (rotary) rotary.rotation.y = snapshot.slipsClosed ? 0 : snapshot.rotaryAngle;
    if (stand && standBase) {
      stand.visible = snapshot.stand.visible;
      stand.position.set(snapshot.stand.x, snapshot.stand.y, snapshot.stand.z);
      stand.rotation.z = snapshot.stand.rotation;
    }
    pumps.forEach(({ cylinders, bases, crank }, pumpIndex) => {
      const angle = snapshot.pumpAngle + pumpIndex * Math.PI;
      cylinders.forEach((mesh, index) => {
        const base = bases[index];
        if (mesh && base) mesh.position.z = base.z + Math.sin(angle + index * Math.PI * 2 / 3) * 0.12;
      });
      if (crank) crank.rotation.z = angle;
    });
    slips.forEach((mesh, index) => {
      const base = slipPositions[index];
      if (!mesh || !base) return;
      const direction = new THREE.Vector3(base.x, 0, base.z).normalize();
      mesh.position.copy(base).addScaledVector(direction, snapshot.slipsClosed ? -0.08 : 0);
    });
  };
}