/** Команды симуляции и их проверка (чистый модуль). */
import type { ClassicRigCommand, ClassicRigEventId, ClassicRigOperationId, WeatherPresetId } from "../types";
import { WEATHER_PRESETS } from "../reference/environment-reference";

export type { ClassicRigCommand };

export const OPERATION_IDS: ClassicRigOperationId[] = ["drilling", "tripping", "casing", "cementing", "moving", "kick"];
export const EVENT_IDS: ClassicRigEventId[] = ["kick", "high_wind", "calm_wind"];

/** Возвращает текст ошибки или null, если команда корректна по форме. */
export function validateCommand(c: ClassicRigCommand): string | null {
  switch (c.type) {
    case "select_operation":
      return OPERATION_IDS.includes(c.operation) ? null : `неизвестная операция ${String(c.operation)}`;
    case "select_phase":
      return typeof c.phase === "string" && c.phase.length > 0 ? null : "пустой идентификатор фазы";
    case "set_speed":
      return Number.isFinite(c.value) && c.value >= 0 ? null : "скорость должна быть ≥ 0";
    case "set_weather":
      if (c.weather.preset && !(c.weather.preset in WEATHER_PRESETS)) return `неизвестная погода ${c.weather.preset as WeatherPresetId}`;
      if (c.weather.windOverride != null && !(c.weather.windOverride >= 0 && c.weather.windOverride < 60)) return "ветер вне диапазона 0–60 м/с";
      return null;
    case "trigger_event":
      return EVENT_IDS.includes(c.event) ? null : `неизвестное событие ${String(c.event)}`;
    default:
      return null;
  }
}
