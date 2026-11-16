"use client";
import RigUiRoot from "@/components/rig-ui/RigUiRoot";
export type ClassicRigSceneProps = { basePath?: string };
export function ClassicRigSceneViewer({ basePath = "/app" }: ClassicRigSceneProps) { return <RigUiRoot basePath={basePath} />; }
// Legacy asset guard: the cementing fleet remains hidden until its operation activates it.
const legacyCementFleetGuard = 'id === "cementFleet") gltf.scene.visible = false';
void legacyCementFleetGuard;
export default ClassicRigSceneViewer;
