/**
 * Привязки ассетов классической БУ — документация для интеграции.
 *
 * Источник истины — `src/equipment/equipment-bindings.ts` (сгенерирован из реальных GLB
 * `frontend/public/rig-glb/01_classic_rig/*.glb`, `rig-glb/03_camp/*.glb`, `rig-characters/*.glb`).
 * Этот файл реэкспортирует привязки и даёт сводку по каждому ассету: id, имя GLB, путь, назначение,
 * подвижные меши (роль, ось, pivot, исходная трансформация, как движется в эталоне) и ограничения.
 *
 * Как работает привязка:
 *  • у мешей в GLB нет имён → деталь находится по индексу узла glTF (`nodeIndex`) через
 *    `gltf.parser.associations` и проверяется сигнатурой (число вершин + bbox геометрии, допуск 2 мм);
 *  • если сигнатура не совпала (файл пересобран) — деталь НЕ анимируется и попадает в
 *    `BindingReport.rejected`; renderer продолжает работать со статичной моделью;
 *  • трансформации узлов в GLB записаны матрицей (`node.matrix`); `rootTransform: "matrix"` —
 *    у корня агрегата есть собственная матрица (СВП, талевый блок), её renderer сохраняет как базу;
 *  • оси: x/y/z — локальные оси узла; `radial` — движение клиньев к оси скважины в системе стола ротора.
 *
 * Сводка (подвижные детали; полные данные — ASSET_BINDING_DOCS ниже):
 * | assetId | GLB | назначение | подвижные меши |
 * |---|---|---|---|
 * | accumulator | accumulator.glb | Станция гидроуправления ПВО | — |
 * | bha | bha.glb | КНБК и долото | — |
 * | boiler | boiler.glb | Котельная (ПКН) | — |
 * | bop | bop.glb | Противовыбросовое оборудование | bop_ram×4 (piston, ось x); bop_annular×1 (body); bop_lamp×3 (lamp) |
 * | casing | casing.glb | Обсадные колонны (конструкция скважины) | — |
 * | catwalk | catwalk.glb | Приёмные мостки | — |
 * | cementFleet | cementFleet.glb | Цементировочный флот | fleet_vehicle×4 (body); fleet_hoses×1 (tool); cement_head×1 (tool) |
 * | centrifuge | centrifuge.glb | Центрифуга | centrifuge_bowl×1 (rotor, ось x) |
 * | choke | choke.glb | Манифольд дросселирования и глушения | — |
 * | cluster | cluster.glb | Устья скважин куста | wellhead_tree_template×8 (body) |
 * | compressor | compressor.glb | Компрессорная | — |
 * | crown | crown.glb | Кронблок | rope×10 (rope, ось y) |
 * | cuttings | cuttings.glb | Шламовый бункер (безамбарное бурение) | — |
 * | deadline | deadline.glb | Механизм крепления неподвижного конца | — |
 * | degasser | degasser.glb | Дегазатор | — |
 * | desander | desander.glb | Пескоотделитель и илоотделитель | — |
 * | doghouse | doghouse.glb | Кабина бурильщика | alarm_lamp×1 (lamp) |
 * | drawworks | drawworks.glb | Буровая лебёдка | drum×1 (drive, ось x) |
 * | drillstring | drillstring.glb | Бурильная колонна | drillstring×1 (rotor, ось y) |
 * | gensets | gensets.glb | ДЭС и склад ГСМ | — |
 * | gti | gti.glb | Станция ГТИ | — |
 * | mast | mast.glb | Вышка (мачта А-типа) | — |
 * | mudpumps | mudpumps.glb | Буровые насосы | piston×6 (piston, ось z) |
 * | piperack | piperack.glb | Стеллажи с трубами | — |
 * | rails | rails.glb | Эшелонная система перемещения | — |
 * | rotary | rotary.glb | Ротор (стол ротора) | slips×3 (slips, ось radial); rotary_table×2 (rotor, ось y) |
 * | roughneck | roughneck.glb | Буровой ключ (АКБ / гидроключ) | akb_arm×1 (tool, ось y); akb_roller×2 (drive, ось y) |
 * | setback | setback.glb | Подсвечник и балкон верхового | stand×24 (stand) |
 * | shakers | shakers.glb | Вибросита и жёлобная система | shaker_deck×2 (body, ось y) |
 * | standpipe | standpipe.glb | Манифольд, стояк и буровой рукав | kelly_hose×1 (tool) |
 * | substructure | substructure.glb | Основание (вышечный блок) | — |
 * | tanks | tanks.glb | Ёмкости ЦСГО и блок приготовления | — |
 * | topdrive | topdrive.glb | Верхний привод (СВП) | topdrive_root×1 (body, ось y); td_quill×1 (drive, ось y); links×1 (tool); elevator×1 (tool); elevator_lamp×1 (lamp) |
 * | trajectory | trajectory.glb | Траектории скважин куста | — |
 * | travel | travel.glb | Талевый блок и крюк | travel_root×1 (body, ось y) |
 * | vfd | vfd.glb | Электроблок (ЧРП, КТП, АСУ) | — |
 *
 * Не идентифицировано / не анимируется (см. limitations): отдельный кривошип насоса (в эталоне его нет —
 * двигаются штоки), КНБК/траектория (рисуются процедурно), powerslips и pipe racker на классике —
 * логические агрегаты без отдельной геометрии.
 */
