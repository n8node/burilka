import * as THREE from "three";
import type { RigSnapshot } from "./rig-simulation";

// Explicit mesh map for 01_classic_rig/rotary.glb. Meshes 4–6 are slips;
// grouping by proximity to the well axis rotated them with the table.
export const ROTARY_PARTS = { table: ["mesh_1", "mesh_2"], slips: ["mesh_4", "mesh_5", "mesh_6"] } as const;

function namedMesh(root: THREE.Object3D | undefined, name: string) {
  const item = root?.getObjectByName(name);
  return item instanceof THREE.Mesh ? item : undefined;
}

function makePivot(root: THREE.Object3D | undefined, names: readonly string[], height: number) {
  if (!root) return undefined;
  const meshes = names.map((name) => namedMesh(root, name));
  if (meshes.some((mesh) => !mesh)) return undefined;
  root.updateWorldMatrix(true, true);
  const pivot = new THREE.Group();
  pivot.position.set(0, height, 0);
  root.add(pivot);
  root.updateWorldMatrix(true, true);
  meshes.forEach((mesh) => pivot.attach(mesh!));
  return pivot;
}

export function createRigKinematics(roots: Map<string, THREE.Object3D>) {
  const drive = roots.get("topdrive");
  const travel = roots.get("travel");
  const string = roots.get("drillstring");
  // The drive and travelling block are separate exports at the same well axis.
  // Lift their assemblies together; never rotate the gearbox housing.
  const driveBase = drive?.position.y ?? 0;
  const travelBase = travel?.position.y ?? 0;
  const rotaryRoot = roots.get("rotary");
  const rotary = makePivot(rotaryRoot, ROTARY_PARTS.table, 8.7);
  const slips = ROTARY_PARTS.slips.map((name) => namedMesh(rotaryRoot, name));
  const slipPositions = slips.map((mesh) => mesh?.position.clone());
  // The drillstring is already a separate object; its centerline is the well axis.
  return (snapshot: RigSnapshot) => {
    if (drive) drive.position.y = driveBase + snapshot.height;
    if (travel) travel.position.y = travelBase + snapshot.height;
    if (string) string.rotation.y = snapshot.driveAngle;
    if (rotary) rotary.rotation.y = snapshot.slipsClosed ? 0 : snapshot.rotaryAngle;
    slips.forEach((mesh, index) => {
      const base = slipPositions[index];
      if (!mesh || !base) return;
      const direction = new THREE.Vector3(base.x, 0, base.z).normalize();
      mesh.position.copy(base).addScaledVector(direction, snapshot.slipsClosed ? -0.08 : 0);
    });
  };
}