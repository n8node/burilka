/**
 * Состояние переноса свечи и подсвечника (эталон: ZS, If, N1, O1, z1, setStands).
 */
import type { ClassicRigState, StandTransfer } from "../../simulation/ClassicRigState";
import type { DrillingPhaseId } from "../../types";
import { FLOOR_Y } from "../../reference/constants";
import { DRILLING_CONFIG as C } from "./drilling-config";

/** Ячейки подсвечника (эталон: 6 рядов × 5, кроме (c + a) % 5 === 4) — порядок совпадает с GLB setback. */
export const SETBACK_SLOTS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let a = 0; a < 6; a++)
    for (let c = 0; c < 5; c++) {
      if ((c + a) % 5 === 4) continue;
      out.push([2 + c * 0.6, 0 + a * 0.58]);
    }
  return out;
})();

/** ZS(): взять первую свечу из подсвечника. Возвращает перенос и флаг «подсвечник пополнен». */
export function takeStandFromSetback(s: ClassicRigState): { cs: StandTransfer; refilled: boolean } {
  let idx = s.setbackVisible.findIndex((v) => v);
  let refilled = false;
  if (idx < 0) {
    s.setbackVisible.fill(true);
    idx = 0;
    refilled = true;
  }
  const [t, n] = SETBACK_SLOTS[idx];
  const len = Math.hypot(t, n);
  const r = (t / len) * 1.3;
  const o = (n / len) * 1.3;
  const a = Math.hypot(t - r, n - o);
  const ytop = FLOOR_Y + Math.sqrt(C.standLength * C.standLength - a * a);
  const eY = ytop - C.standTopOffset;
  const tdLatch = eY + Math.sqrt(C.linkLength * C.linkLength - (r * r + o * o)) - C.linkPivotOffset;
  return {
    refilled,
    cs: {
      standIndex: idx,
      sx: t,
      sz: n,
      px: r,
      pz: o,
      ytop,
      eY,
      tdLatch,
      bot: [t, FLOOR_Y, n],
      top: [t, FLOOR_Y + C.standLength, n],
      spin: 0,
    },
  };
}

/** If(): вернуть свечу в подсвечник (операция прервана). */
export function returnStandToSetback(s: ClassicRigState): void {
  if (s.drill.cs) {
    s.setbackVisible[s.drill.cs.standIndex] = true;
    s.drill.cs = null;
  }
}

/** N1(): свеча свинчена с колонной — из подсвечника она исчезает. */
export function consumeStand(s: ClassicRigState): number | null {
  const cs = s.drill.cs;
  if (!cs) return null;
  s.setbackVisible[cs.standIndex] = false;
  s.drill.cs = null;
  return cs.standIndex;
}

/** $n */
export function setDrillPhase(s: ClassicRigState, phase: DrillingPhaseId): void {
  s.drill.phase = phase;
  s.drill.timer = 0;
}

/** O1(): прервать наращивание и вернуться к бурению с верхнего положения СВП. */
export function abortConnection(s: ClassicRigState): void {
  if (s.op !== "drilling") return;
  if (s.drill.cs) consumeStand(s);
  s.drill.tdY = C.tdTop;
  s.drill.phase = "drill";
  s.drill.timer = 0;
  s.drill.windWait = false;
}
