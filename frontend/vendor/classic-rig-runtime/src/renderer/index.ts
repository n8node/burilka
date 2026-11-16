/** Three.js-часть пакета (браузер). Импортируйте только на клиенте. */
export { ClassicRigSceneRuntime, type ClassicRigSceneRuntimeOptions, type PickResult } from "./ClassicRigSceneRuntime";
export { ClassicRigAssetLoader, verifySignature, type LoadedAssets, type BindingReport, type AssetLoaderOptions } from "./AssetLoader";
export { ClassicRigEquipmentRenderer } from "./EquipmentRenderer";
export { ClassicRigWorkerRenderer } from "./WorkerRenderer";
export { ClassicRigWellRenderer } from "./WellRenderer";
export { ClassicRigEnvironmentRenderer, type EnvironmentOptions } from "./EnvironmentRenderer";
export { ClassicRigCameraController, CAMERA_VIEWS, type CameraViewId } from "./CameraController";
export { ClassicRigSceneGraph } from "./SceneGraph";
