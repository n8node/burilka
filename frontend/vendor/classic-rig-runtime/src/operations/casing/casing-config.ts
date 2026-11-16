/** Параметры обсадки (эталон: To.casing шаги rigup, rih). */
import { CASING_PROGRAM_STEPS } from "../../reference/operations-reference";

export const CASING_STEPS = CASING_PROGRAM_STEPS.filter((s) => s.key === "rigup" || s.key === "rih");

export const CASING_CONFIG = {
  /** во время спуска обсадной колонны СВП совершает 10 ходов (Um(r × 10)) */
  tdStrokes: 10,
  /** цемент поднимают на 12 м сцены выше точки начала набора угла (toc = kop − 12) */
  topOfCementAboveKop: 12,
} as const;
