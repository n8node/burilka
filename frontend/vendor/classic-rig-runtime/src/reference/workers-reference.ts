/**
 * Персонажи классической бригады и их маршруты — извлечено из эталона (An(...), aT, sT, gT, Z1, uT, qm).
 * Координаты — м сцены в системе куста. Точки ground-маршрутов на площадке буровой (x ≥ -62, z < 40)
 * смещаются вместе с буровой при переезде (эталон Ll()).
 */
import type { ClassicRigWorkerId, WorkerTaskKind } from "../types";
import { FLOOR_Y as O } from "./constants";

export type Pt3 = [number, number, number];

export type ReferenceTask =
  | { walk: Pt3[]; label: string; routeId: string; speed?: number }
  | { work: WorkerTaskKind; dur: number; face: [number, number]; label: string };

export type ReferenceWorker = {
  id: ClassicRigWorkerId;
  role: string;
  /** порядковый номер создания в эталоне → seed = order × 1.7 (влияет на позы и темп шага) */
  order: number;
  start: Pt3;
  heading?: number;
  helmetColor: number;
  suitColor?: number;
  behavior: "driller" | "floorhand" | "derrickman" | "tasks";
  idlePoint?: Pt3;
  workPoint?: Pt3;
  tasks?: ReferenceTask[];
  /** эталон: Tn[...].ti / .pos — с какой задачи и откуда персонаж стартует */
  initialTask?: number;
  initialPos?: Pt3;
};

/** ur — съезд с дороги из городка на площадку */
export const ROAD_JUNCTION: Pt3 = [-65, 0, 37];
/** Z1 — лестница: земля → рабочий пол (единственный переход между уровнями) */
export const STAIRS_UP: Pt3[] = [
  [-7.4, 0, 8.4],
  [-7.4, 0.2, 7],
  [-7.4, O, -0.8],
  [-6, O, -0.8],
  [-3.6, O, -0.8],
];
/** hT — лестница вниз */
export const STAIRS_DOWN: Pt3[] = [...STAIRS_UP].reverse();
/** Отрезок лестничного марша (для проверки «переход только по лестнице/мосткам на пол») */
export const STAIRS_FLIGHT = { x: -7.4, zGround: 7, zFloor: -0.8, halfWidth: 0.6 };
/** uT — от съезда к низу лестницы */
export const PAD_TO_STAIRS: Pt3[] = [
  [-20, 0, 22],
  [-8, 0, 14],
  [-7.4, 0, 8.4],
];
/** qm — спуск с пола по лестнице (маршрут сбора по тревоге) */
export const FLOOR_TO_GROUND: Pt3[] = [
  [-6, O, -0.8],
  [-7.4, O, -0.8],
  [-7.4, 0.2, 7],
  [-7.4, 0, 8.4],
];

/** sT — что делает бурильщик на каждом шаге ГНВП */
export const DRILLER_KICK_LABELS: Record<string, string> = {
  influx: "бурение · следит за параметрами",
  alarm: "«Выброс»: поднимает долото, останавливает насосы",
  shutin: "закрывает превентор со вспомогательного пульта",
  kill: "глушение: насос на малой подаче, давление на стояке",
  open: "открывает превентор, возобновляет бурение",
};

/** aT — позиции и действия помбуров по фазам наращивания: [точка [x,z] | null (у подсвечника), анимация, подпись] */
export type FloorhandSlot = [[number, number] | null, WorkerTaskKind, string];
export const FLOORHAND_TABLE: Record<"helper1_A" | "helper2_A", Record<string, FloorhandSlot>> = {
  helper1_A: {
    slips: [[-0.75, 0.65], "reach", "вставляет клинья ПКР в ротор"],
    breakTD: [[-0.75, 0.65], "look", "контролирует отворот СВП от колонны"],
    tdUp: [[-0.62, 0.5], "reach", "смазывает резьбу замка колонны"],
    latch: [[-0.75, 0.65], "look", "ждёт свечу у устья"],
    lift: [[-0.75, 0.65], "reach", "принимает свечу у устья"],
    stab: [[-0.75, 0.65], "reach", "стыкует ниппель свечи с замком"],
    makeup: [[-1.9, 1.7], "look", "вне зоны ключа АКБ, следит за свинчиванием"],
    tdConnect: [[-1.9, 1.7], "look", "ждёт соединения СВП со свечой"],
    release: [[-0.75, 0.65], "reach", "извлекает клинья"],
  },
  helper2_A: {
    slips: [[0.8, 0.75], "reach", "вставляет клинья ПКР в ротор"],
    breakTD: [null, "idle", "идёт к подсвечнику"],
    tdUp: [null, "look", "у подсвечника: ждёт, когда верховой заведёт свечу"],
    latch: [null, "reach", "страхует низ свечи на подсвечнике"],
    lift: [null, "reach", "заводит низ свечи на устье"],
    stab: [[0.8, 0.75], "reach", "придерживает свечу при стыковке"],
    makeup: [[0.7, 2.6], "look", "вне зоны ключа АКБ"],
    tdConnect: [[0.7, 2.6], "look", "ждёт соединения СВП со свечой"],
    release: [[0.8, 0.75], "reach", "извлекает клинья"],
  },
};

