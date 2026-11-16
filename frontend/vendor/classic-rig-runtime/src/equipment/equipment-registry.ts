/**
 * Реестр агрегатов классической БУ (эталон: объект Qe с ключами "A:*").
 * Только классические агрегаты; роботов пола нет.
 */
import type { ClassicRigEquipmentId } from "../types";
import { CARDS } from "../reference/operations-reference";

export type EquipmentInfo = {
  id: ClassicRigEquipmentId;
  title: string;
  system: string;
  /** GLB-ассеты, в которых находятся детали агрегата */
  assets: string[];
  /** агрегат едет вместе с вышечным блоком при переезде (эталон Af / XS) */
  movesWithRig: boolean;
  note?: string;
};

const card = (id: string) => CARDS[id] ?? { name: id, sys: "" };

const info = (id: ClassicRigEquipmentId, assets: string[], movesWithRig = true, override?: Partial<EquipmentInfo>): EquipmentInfo => ({
  id,
  title: card(id).name,
  system: card(id).sys,
  assets,
  movesWithRig,
  ...override,
});

export const EQUIPMENT: Record<ClassicRigEquipmentId, EquipmentInfo> = {
  mast: info("mast", ["mast"]),
  crown: info("crown", ["crown"]),
  travel: info("travel", ["travel"]),
  topdrive: info("topdrive", ["topdrive"]),
  drawworks: info("drawworks", ["drawworks"]),
  deadline: info("deadline", ["deadline"]),
  rotary: info("rotary", ["rotary"]),
  powerslips: info("powerslips", ["rotary"], true, {
    title: "Клинья ПКР (в столе ротора)",
    system: "Вращение и инструмент",
    note: "На классической БУ клинья ручные (ПКР), это три детали внутри rotary.glb; отдельного агрегата нет.",
  }),
  roughneck: info("roughneck", ["roughneck"]),
  racker: info("racker", ["topdrive", "setback"], true, {
    title: "Перенос свечи: штропы, элеватор и верховой",
    system: "Подъёмная система",
    note: "На классической БУ манипулятора нет: свечу переносят элеватор СВП и верховой рабочий. Идентификатор racker сохранён по ТЗ.",
  }),
  setback: info("setback", ["setback"]),
  bop: info("bop", ["bop"]),
  accumulator: info("accumulator", ["accumulator"]),
  choke: info("choke", ["choke"]),
  mudpumps: info("mudpumps", ["mudpumps"]),
  standpipe: info("standpipe", ["standpipe"]),
  tanks: info("tanks", ["tanks"]),
  shakers: info("shakers", ["shakers"]),
  cuttings: info("cuttings", ["cuttings"]),
  desander: info("desander", ["desander"]),
  degasser: info("degasser", ["degasser"]),
  centrifuge: info("centrifuge", ["centrifuge"]),
  gensets: info("gensets", ["gensets"]),
  vfd: info("vfd", ["vfd"]),
  drillstring: info("drillstring", ["drillstring"]),
  casing: info("casing", ["casing"], false),
  bha: info("bha", ["bha"], false),
  trajectory: info("trajectory", ["trajectory"], false),
  cementFleet: info("cementFleet", ["cementFleet"], false, { note: "Флот едет из городка по маршруту ES(); группа флота смещена на rigX." }),
};

export const EQUIPMENT_IDS = Object.keys(EQUIPMENT) as ClassicRigEquipmentId[];

/** Статичные ассеты сцены, не являющиеся «агрегатами» в смысле ТЗ (рендерятся без анимации). */
export const STATIC_SCENERY_ASSETS = ["substructure", "doghouse", "catwalk", "compressor", "boiler", "gti", "piperack", "rails", "cluster"] as const;
/** Ассеты, которые не едут при переезде (эталон XS + трасса + флот). */
export const STATIONARY_ASSETS = new Set(["rails", "cluster", "casing", "bha", "trajectory", "cementFleet"]);
