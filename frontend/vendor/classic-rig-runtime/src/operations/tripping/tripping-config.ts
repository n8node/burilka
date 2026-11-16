/** Параметры СПО (подъём колонны) — эталон: шаг pooh программы «Обсадка и цемент». */
import { CASING_PROGRAM_STEPS } from "../../reference/operations-reference";

export const TRIPPING_STEPS = CASING_PROGRAM_STEPS.filter((s) => s.key === "pooh");

export const TRIPPING_CONFIG = {
  /** за подъём СВП совершает 9 ходов (эталон Um(r × 9)) и в подсвечник встают все 24 свечи */
  tdStrokes: 9,
} as const;
