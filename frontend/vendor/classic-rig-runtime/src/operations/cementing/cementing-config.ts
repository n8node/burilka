/** Параметры цементирования — эталон (шаги circ…woc, расчёт Rn.pressure/pumped). */
import { CASING_PROGRAM_STEPS } from "../../reference/operations-reference";

export const CEMENTING_STEPS = CASING_PROGRAM_STEPS.filter((s) => ["circ", "pump", "disp", "bump", "woc"].includes(s.key));

export const CEMENTING_CONFIG = {
  /** закачано, м³: буфер+цемент 18, продавка ещё 22 */
  cementVolume: 18,
  displacementVolume: 22,
  /** давление, МПа (эталон): промывка 6; закачка 4→7; продавка 7→13; «стоп» 13→22; ОЗЦ 22→0 */
  pressures: { circ: 6, pumpFrom: 4, pumpTo: 7, dispFrom: 7, dispTo: 13, bumpFrom: 13, bumpPeak: 22 },
  slurryDensity: "1,85 г/см³",
} as const;
