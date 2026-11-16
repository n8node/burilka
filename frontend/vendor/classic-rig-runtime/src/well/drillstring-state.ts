/** Бурильная колонна: длина над устьем, вращение, состав КНБК (эталон Pl, MS, No). */
import { BHA_LENGTH } from "../reference/constants";

/** Состав КНБК вдоль ствола от долота вверх, м сцены (эталон MS): двигатель, телесистема, УБТ */
export const BHA_COMPONENTS = [
  { id: "motor", from: 2.7, to: 0.55, radius: 0.31, color: 13784367 },
  { id: "mwd", from: 4.8, to: 2.7, radius: 0.28, color: 2793888 },
  { id: "dc", from: 8.4, to: 4.8, radius: 0.27, color: 3093304 },
] as const;

export const bhaVisible = (stringMD: number): boolean => stringMD > BHA_LENGTH * 0.5;
/** Долото вращается в 1.8 раза быстрее колонны (эталон: bitRot = rot × 1.8 — привод ВЗД) */
export const bitAngle = (stringAngle: number): number => stringAngle * 1.8;
