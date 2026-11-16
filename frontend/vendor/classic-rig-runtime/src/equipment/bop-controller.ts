/**
 * ПВО (эталон DS: плашки x = x0 − sign(x0)·0.32·rams; универсальный превентор сжимается; индикаторы).
 * Состояние меняется только на шагах ГНВП shutin/kill/open или по ручной команде close_bop/open_bop.
 */
import type { ClassicRigState } from "../simulation/ClassicRigState";
import type { BopSnapshot } from "../types";
import type { EquipmentController } from "./equipment-types";
import { clamp01 } from "../util/math";

export function bopTargets(s: ClassicRigState): { annular: number; rams: number } {
  if (s.bop.manualClosed) return { annular: 1, rams: 1 };
  if (s.op !== "kick") return { annular: 0, rams: 0 };
  const key = ["influx", "alarm", "shutin", "kill", "open"][s.stepIndex];
  const n = s.stepP;
  const annular = key === "shutin" ? clamp01(n * 2) : key === "kill" ? 1 : key === "open" ? 1 - clamp01(n * 2) : 0;
  const rams = key === "shutin" ? clamp01(n * 2 - 0.8) : key === "kill" ? 1 : key === "open" ? 1 - clamp01(n * 2) : 0;
  return { annular, rams };
}

export function bopSnapshot(s: ClassicRigState): BopSnapshot {
  const { annular, rams } = { annular: s.bop.annular, rams: s.bop.rams };
  const closed = annular > 0.98 && rams > 0.98;
  const open = annular < 0.02 && rams < 0.02;
  const target = bopTargets(s);
  const closing = target.annular + target.rams > annular + rams;
  return { state: closed ? "closed" : open ? "open" : closing ? "closing" : "opening", annular, rams, manual: s.bop.manualClosed };
}

export const bopController: EquipmentController = (f) => {
  const b = bopSnapshot(f.state);
  return {
    id: "bop",
    state: b.state === "closed" ? "engaged" : b.state === "open" ? "idle" : "moving",
    visible: true,
    position: [f.rigX, 0, 0],
    progress: Math.max(b.annular, b.rams),
    activePhase: f.activeEquipment.has("bop") ? f.phase : undefined,
    kinematics: { annular: b.annular, rams: b.rams, ramTravel: 0.32 * b.rams, lampRams: b.rams > 0.5, lampAnnular: b.annular > 0.5 },
  };
};
