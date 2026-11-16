/**
 * Константы, извлечённые из эталонной монолитной сцены (классическая БУ).
 * В комментариях — исходные минифицированные имена.
 * Единицы: «м сцены»; реальные метры глубины = м сцены × DEPTH_SCALE.
 */

/** O — высота рабочего пола над землёй */
export const FLOOR_Y = 8.2;
/** Un — длина свечи */
export const STAND_LENGTH = 25.4;
/** dh = pi — нижнее положение СВП (замок на 1 м над столом ротора) */
export const TD_BOTTOM = FLOOR_Y + 1;
/** cn — верхнее положение СВП */
export const TD_TOP = TD_BOTTOM + STAND_LENGTH;
/** ad — длина КНБК/долота, видимая в разрезе */
export const BHA_LENGTH = 8.4;
/** ws — начальная глубина по стволу при забуривании (м сцены) */
export const START_MD = 62;
/** I1 — скорость проходки, м сцены/с */
export const ROP_SCENE = 0.32;
/** ra — длина штропов */
export const LINK_LENGTH = 2.05;
/** D1 — смещение оси штропов относительно СВП */
export const LINK_PIVOT_OFFSET = 1.2;
/** k1 — вылет верха свечи над элеватором */
export const STAND_TOP_OFFSET = 0.25;
/** Gm, Vm — высоты СВП при выводе свечи на устье и посадке */
export const TD_LIFT_TOP = TD_TOP + 0.95;
export const TD_STAB = TD_TOP + 0.6;
/** ti — масштаб глубины (1 м сцены = 25 м) */
export const DEPTH_SCALE = 25;
/** Ko — отметка кронблока */
export const CROWN_Y = 46.6;
/** Je — высота верха ёмкостей ЦСГО */
export const TANK_TOP = 2.9;
/** S1 — множитель реального времени ГНВП (минуты = с × 25 / 60) */
export const KICK_TIME_SCALE = 25;
/** La — предельный ветер для работ верхового, м/с */
export const WIND_LIMIT = 15;
/** Радиус «красной зоны» у устья и допуск по высоте пола (эталон: счётчик «Людей у устья») */
export const RED_ZONE_RADIUS = 3.4;
export const FLOOR_LEVEL_TOLERANCE = 0.6;
/** Площадка балкона верхового */
export const BALCONY_Y = 33.12;
export const BALCONY_REST: [number, number, number] = [5.2, 33, 1.2];
/** Габарит вышечного блока в плане (под ним людей быть не должно) */
export const SUBSTRUCTURE_HALF = 6.4;
/** Шаг переезда по кусту и устья, на которые можно переехать (P1) */
export const MOVE_STEP = 10;
export const MOVE_TARGETS = [0, 10, 20, 30];

/** Qs — точка гусака стояка (буровой рукав) */
const MAST_BASE_HALF = 4.6;
const MAST_TOP_HALF = 1.7;
const MAST_TOP_Y = 45.6;
const mastHalfAt = (y: number) => MAST_BASE_HALF + (MAST_TOP_HALF - MAST_BASE_HALF) * ((y - FLOOR_Y) / (MAST_TOP_Y - FLOOR_Y));
export const GOOSENECK: [number, number, number] = [mastHalfAt(30) - 0.35, 30, -1.15];

/** bn — длительности фаз наращивания, с */
export const CONNECTION_DURATIONS = {
  slips: 2.2,
  breakTD: 2.4,
  latch: 3.2,
  lift: 5,
  stab: 2,
  makeup: 3.8,
  tdConnect: 2.4,
  release: 1.8,
} as const;

/** Rf — фазы наращивания; B1 — фазы, где колонна сидит на клиньях */
export const CONNECTION_PHASES = ["slips", "breakTD", "tdUp", "latch", "lift", "stab", "makeup", "tdConnect", "release"] as const;
export const SLIPS_SET_PHASES = ["slips", "breakTD", "tdUp", "latch", "lift", "stab", "makeup", "tdConnect"] as const;

/** Скорости движения СВП и колонны в фазах (эталон Wm) */
export const KINEMATICS = {
  drillDescent: 1.15,
  drillRotation: 6.5,
  breakReverseRotation: 2.6,
  breakReverseSeconds: 1.5,
  breakLift: 0.55,
  tdUpSpeed: 5.5,
  makeupSpinStart: 0.8,
  makeupSpinEnd: 2.8,
  makeupSpinRate: 7,
  tdConnectRotation: 5,
  tdAutoCasingDelay: 4,
  completeAutoMoveDelay: 3,
  pumpRampRate: 1.5,
  alarmLiftSpeed: 0.55,
} as const;

/** Слои разреза (oS): [кровля, подошва, цвет, название] — м сцены */
export const STRATA: [number, number, number, string][] = [
  [-0.66, -8, 10127979, "Четвертичные отложения, ММП"],
  [-8, -32, 8878171, "Глины, пески"],
  [-32, -58, 10523764, "Песчаники (водоносный комплекс)"],
  [-58, -88, 7301726, "Глины, аргиллиты"],
  [-88, -98, 5722952, "Аргиллиты — покрышка"],
  [-98, -110, 4076070, "Продуктивный пласт (нефть)"],
  [-110, -128, 8023901, "Подстилающие породы"],
];

/** gS, lh — скважины куста */
export const TARGET_TVD = 104;
export const HOLE_DRAW_FROM = 60; // Pm

export type WellDefinition = { id: number; x: number; az: number; kop: number; h: number; initial: "done" | "plan" };

export const WELLS: WellDefinition[] = [
  { id: 1, x: -30, az: 158, kop: 48, h: 22, initial: "done" },
  { id: 2, x: -20, az: 128, kop: 56, h: 26, initial: "done" },
  { id: 3, x: -10, az: 102, kop: 42, h: 22, initial: "done" },
  { id: 4, x: 0, az: 0, kop: 70, h: 58, initial: "plan" },
  { id: 5, x: 10, az: 36, kop: 64, h: 30, initial: "plan" },
  { id: 6, x: 20, az: 63, kop: 68, h: 27, initial: "plan" },
  { id: 7, x: 30, az: 88, kop: 66, h: 25, initial: "plan" },
];
/** Y.S.wi — стартовая скважина (№4) */
export const START_WELL_INDEX = 3;
