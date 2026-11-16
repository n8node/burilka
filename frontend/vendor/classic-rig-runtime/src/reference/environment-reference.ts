/**
 * Окружение: погода, сезоны, регионы, цементировочный флот — извлечено из эталона (Fi, RT, Xf, Mf, ES).
 */
import type { WeatherPresetId } from "../types";

export type WeatherPreset = { name: string; icon: string; cloud: number; fog: number; rain: number; snow: number; wind: number; seasons: ("summer" | "winter")[] };

/** Fi — пресеты погоды */
export const WEATHER_PRESETS: Record<WeatherPresetId, WeatherPreset> = {
  "clear": {
    "name": "Ясно",
    "icon": "☀",
    "cloud": 0,
    "fog": 0,
    "rain": 0,
    "snow": 0,
    "wind": 3,
    "seasons": [
      "summer",
      "winter"
    ]
  },
  "cloudy": {
    "name": "Облачно",
    "icon": "☁",
    "cloud": 0.8,
    "fog": 0,
    "rain": 0,
    "snow": 0,
    "wind": 6,
    "seasons": [
      "summer",
      "winter"
    ]
  },
  "fog": {
    "name": "Туман",
    "icon": "🌫",
    "cloud": 0.55,
    "fog": 1,
    "rain": 0,
    "snow": 0,
    "wind": 1,
    "seasons": [
      "summer",
      "winter"
    ]
  },
  "rain": {
    "name": "Дождь",
    "icon": "🌧",
    "cloud": 0.9,
    "fog": 0.2,
    "rain": 0.55,
    "snow": 0,
    "wind": 7,
    "seasons": [
      "summer"
    ]
  },
  "storm": {
    "name": "Ливень с ветром",
    "icon": "⛈",
    "cloud": 1,
    "fog": 0.35,
    "rain": 1,
    "snow": 0,
    "wind": 17,
    "seasons": [
      "summer"
    ]
  },
  "snow": {
    "name": "Снегопад",
    "icon": "🌨",
    "cloud": 0.85,
    "fog": 0.3,
    "rain": 0,
    "snow": 0.55,
    "wind": 5,
    "seasons": [
      "winter"
    ]
  },
  "blizzard": {
    "name": "Метель",
    "icon": "❄",
    "cloud": 1,
    "fog": 0.6,
    "rain": 0,
    "snow": 1,
    "wind": 18,
    "seasons": [
      "winter"
    ]
  }
};

/** RT — замена погоды при смене сезона */
export const WEATHER_SEASON_FALLBACK: Partial<Record<WeatherPresetId, WeatherPresetId>> = {"rain": "snow", "storm": "blizzard", "snow": "rain", "blizzard": "storm"};

/** Xf — регионы (часовой пояс, широта/долгота для солнца) */
export const REGIONS: { id: string; off: number; city: string; place: string; lat: number; lon: number }[] = [
  {
    "id": "kgd",
    "off": 120,
    "city": "Калининград",
    "place": "Калининградская обл.",
    "lat": 54.7,
    "lon": 20.5
  },
  {
    "id": "tat",
    "off": 180,
    "city": "Москва",
    "place": "Татарстан, Альметьевск",
    "lat": 54.9,
    "lon": 52.3
  },
  {
    "id": "komi",
    "off": 180,
    "city": "Москва",
    "place": "Коми, Усинск",
    "lat": 66,
    "lon": 57.5
  },
  {
    "id": "sam",
    "off": 240,
    "city": "Самара",
    "place": "Самарская обл., Отрадный",
    "lat": 53.4,
    "lon": 51.3
  },
  {
    "id": "orb",
    "off": 300,
    "city": "Екатеринбург",
    "place": "Оренбургская обл., Бузулук",
    "lat": 52.8,
    "lon": 52.3
  },
  {
    "id": "hmao",
    "off": 300,
    "city": "Екатеринбург",
    "place": "ХМАО, Сургут",
    "lat": 61.25,
    "lon": 73.4
  },
  {
    "id": "yanao",
    "off": 300,
    "city": "Екатеринбург",
    "place": "ЯНАО, Новый Уренгой",
    "lat": 66.08,
    "lon": 76.68
  },
  {
    "id": "omsk",
    "off": 360,
    "city": "Омск",
    "place": "Омская обл.",
    "lat": 55,
    "lon": 73.4
  },
  {
    "id": "tomsk",
    "off": 420,
    "city": "Красноярск",
    "place": "Томская обл., Стрежевой",
    "lat": 60.73,
    "lon": 77.6
  },
  {
    "id": "vank",
    "off": 420,
    "city": "Красноярск",
    "place": "Красноярский край, Ванкор",
    "lat": 67.8,
    "lon": 83.5
  },
  {
    "id": "irk",
    "off": 480,
    "city": "Иркутск",
    "place": "Иркутская обл., Верхнечонское",
    "lat": 60.9,
    "lon": 106.4
  },
  {
    "id": "yak",
    "off": 540,
    "city": "Якутск",
    "place": "Якутия, Талакан",
    "lat": 59.8,
    "lon": 111
  },
  {
    "id": "vlad",
    "off": 600,
    "city": "Владивосток",
    "place": "Приморье",
    "lat": 43.1,
    "lon": 131.9
  },
  {
    "id": "sakh",
    "off": 660,
    "city": "Сахалин",
    "place": "Сахалин, Ноглики",
    "lat": 51.8,
    "lon": 143.1
  },
  {
    "id": "kam",
    "off": 720,
    "city": "Камчатка",
    "place": "Петропавловск-Камчатский",
    "lat": 53,
    "lon": 158.65
  }
];
export const DEFAULT_REGION = "hmao";

/** Mf — цементировочный флот: стоянки у буровой [x, z] (4 машины: 2×ЦА-320, смесительная, блок манифольдов) */
export const CEMENT_FLEET_PARKS: [number, number][] = [[9.5, 31], [17.5, 31], [25.5, 31], [5.6, 25.5]];
/** ES — маршрут подъезда из городка: [-62,33] → [-34,31.5] → [park.x-9, park.z+0.2] → park */
export const cementFleetRoute = (park: [number, number]): [number, number][] => [
  [-62, 33],
  [-34, 31.5],
  [park[0] - 9, park[1] + 0.2],
  [park[0], park[1]],
];
/** Факел (точка света эталона) */
export const FLARE_POSITION: [number, number, number] = [40.5, 7.3, 22.5];

/** Вахтовый транспорт городка (эталон xr("vehicles")): стоит только на площадке городка */
export const CAMP_VEHICLE_POSITIONS: [number, number][] = [[-100, 37.6], [-112, 39.8]];
/** Площадка городка (x, z) и площадка буровой (одна классическая БУ) */
export const CAMP_AREA = { minX: -134, maxX: -82, minZ: 5, maxZ: 69 };
export const RIG_PAD = { minX: -65, maxX: 65, minZ: -50, maxZ: 45 };
