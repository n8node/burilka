/** Классификация и описания событий телеметрии. */
import type { ClassicRigTelemetryEvent } from "../types";

/** Совпадает ли событие с именем из exam.forbiddenEvents/requiredEvents (тип события или код нарушения). */
export function eventMatches(e: ClassicRigTelemetryEvent, name: string): boolean {
  if (e.type === name) return true;
  if (e.type === "safety_violation" && e.code === name) return true;
  return false;
}

export const VIOLATION_TITLES: Record<string, string> = {
  worker_entered_danger_zone_during_rotation: "Человек в красной зоне при вращении колонны",
  worker_under_rig: "Человек под вышечным блоком",
  topdrive_moved_with_worker_in_collision_zone: "СВП опускается, человек в зоне под ним",
  pump_started_with_slips_closed: "Пуск насосов при закрытых клиньях",
  bop_closed_while_rotating: "Закрытие ПВО при вращении колонны",
  bop_opened_during_well_control: "Открытие ПВО во время глушения",
  derrick_work_in_high_wind: "Работа верхового при ветре ≥ 15 м/с",
};

export function describeEvent(e: ClassicRigTelemetryEvent): string {
  switch (e.type) {
    case "safety_violation":
      return `Нарушение: ${VIOLATION_TITLES[e.code] ?? e.code}`;
    case "command_rejected":
      return `Отклонено «${e.command}»: ${e.reason}`;
    case "phase_started":
      return `Фаза ${e.operationId}/${e.phaseId}`;
    default:
      return e.type;
  }
}