/** gT — места сбора по тревоге ГНВП */
export type KickMuster = { pts: Pt3[]; face: [number, number]; anim: WorkerTaskKind; label: string };
export const KICK_MUSTER: Partial<Record<ClassicRigWorkerId, KickMuster>> = {
  helper1_A: {
    pts: [[-2, O, 1.2], ...FLOOR_TO_GROUND, [2, 0, 11.5], [10.6, 0, 10.9]],
    face: [12, 9],
    anim: "wrench",
    label: "на манифольде дросселирования: регулирует давление в затрубье",
  },
  helper2_A: {
    pts: [[-1.5, O, 3.5], ...FLOOR_TO_GROUND, [-10, 0, 12.4]],
    face: [-12, 10],
    anim: "console",
    label: "у станции гидроуправления ПВО: давление в аккумуляторах",
  },
  mud_A: { pts: [[5.6, 0, -17.4]], face: [5.6, -20], anim: "write", label: "контроль объёма в ёмкостях, готовит утяжелённый раствор" },
  mech_A: { pts: [[-13.5, 0, -14.4]], face: [-10, -18], anim: "look", label: "у буровых насосов: готовит насос к глушению" },
  electric_A: { pts: [[-18, 0, 24]], face: [-14, 20], anim: "talk", label: "на месте сбора по тревоге" },
  gti: { pts: [[13.4, 0, 17]], face: [16, 16], anim: "write", label: "станция ГТИ: контроль газопоказаний" },
};

const HELMET_ORANGE = 15895592;
const HELMET_WHITE = 16777215;

