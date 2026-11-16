import { sunPosition } from "@rigintel/classic-rig-runtime";
export const utcLabel = (off: number) => `UTC${off >= 0 ? "+" : "−"}${Math.floor(Math.abs(off) / 60)}${Math.abs(off) % 60 ? `:${String(Math.abs(off) % 60).padStart(2, "0")}` : ""}`;
export const localDate = (utc: number, off: number) => new Date(utc + off * 60000);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dayPhase = (utc: number, lat: number, lon: number, phases: any[]) => { const s = sunPosition(utc, lat, lon); return s.elevation > 8 ? phases[0] : s.elevation > -6 ? (s.hourAngle < 0 ? phases[1] : phases[2]) : phases[3]; };
export const fmtTime = (d: Date) => `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;