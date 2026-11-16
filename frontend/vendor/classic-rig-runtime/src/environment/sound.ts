/**
 * Звуковые сигналы. Эталон синтезировал звук WebAudio прямо в монолите (gE/pE).
 * Runtime лишь объявляет сигналы по событиям симуляции; синтез/воспроизведение — задача приложения.
 */
export const SOUND_CUES: Record<string, { cue: string; gain: number }> = {
  slips: { cue: "slips_set", gain: 0.8 },
  breakTD: { cue: "topdrive_breakout", gain: 0.7 },
  latch: { cue: "elevator_latch", gain: 0.6 },
  makeup: { cue: "tong_makeup", gain: 0.9 },
  release: { cue: "slips_pull", gain: 0.7 },
  alarm: { cue: "kick_siren", gain: 1 },
  shutin: { cue: "bop_close", gain: 0.9 },
  open: { cue: "bop_open", gain: 0.6 },
};

export const cueForPhase = (phaseId: string) => SOUND_CUES[phaseId];
