import * as THREE from "three";
import type { RigSnapshot } from "./rig-simulation";

// GLBs are baked in rig coordinates, with unnamed meshes and no animation
// clips. Only reparent geometries whose bounding boxes identify a movable
// part; keep the rest of the equipment stationary.
function movableMeshes(root: THREE.Object3D, predicate: (box: THREE.Box3) => boolean) {
  root.updateWorldMatrix(true, true);
  const meshes: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const box = new THREE.Box3().setFromObject(object);
      if (predicate(box)) meshes.push(object);
    }
  });
  return meshes;
}

function pivotFor(root: THREE.Object3D | undefined, center: THREE.Vector3, predicate: (box: THREE.Box3) => boolean) {
  if (!root) return undefined;
  const selected = movableMeshes(root, predicate);
  if (!selected.length) return undefined;
  const pivot = new THREE.Group();
  pivot.position.copy(center);
  root.add(pivot);
  root.updateWorldMatrix(true, true);
  // attach preserves the baked world transforms while creating a real joint.
  selected.forEach((mesh) => pivot.attach(mesh));
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
  const rotary = pivotFor(roots.get("rotary"), new THREE.Vector3(0, 8.5, 0), (box) => {
    const center = box.getCenter(new THREE.Vector3());
    return Math.hypot(center.x, center.z) < 0.85 && box.max.y < 9.05 && box.min.y > 8.1;
  });
  // The drillstring is already a separate object; its centerline is the well axis.
  return (snapshot: RigSnapshot) => {
    if (drive) drive.position.y = driveBase + snapshot.height;
    if (travel) travel.position.y = travelBase + snapshot.height;
    if (string) string.rotation.y = snapshot.driveAngle;
    if (rotary) rotary.rotation.y = snapshot.rotaryAngle;
  };
}