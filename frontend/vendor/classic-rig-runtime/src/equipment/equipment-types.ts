/** Типы слоя агрегатов. Чистый модуль. */
import type { ClassicRigEquipmentId, EquipmentSnapshot } from "../types";
import type { ClassicRigState } from "../simulation/ClassicRigState";
import type { ConnectionKinematics } from "../operations/drilling/drilling-kinematics";
import type { ProgramVisuals } from "../operations/casing/casing-program";
import type { WellGeometry } from "../well/depth-model";

export type { ClassicRigEquipmentId, EquipmentSnapshot };

/** Всё, что нужно контроллерам агрегатов для вычисления снимка в одном кадре. */
export type EquipmentFrame = {
  state: ClassicRigState;
  kin: ConnectionKinematics;
  program: ProgramVisuals;
  well: WellGeometry;
  /** текущая фаза (id) и набор активных агрегатов фазы из описания операции */
  phase: string;
  activeEquipment: ReadonlySet<ClassicRigEquipmentId>;
  /** скорость вращения колонны, рад/с (по разности кадров) */
  rotationRate: number;
  /** скорость СВП по вертикали, м/с */
  tdVelocity: number;
  /** сдвиг агрегатов при переезде */
  rigX: number;
  rotaryTableFollowsString: boolean;
};

export type EquipmentController = (f: EquipmentFrame) => EquipmentSnapshot;

export const isActive = (s: EquipmentSnapshot["state"]): boolean => s === "running" || s === "moving" || s === "engaged";
