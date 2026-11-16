/** Параметры ГНВП (эталон: we, T1, sd, S1). */
import { KICK_TIME_SCALE } from "../../reference/constants";
import { KICK_PARAMS, KICK_STEPS } from "../../reference/operations-reference";

export const KICK_CONFIG = {
  steps: KICK_STEPS,
  params: KICK_PARAMS,
  /** минуты реального времени = секунды симуляции × 25 / 60 */
  timeScale: KICK_TIME_SCALE,
  /** на шаге «глушение» насос работает на 45 % подачи */
  killPumpRate: 0.45,
  historyLimit: 6,
} as const;
