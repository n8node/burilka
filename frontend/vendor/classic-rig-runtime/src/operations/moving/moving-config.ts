/** Параметры переезда по кусту (эталон Lf, Af, Za, P1). */
import { MOVE_STEP, MOVE_TARGETS } from "../../reference/constants";
import { MOVE_STEPS } from "../../reference/operations-reference";

export const MOVING_CONFIG = {
  steps: MOVE_STEPS,
  /** шаг переезда, м сцены */
  step: MOVE_STEP,
  /** устья, на которые можно переехать */
  targets: MOVE_TARGETS,
  /** агрегаты, которые НЕ едут вместе с вышечным блоком (эталон XS) */
  stationary: ["rails", "cluster", "casing", "bha"] as string[],
} as const;