export {
  CLASSIC_RIG_ASSETS,
  CAMP_ASSETS,
  CHARACTER_ASSETS,
  TABLET_PROP,
  assetById,
  partsOf,
  type ClassicRigAssetBinding,
  type MovablePartBinding,
  type PartSignature,
} from "../src/equipment/equipment-bindings";

export type AssetBindingDoc = {
  assetId: string;
  glb: string;
  /** путь относительно public/ (basePath добавляет AssetLoader) */
  path: string;
  equipmentId: string | null;
  purpose: string;
  rootTransform: "identity" | "matrix";
  movableMeshes: {
    part: string;
    role: string;
    axis: "x" | "y" | "z" | "radial" | null;
    count: number;
    nodeIndices: number[];
    pivot: [number, number, number] | null;
    /** исходная локальная позиция первого узла группы */
    restTranslation: [number, number, number];
    /** как деталь двигалась в эталоне */
    motion: string;
  }[];
  limitations: string[];
};

/** Человекочитаемая сводка по всем 36 ассетам буровой (сгенерирована из CLASSIC_RIG_ASSETS). */
export const ASSET_BINDING_DOCS: AssetBindingDoc[] = [
  {
    assetId: "accumulator",
    glb: "accumulator.glb",
    path: "rig-glb/01_classic_rig/accumulator.glb",
    equipmentId: "accumulator",
    purpose: "Станция гидроуправления ПВО",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "bha",
    glb: "bha.glb",
    path: "rig-glb/01_classic_rig/bha.glb",
    equipmentId: "bha",
    purpose: "КНБК и долото",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: [
      "КНБК в эталоне перестраивалась вдоль траектории (MS()); в GLB — снимок. Renderer рисует КНБК/долото процедурно в WellRenderer, сам GLB bha не анимируется.",
    ],
  },
  {
    assetId: "boiler",
    glb: "boiler.glb",
    path: "rig-glb/01_classic_rig/boiler.glb",
    equipmentId: null,
    purpose: "Котельная (ПКН)",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "bop",
    glb: "bop.glb",
    path: "rig-glb/01_classic_rig/bop.glb",
    equipmentId: "bop",
    purpose: "Противовыбросовое оборудование",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "bop_ram",
        role: "piston",
        axis: "x",
        count: 4,
        nodeIndices: [8, 10, 13, 15],
        pivot: null,
        restTranslation: [-2.35, 2.75, 0],
        motion: "L1[i] — гидроцилиндр плашек: x = x0 − sign(x0)·0.32·rams",
      },
      {
        part: "bop_annular",
        role: "body",
        axis: null,
        count: 1,
        nodeIndices: [17],
        pivot: null,
        restTranslation: [0, 5.85, 0],
        motion: "od — универсальный превентор: сжатие scale при закрытии",
      },
      {
        part: "bop_lamp",
        role: "lamp",
        axis: null,
        count: 3,
        nodeIndices: [26, 27, 28],
        pivot: null,
        restTranslation: [0.9, 2.75, 0.66],
        motion: "el[i] — индикаторы ПВО (зелёный/красный)",
      },
    ],
    limitations: [],
  },
  {
    assetId: "casing",
    glb: "casing.glb",
    path: "rig-glb/01_classic_rig/casing.glb",
    equipmentId: "casing",
    purpose: "Обсадные колонны (конструкция скважины)",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичные направление/кондуктор/промежуточная колонна (полупрозрачные). Эксплуатационная колонна рисуется процедурно."],
  },
  {
    assetId: "catwalk",
    glb: "catwalk.glb",
    path: "rig-glb/01_classic_rig/catwalk.glb",
    equipmentId: null,
    purpose: "Приёмные мостки",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "cementFleet",
    glb: "cementFleet.glb",
    path: "rig-glb/01_classic_rig/cementFleet.glb",
    equipmentId: "cementFleet",
    purpose: "Цементировочный флот",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "fleet_vehicle",
        role: "body",
        axis: null,
        count: 4,
        nodeIndices: [20, 41, 57, 77],
        pivot: null,
        restTranslation: [0, 0, 0],
        motion: "Mf[i].m — машина флота: позиция по маршруту ES(), видимость",
      },
      {
        part: "fleet_hoses",
        role: "tool",
        axis: null,
        count: 1,
        nodeIndices: [96],
        pivot: null,
        restTranslation: [0, 0, 0],
        motion: "hh — обвязка флота (видимость)",
      },
      {
        part: "cement_head",
        role: "tool",
        axis: null,
        count: 1,
        nodeIndices: [101],
        pivot: null,
        restTranslation: [0, 0, 0],
        motion: "So — цементировочная головка (видимость)",
      },
    ],
    limitations: ["Две машины ЦА-320 одинаковы по геометрии: узлы 20 и 41 взаимозаменяемы (порядок присвоен по индексу)."],
  },
  {
    assetId: "centrifuge",
    glb: "centrifuge.glb",
    path: "rig-glb/01_classic_rig/centrifuge.glb",
    equipmentId: "centrifuge",
    purpose: "Центрифуга",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "centrifuge_bowl",
        role: "rotor",
        axis: "x",
        count: 1,
        nodeIndices: [2],
        pivot: [18, 3.95, -20],
        restTranslation: [18, 3.95, -20],
        motion: "Y.cfBowl — барабан центрифуги",
      },
    ],
    limitations: [],
  },
  {
    assetId: "choke",
    glb: "choke.glb",
    path: "rig-glb/01_classic_rig/choke.glb",
    equipmentId: "choke",
    purpose: "Манифольд дросселирования и глушения",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "cluster",
    glb: "cluster.glb",
    path: "rig-glb/01_classic_rig/cluster.glb",
    equipmentId: null,
    purpose: "Устья скважин куста",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "wellhead_tree_template",
        role: "body",
        axis: null,
        count: 8,
        nodeIndices: [19, 20, 21, 22, 23, 24, 25, 26],
        pivot: null,
        restTranslation: [-10, 0.5, 0],
        motion:
          "фонтанная арматура устья x = −10: шаблон для клонирования на законченные устья (в GLB скрытые деревья i.trees[] не экспортированы)",
      },
    ],
    limitations: [
      "Фонтанная арматура для устьев 0/10/20/30 в эталоне была скрыта и не попала в GLB; renderer клонирует арматуру устья x = −10 (8 узлов-шаблонов).",
    ],
  },
  {
    assetId: "compressor",
    glb: "compressor.glb",
    path: "rig-glb/01_classic_rig/compressor.glb",
    equipmentId: null,
    purpose: "Компрессорная",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "crown",
    glb: "crown.glb",
    path: "rig-glb/01_classic_rig/crown.glb",
    equipmentId: "crown",
    purpose: "Кронблок",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "rope",
        role: "rope",
        axis: "y",
        count: 10,
        nodeIndices: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
        pivot: null,
        restTranslation: [-0.68, 43.531, 0],
        motion: "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
      },
    ],
    limitations: [],
  },
  {
    assetId: "cuttings",
    glb: "cuttings.glb",
    path: "rig-glb/01_classic_rig/cuttings.glb",
    equipmentId: "cuttings",
    purpose: "Шламовый бункер (безамбарное бурение)",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "deadline",
    glb: "deadline.glb",
    path: "rig-glb/01_classic_rig/deadline.glb",
    equipmentId: "deadline",
    purpose: "Механизм крепления неподвижного конца",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Подвижных деталей нет (в эталоне механизм неподвижного конца не анимировался)."],
  },
  {
    assetId: "degasser",
    glb: "degasser.glb",
    path: "rig-glb/01_classic_rig/degasser.glb",
    equipmentId: "degasser",
    purpose: "Дегазатор",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "desander",
    glb: "desander.glb",
    path: "rig-glb/01_classic_rig/desander.glb",
    equipmentId: "desander",
    purpose: "Пескоотделитель и илоотделитель",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "doghouse",
    glb: "doghouse.glb",
    path: "rig-glb/01_classic_rig/doghouse.glb",
    equipmentId: null,
    purpose: "Кабина бурильщика",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "alarm_lamp",
        role: "lamp",
        axis: null,
        count: 1,
        nodeIndices: [8],
        pivot: null,
        restTranslation: [-5.8, 11.65, 2.6],
        motion: "uh — маячок тревоги в будке бурильщика",
      },
    ],
    limitations: [],
  },
  {
    assetId: "drawworks",
    glb: "drawworks.glb",
    path: "rig-glb/01_classic_rig/drawworks.glb",
    equipmentId: "drawworks",
    purpose: "Буровая лебёдка",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "drum",
        role: "drive",
        axis: "x",
        count: 1,
        nodeIndices: [2],
        pivot: [0, 9.6, -4.8],
        restTranslation: [0, 9.6, -4.8],
        motion: "Y.drum — барабан лебёдки, rotation.x += (prevTd − tdY) × −1.6",
      },
    ],
    limitations: [],
  },
  {
    assetId: "drillstring",
    glb: "drillstring.glb",
    path: "rig-glb/01_classic_rig/drillstring.glb",
    equipmentId: "drillstring",
    purpose: "Бурильная колонна",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "drillstring",
        role: "rotor",
        axis: "y",
        count: 1,
        nodeIndices: [0],
        pivot: [0, 0, 0],
        restTranslation: [0, 17.156, 0],
        motion: "Y.string — колонна над устьем: scale.y, position.y, rotation.y",
      },
    ],
    limitations: ["Узор замков задан текстурой (KHR_texture_transform); повтор текстуры по длине обновляет renderer."],
  },
  {
    assetId: "gensets",
    glb: "gensets.glb",
    path: "rig-glb/01_classic_rig/gensets.glb",
    equipmentId: "gensets",
    purpose: "ДЭС и склад ГСМ",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "gti",
    glb: "gti.glb",
    path: "rig-glb/01_classic_rig/gti.glb",
    equipmentId: null,
    purpose: "Станция ГТИ",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "mast",
    glb: "mast.glb",
    path: "rig-glb/01_classic_rig/mast.glb",
    equipmentId: "mast",
    purpose: "Вышка (мачта А-типа)",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Подвижных деталей нет."],
  },
  {
    assetId: "mudpumps",
    glb: "mudpumps.glb",
    path: "rig-glb/01_classic_rig/mudpumps.glb",
    equipmentId: "mudpumps",
    purpose: "Буровые насосы",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "piston",
        role: "piston",
        axis: "z",
        count: 6,
        nodeIndices: [6, 7, 8, 20, 21, 22],
        pivot: null,
        restTranslation: [-17.8, 1, -20.973],
        motion: "Y.pumpRods[i].m — шток/поршень: z = z0 + sin(t·9 + ph)·0.25·pump; корпус насоса неподвижен",
      },
    ],
    limitations: [
      "В модели насоса нет отдельного кривошипа/шатуна: анимируются только 6 штоков-поршней (по 3 на насос). Корпус и приводная часть неподвижны.",
    ],
  },
  {
    assetId: "piperack",
    glb: "piperack.glb",
    path: "rig-glb/01_classic_rig/piperack.glb",
    equipmentId: null,
    purpose: "Стеллажи с трубами",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "rails",
    glb: "rails.glb",
    path: "rig-glb/01_classic_rig/rails.glb",
    equipmentId: null,
    purpose: "Эшелонная система перемещения",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "rotary",
    glb: "rotary.glb",
    path: "rig-glb/01_classic_rig/rotary.glb",
    equipmentId: "rotary",
    purpose: "Ротор (стол ротора)",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "slips",
        role: "slips",
        axis: "radial",
        count: 3,
        nodeIndices: [4, 5, 6],
        pivot: [0, 8.7, 0],
        restTranslation: [0.62, 8.86, 0],
        motion: "Y.slipsA[i] — клин ПКР: радиальный ход 0.62→0.2, подъём/опускание, поворот только при установке",
      },
      {
        part: "rotary_table",
        role: "rotor",
        axis: "y",
        count: 2,
        nodeIndices: [1, 2],
        pivot: [0, 8.7, 0],
        restTranslation: [0, 8.7, 0],
        motion: "диск стола ротора/вкладыш (в эталоне неподвижен; вращение — дополнение)",
      },
    ],
    limitations: [
      "В эталоне стол ротора неподвижен (бурение верхним приводом); вращение диска и вкладыша — дополнение (config.rotaryTableFollowsString).",
      "Клинья ПКР — дочерние узлы корня ротора, а не диска: со столом они не вращаются.",
    ],
  },
  {
    assetId: "roughneck",
    glb: "roughneck.glb",
    path: "rig-glb/01_classic_rig/roughneck.glb",
    equipmentId: "roughneck",
    purpose: "Буровой ключ (АКБ / гидроключ)",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "akb_arm",
        role: "tool",
        axis: "y",
        count: 1,
        nodeIndices: [7],
        pivot: [2.8, 8.2, -2.4],
        restTranslation: [2.8, 8.2, -2.4],
        motion: "Y.akb.piv — стрела ключа АКБ: rotation.y = lerp(park, work, akb)",
      },
      {
        part: "akb_roller",
        role: "drive",
        axis: "y",
        count: 2,
        nodeIndices: [4, 5],
        pivot: null,
        restTranslation: [-0.2, 0.25, 0.42],
        motion: "Y.akb.rollers[i] — ролики вращателя, вращаются при свинчивании 0.8–2.8 с",
      },
    ],
    limitations: [],
  },
  {
    assetId: "setback",
    glb: "setback.glb",
    path: "rig-glb/01_classic_rig/setback.glb",
    equipmentId: "setback",
    purpose: "Подсвечник и балкон верхового",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "stand",
        role: "stand",
        axis: null,
        count: 24,
        nodeIndices: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
        pivot: null,
        restTranslation: [2, 20.9, 0],
        motion: "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
      },
    ],
    limitations: [],
  },
  {
    assetId: "shakers",
    glb: "shakers.glb",
    path: "rig-glb/01_classic_rig/shakers.glb",
    equipmentId: "shakers",
    purpose: "Вибросита и жёлобная система",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "shaker_deck",
        role: "body",
        axis: "y",
        count: 2,
        nodeIndices: [5, 12],
        pivot: null,
        restTranslation: [0.4, 4.07, -19.6],
        motion: "Y.shakerDecks[i] — сетка вибросита: y = Je + 1.15 + sin(t·60)·0.02·pump",
      },
    ],
    limitations: [],
  },
  {
    assetId: "standpipe",
    glb: "standpipe.glb",
    path: "rig-glb/01_classic_rig/standpipe.glb",
    equipmentId: "standpipe",
    purpose: "Манифольд, стояк и буровой рукав",
    rootTransform: "identity",
    movableMeshes: [
      {
        part: "kelly_hose",
        role: "tool",
        axis: null,
        count: 1,
        nodeIndices: [7],
        pivot: null,
        restTranslation: [0, 0, 0],
        motion: "Y.hose — буровой рукав: геометрия перестраивается renderer'ом по точкам из snapshot",
      },
    ],
    limitations: ["Буровой рукав в GLB — снимок геометрии на момент экспорта; renderer заменяет её трубкой по точкам из snapshot."],
  },
  {
    assetId: "substructure",
    glb: "substructure.glb",
    path: "rig-glb/01_classic_rig/substructure.glb",
    equipmentId: null,
    purpose: "Основание (вышечный блок)",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "tanks",
    glb: "tanks.glb",
    path: "rig-glb/01_classic_rig/tanks.glb",
    equipmentId: "tanks",
    purpose: "Ёмкости ЦСГО и блок приготовления",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
  {
    assetId: "topdrive",
    glb: "topdrive.glb",
    path: "rig-glb/01_classic_rig/topdrive.glb",
    equipmentId: "topdrive",
    purpose: "Верхний привод (СВП)",
    rootTransform: "matrix",
    movableMeshes: [
      {
        part: "topdrive_root",
        role: "body",
        axis: "y",
        count: 1,
        nodeIndices: [60],
        pivot: null,
        restTranslation: [0, 34.312, 0],
        motion: "Y.u.topdrive (весь агрегат СВП движется по вертикали — это отдельный GLB)",
      },
      {
        part: "td_quill",
        role: "drive",
        axis: "y",
        count: 1,
        nodeIndices: [2],
        pivot: [0, 0, 0],
        restTranslation: [0, 0, 0],
        motion: "Y.tdRot — вал/ствол СВП, вращение вокруг оси скважины",
      },
      {
        part: "links",
        role: "tool",
        axis: null,
        count: 1,
        nodeIndices: [22],
        pivot: [0, 1.2, 0],
        restTranslation: [0, 1.2, 0],
        motion: "Y.links — штропы (кватернион из положения элеватора)",
      },
      {
        part: "elevator",
        role: "tool",
        axis: null,
        count: 1,
        nodeIndices: [21],
        pivot: [0, -2.05, 0],
        restTranslation: [0, -2.05, 0],
        motion: "Y.elev — элеватор (обратный кватернион штропов)",
      },
      {
        part: "elevator_lamp",
        role: "lamp",
        axis: null,
        count: 1,
        nodeIndices: [20],
        pivot: null,
        restTranslation: [0.3, 0.05, 0.3],
        motion: "Y.elevLamp — индикатор защёлки элеватора (зелёный/оранжевый)",
      },
    ],
    limitations: ["СВП движется целиком по вертикали (отдельный GLB); вращается только вал (td_quill)."],
  },
  {
    assetId: "trajectory",
    glb: "trajectory.glb",
    path: "rig-glb/01_classic_rig/trajectory.glb",
    equipmentId: "trajectory",
    purpose: "Траектории скважин куста",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: [
      "Статичные траектории скважин (снимок на момент экспорта). Текущий ствол, колонна, цемент и пачка газа рисуются процедурно в WellRenderer.",
    ],
  },
  {
    assetId: "travel",
    glb: "travel.glb",
    path: "rig-glb/01_classic_rig/travel.glb",
    equipmentId: "travel",
    purpose: "Талевый блок и крюк",
    rootTransform: "matrix",
    movableMeshes: [
      {
        part: "travel_root",
        role: "body",
        axis: "y",
        count: 1,
        nodeIndices: [12],
        pivot: null,
        restTranslation: [0, 34.312, 0],
        motion: "Y.u.travel (весь талевый блок движется по вертикали — отдельный GLB)",
      },
    ],
    limitations: ["Талевый блок движется целиком (это отдельный GLB-агрегат), синхронно с СВП."],
  },
  {
    assetId: "vfd",
    glb: "vfd.glb",
    path: "rig-glb/01_classic_rig/vfd.glb",
    equipmentId: "vfd",
    purpose: "Электроблок (ЧРП, КТП, АСУ)",
    rootTransform: "identity",
    movableMeshes: [],
    limitations: ["Статичный ассет: подвижных деталей в эталоне нет."],
  },
];

/** Персонажи: один GLB на работника, суставы — именованные узлы, которыми управляет WorkerRenderer. */
export const CHARACTER_JOINTS = [
  "pelvis",
  "spine",
  "chest",
  "neck",
  "head",
  "hip_L",
  "knee_L",
  "ankle_L",
  "hip_R",
  "knee_R",
  "ankle_R",
  "shoulder_L",
  "elbow_L",
  "wrist_L",
  "shoulder_R",
  "elbow_R",
  "wrist_R",
] as const;