export const CLASSIC_WORKERS: ReferenceWorker[] = [
  { id: "driller_A", role: "role_driller", order: 1, start: [-4.95, O, -1.6], heading: Math.PI / 2, helmetColor: HELMET_ORANGE, behavior: "driller" },
  { id: "helper1_A", role: "role_helper", order: 2, start: [-2, O, 2.8], helmetColor: HELMET_ORANGE, behavior: "floorhand", idlePoint: [-2, O, 2.8], workPoint: [-0.75, O, 0.65] },
  { id: "helper2_A", role: "role_helper", order: 3, start: [1, O, 4.7], helmetColor: HELMET_ORANGE, behavior: "floorhand", idlePoint: [1, O, 4.7], workPoint: [0.8, O, 0.75] },
  { id: "derrick_A", role: "role_derrick", order: 4, start: [5.2, 33, 1.2], heading: -Math.PI / 2, helmetColor: HELMET_ORANGE, behavior: "derrickman" },
  {
    id: "mech_A", role: "role_mech", order: 5, start: [-8.6, 0, 8.4], helmetColor: HELMET_ORANGE, behavior: "tasks",
    tasks: [
      { walk: [[-8.6, 0, -9.6], [-13.5, 0, -11], [-13.5, 0, -14.4]], label: "идёт к буровым насосам", routeId: "mech_to_pumps" },
      { work: "wrench", dur: 9, face: [-10, -18], label: "обслуживает насос: клапаны, сальники" },
      { walk: [[-26, 0, -13.4], [-33, 0, -14.4]], label: "идёт к ДЭС", routeId: "mech_to_gensets" },
      { work: "look", dur: 6, face: [-33, -20], label: "осматривает ДЭС, снимает моточасы" },
      { walk: [[-26, 0, -13.4], [-13.5, 0, -11], [-8.6, 0, -9.6], [-8.6, 0, 8.4]], label: "возвращается к буровой", routeId: "mech_back_to_stairs" },
      { work: "talk", dur: 5, face: [-7.4, 12], label: "короткая планёрка у лестницы" },
    ],
  },
  {
    id: "mud_A", role: "role_mud", order: 6, start: [-8.6, 0, 4], helmetColor: HELMET_ORANGE, behavior: "tasks", initialTask: 2, initialPos: [5.6, 0, -17.4],
    tasks: [
      { walk: [[-8.6, 0, -9.8], [5.2, 0, -9.8]], label: "идёт на ЦСГО", routeId: "mud_to_tanks" },
      { work: "look", dur: 5, face: [7.2, -9], label: "проверяет уровень в доливной ёмкости" },
      { walk: [[5.6, 0, -17.4]], label: "идёт к ёмкостям", routeId: "mud_to_tank_hatch" },
      { work: "write", dur: 7, face: [5.6, -20], label: "замеряет плотность и вязкость раствора" },
      { walk: [[14, 0, -17.4]], label: "идёт к дегазатору", routeId: "mud_to_degasser" },
      { work: "look", dur: 5, face: [13.6, -21.3], label: "проверяет работу дегазатора" },
      { walk: [[5.6, 0, -17.4], [5.2, 0, -9.8], [-8.6, 0, -9.8], [-8.6, 0, 4]], label: "возвращается к буровой", routeId: "mud_back" },
      { work: "idle", dur: 3, face: [0, 4], label: "ждёт у буровой" },
    ],
  },
  {
    id: "electric_A", role: "role_electric", order: 7, start: [-8.6, 0, 6.5], helmetColor: HELMET_ORANGE, suitColor: 4018015, behavior: "tasks", initialTask: 1, initialPos: [-21.6, 0, -14.8],
    tasks: [
      { walk: [[-8.6, 0, -9.4], [-20.5, 0, -13.6], [-21.6, 0, -14.8]], label: "идёт в электроблок", routeId: "electric_to_vfd" },
      { work: "write", dur: 8, face: [-23, -20], label: "снимает показания ЧРП, проверяет журнал аварий" },
      { walk: [[-20.5, 0, -13.6], [-8.6, 0, -9.4], [-8.6, 0, 6.5]], label: "возвращается к буровой", routeId: "electric_back" },
      { work: "look", dur: 5, face: [-12, 10], label: "проверяет станцию гидроуправления ПВО" },
    ],
  },
  {
    // Маршрут мастера — версия «одна классическая буровая» (без перехода на вторую установку).
    id: "master", role: "role_master", order: 10, start: [-95, 0, 46.4], helmetColor: HELMET_WHITE, suitColor: 2764598, behavior: "tasks",
    tasks: [
      { work: "write", dur: 6, face: [-95, 52], label: "готовит наряды-допуски у вагона мастера" },
      { walk: [[-95, 0, 37], [-88, 0, 37], ROAD_JUNCTION, ...PAD_TO_STAIRS, ...STAIRS_UP.slice(1), [-3.2, O, 3.9]], label: "идёт на буровую", routeId: "master_camp_to_floor" },
      { work: "write", dur: 8, face: [0, 0], label: "контролирует наращивание, проверяет журнал" },
      { walk: [[-3.6, O, -0.8], ...STAIRS_DOWN.slice(1), [-8, 0, 14], [-20, 0, 22], [-20, 0, 26], [10, 0, 24], [12.4, 0, 21.5]], label: "идёт на станцию ГТИ", routeId: "master_floor_to_gti" },
      { work: "talk", dur: 6, face: [16, 16], label: "сверяет с оператором ГТИ параметры бурения" },
      { walk: [[10, 0, 24], [-20, 0, 26], ROAD_JUNCTION, [-88, 0, 37], [-95, 0, 37], [-95, 0, 46.4]], label: "возвращается в вагон мастера", routeId: "master_gti_to_camp" },
    ],
  },
  {
    id: "gti", role: "role_gti", order: 14, start: [-88, 0, 35], helmetColor: HELMET_WHITE, suitColor: 10891816, behavior: "tasks", initialTask: 1, initialPos: [13.4, 0, 17],
    tasks: [
      { walk: [ROAD_JUNCTION, [-20, 0, 26], [10, 0, 24], [13.4, 0, 17]], label: "идёт на станцию ГТИ", routeId: "gti_camp_to_station" },
      { work: "write", dur: 10, face: [16, 16], label: "отбирает пробу шлама, сверяет газопоказания" },
      { walk: [[10, 0, 24], [-20, 0, 26], ROAD_JUNCTION, [-88, 0, 35]], label: "возвращается в городок", routeId: "gti_station_to_camp" },
      { work: "idle", dur: 4, face: [-100, 35], label: "отдыхает между отборами" },
    ],
  },
];
