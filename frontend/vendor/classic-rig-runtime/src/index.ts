/**
 * @rigintel/classic-rig-runtime — чистая часть пакета (без three.js / react).
 * Renderer подключается отдельно: import { ClassicRigSceneRuntime } from "@rigintel/classic-rig-runtime/renderer".
 */
export * from "./types";
export { ClassicRigRuntime, type ClassicRigRuntimeOptions } from "./simulation/ClassicRigRuntime";
export { ClassicRigSimulation, type ClassicRigSimulationOptions } from "./simulation/ClassicRigSimulation";
export { DEFAULT_CONFIG, type SimulationConfig } from "./simulation/config";
export { validateCommand, OPERATION_IDS, EVENT_IDS } from "./simulation/ClassicRigCommands";
export type { ClassicRigNotification, ClassicRigSoundCue } from "./simulation/ClassicRigEvents";
export { PhaseMachine } from "./simulation/PhaseMachine";
export { OperationRegistry } from "./simulation/OperationRegistry";

export { drillingOperation } from "./operations/drilling/drilling-operation";
export { DRILLING_PHASES, DRILLING_PHASE_ORDER } from "./operations/drilling/drilling-phases";
export { trippingOperation } from "./operations/tripping/tripping-operation";
export { casingOperation } from "./operations/casing/casing-operation";
export { cementingOperation } from "./operations/cementing/cementing-operation";
export { movingOperation } from "./operations/moving/moving-operation";
export { kickOperation } from "./operations/kick/kick-operation";

export { EQUIPMENT, EQUIPMENT_IDS, STATIC_SCENERY_ASSETS } from "./equipment/equipment-registry";
export { CLASSIC_RIG_ASSETS, CAMP_ASSETS, CHARACTER_ASSETS, TABLET_PROP, assetById, partsOf } from "./equipment/equipment-bindings";
export type { ClassicRigAssetBinding, MovablePartBinding, PartSignature } from "./equipment/equipment-bindings";

export { WORKER_IDS } from "./workers/worker-registry";
export { WORKER_ROLES } from "./workers/worker-roles";
export { poseToJoints, POSE, POSE_SIZE } from "./workers/worker-poses";
export { allRoutes } from "./workers/worker-routes";

export { WELL_GEOMETRY, trajectoryAt } from "./well/depth-model";
export { trajectoryPolyline, gasSlug } from "./well/trajectory-state";
export { BHA_COMPONENTS } from "./well/drillstring-state";

export { WEATHER_PRESETS } from "./environment/weather";
export { autoSeason } from "./environment/season";
export { sunPosition, dayPhase, daylight } from "./environment/lighting";
export { SOUND_CUES } from "./environment/sound";

export { ClassicRigTelemetryRecorder } from "./telemetry/telemetry-recorder";
export { aggregate as aggregateTelemetry } from "./telemetry/telemetry-aggregates";
export { VIOLATION_TITLES, describeEvent } from "./telemetry/telemetry-events";
export type { TelemetryAggregates, EquipmentUsage } from "./telemetry/telemetry-types";

export { ClassicRigExamEngine } from "./exams/exam-engine";
export { evaluateExam } from "./exams/exam-evaluator";
export { CLASSIC_RIG_EXAMS, drillingConnectionExam, kickResponseExam, casingCementingExam } from "./exams/exam-definition";
export type { ClassicRigExamDefinition, ClassicRigExamResult, ScoringRule } from "./exams/exam-types";

export * as reference from "./reference";
