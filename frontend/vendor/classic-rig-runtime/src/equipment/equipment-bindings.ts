/**
 * Явные привязки подвижных деталей к узлам GLB — СГЕНЕРИРОВАНО из реальных файлов
 * frontend/public/rig-glb/01_classic_rig/*.glb сопоставлением с эталонной сценой
 * (число вершин + габарит геометрии + позиция в агрегате). См. mapping/asset-bindings.ts.
 *
 * В GLB у мешей нет имён (GLTFExporter r128 не пишет пустые name), поэтому привязка идёт
 * по индексу узла glTF (json.nodes[i]) с проверочной сигнатурой. AssetLoader проверяет сигнатуру
 * и НЕ анимирует деталь, если она не совпала (например, файл пересобран).
 * Узлы трансформируются матрицей (node.matrix), а не TRS.
 */
import type { ClassicRigEquipmentId, Vec3 } from "../types";

export type MovablePartRole =
  | "body" | "rotor" | "piston" | "slips" | "stand" | "drive" | "rope" | "tool"
  /** расширение ТЗ: индикаторы */
  | "lamp";

export type PartSignature = { vertices: number; min: Vec3; max: Vec3 } | { childMeshes: number; childVertices: number[] };

export type MovablePartBinding = {
  nodeIndex: number;
  /** логическое имя, которое AssetLoader присваивает узлу (в GLB имён нет) */
  nodeName: string;
  part: string;
  index: number;
  equipmentId: ClassicRigEquipmentId | null;
  role: MovablePartRole;
  axis?: "x" | "y" | "z" | "radial";
  pivot?: Vec3;
  signature: PartSignature;
  restTranslation: Vec3;
  restMatrix: number[] | null;
  /** позиция детали в эталоне (локальная) */
  referencePosition: Vec3;
  /** откуда деталь в эталоне и как движется */
  ref: string;
  angle?: number;
  z0?: number;
  phase?: number;
  slot?: [number, number];
};

export type ClassicRigAssetBinding = {
  assetId: string;
  file: string;
  /** путь относительно public/ (без basePath) */
  path: string;
  equipmentId: ClassicRigEquipmentId | null;
  purpose: string;
  rootNode: number;
  rootMatrix: number[] | null;
  nodeCount: number;
  meshNodeCount: number;
  movableParts: MovablePartBinding[];
  limitations: string[];
};

export type CampAssetBinding = { assetId: string; file: string; path: string; purpose: string };
export type CharacterAssetBinding = { workerId: string; file: string; path: string; joints: Record<string, number> };

export const CLASSIC_RIG_ASSETS: ClassicRigAssetBinding[] = [
 {
  "assetId": "accumulator",
  "file": "accumulator.glb",
  "path": "rig-glb/01_classic_rig/accumulator.glb",
  "equipmentId": "accumulator",
  "purpose": "Станция гидроуправления ПВО",
  "rootNode": 30,
  "rootMatrix": null,
  "nodeCount": 31,
  "meshNodeCount": 30,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "bha",
  "file": "bha.glb",
  "path": "rig-glb/01_classic_rig/bha.glb",
  "equipmentId": "bha",
  "purpose": "КНБК и долото",
  "rootNode": 11,
  "rootMatrix": null,
  "nodeCount": 12,
  "meshNodeCount": 9,
  "movableParts": [],
  "limitations": [
   "КНБК в эталоне перестраивалась вдоль траектории (MS()); в GLB — снимок. Renderer рисует КНБК/долото процедурно в WellRenderer, сам GLB bha не анимируется."
  ]
 },
 {
  "assetId": "boiler",
  "file": "boiler.glb",
  "path": "rig-glb/01_classic_rig/boiler.glb",
  "equipmentId": null,
  "purpose": "Котельная (ПКН)",
  "rootNode": 39,
  "rootMatrix": null,
  "nodeCount": 40,
  "meshNodeCount": 36,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "bop",
  "file": "bop.glb",
  "path": "rig-glb/01_classic_rig/bop.glb",
  "equipmentId": "bop",
  "purpose": "Противовыбросовое оборудование",
  "rootNode": 121,
  "rootMatrix": null,
  "nodeCount": 122,
  "meshNodeCount": 117,
  "movableParts": [
   {
    "nodeIndex": 8,
    "nodeName": "bop.bop_ram_0",
    "part": "bop_ram",
    "index": 0,
    "equipmentId": "bop",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.18,
      -0.25,
      -0.18
     ],
     "max": [
      0.18,
      0.25,
      0.18
     ]
    },
    "restTranslation": [
     -2.35,
     2.75,
     0
    ],
    "restMatrix": [
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     0,
     0,
     0,
     1,
     0,
     -2.35,
     2.75,
     0,
     1
    ],
    "referencePosition": [
     -2.35,
     2.75,
     0
    ],
    "ref": "L1[i] — гидроцилиндр плашек: x = x0 − sign(x0)·0.32·rams",
    "axis": "x"
   },
   {
    "nodeIndex": 10,
    "nodeName": "bop.bop_ram_1",
    "part": "bop_ram",
    "index": 1,
    "equipmentId": "bop",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.18,
      -0.25,
      -0.18
     ],
     "max": [
      0.18,
      0.25,
      0.18
     ]
    },
    "restTranslation": [
     2.35,
     2.75,
     0
    ],
    "restMatrix": [
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     0,
     0,
     0,
     1,
     0,
     2.35,
     2.75,
     0,
     1
    ],
    "referencePosition": [
     2.35,
     2.75,
     0
    ],
    "ref": "L1[i] — гидроцилиндр плашек: x = x0 − sign(x0)·0.32·rams",
    "axis": "x"
   },
   {
    "nodeIndex": 13,
    "nodeName": "bop.bop_ram_2",
    "part": "bop_ram",
    "index": 2,
    "equipmentId": "bop",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.18,
      -0.25,
      -0.18
     ],
     "max": [
      0.18,
      0.25,
      0.18
     ]
    },
    "restTranslation": [
     -2.35,
     3.9,
     0
    ],
    "restMatrix": [
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     0,
     0,
     0,
     1,
     0,
     -2.35,
     3.9,
     0,
     1
    ],
    "referencePosition": [
     -2.35,
     3.9,
     0
    ],
    "ref": "L1[i] — гидроцилиндр плашек: x = x0 − sign(x0)·0.32·rams",
    "axis": "x"
   },
   {
    "nodeIndex": 15,
    "nodeName": "bop.bop_ram_3",
    "part": "bop_ram",
    "index": 3,
    "equipmentId": "bop",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.18,
      -0.25,
      -0.18
     ],
     "max": [
      0.18,
      0.25,
      0.18
     ]
    },
    "restTranslation": [
     2.35,
     3.9,
     0
    ],
    "restMatrix": [
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     0,
     0,
     0,
     1,
     0,
     2.35,
     3.9,
     0,
     1
    ],
    "referencePosition": [
     2.35,
     3.9,
     0
    ],
    "ref": "L1[i] — гидроцилиндр плашек: x = x0 − sign(x0)·0.32·rams",
    "axis": "x"
   },
   {
    "nodeIndex": 17,
    "nodeName": "bop.bop_annular",
    "part": "bop_annular",
    "index": 0,
    "equipmentId": "bop",
    "role": "body",
    "signature": {
     "vertices": 231,
     "min": [
      -0.92,
      0.0,
      -0.92
     ],
     "max": [
      0.92,
      0.92,
      0.92
     ]
    },
    "restTranslation": [
     0,
     5.85,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     5.85,
     0,
     1
    ],
    "referencePosition": [
     0,
     5.85,
     0
    ],
    "ref": "od — универсальный превентор: сжатие scale при закрытии"
   },
   {
    "nodeIndex": 26,
    "nodeName": "bop.bop_lamp_0",
    "part": "bop_lamp",
    "index": 0,
    "equipmentId": "bop",
    "role": "lamp",
    "signature": {
     "vertices": 24,
     "min": [
      -0.11,
      -0.11,
      -0.03
     ],
     "max": [
      0.11,
      0.11,
      0.03
     ]
    },
    "restTranslation": [
     0.9,
     2.75,
     0.66
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0.9,
     2.75,
     0.66,
     1
    ],
    "referencePosition": [
     0.9,
     2.75,
     0.66
    ],
    "ref": "el[i] — индикаторы ПВО (зелёный/красный)"
   },
   {
    "nodeIndex": 27,
    "nodeName": "bop.bop_lamp_1",
    "part": "bop_lamp",
    "index": 1,
    "equipmentId": "bop",
    "role": "lamp",
    "signature": {
     "vertices": 24,
     "min": [
      -0.11,
      -0.11,
      -0.03
     ],
     "max": [
      0.11,
      0.11,
      0.03
     ]
    },
    "restTranslation": [
     0.9,
     3.9,
     0.66
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0.9,
     3.9,
     0.66,
     1
    ],
    "referencePosition": [
     0.9,
     3.9,
     0.66
    ],
    "ref": "el[i] — индикаторы ПВО (зелёный/красный)"
   },
   {
    "nodeIndex": 28,
    "nodeName": "bop.bop_lamp_2",
    "part": "bop_lamp",
    "index": 2,
    "equipmentId": "bop",
    "role": "lamp",
    "signature": {
     "vertices": 24,
     "min": [
      -0.11,
      -0.11,
      -0.03
     ],
     "max": [
      0.11,
      0.11,
      0.03
     ]
    },
    "restTranslation": [
     0.9,
     5.15,
     0.95
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0.9,
     5.15,
     0.95,
     1
    ],
    "referencePosition": [
     0.9,
     5.15,
     0.95
    ],
    "ref": "el[i] — индикаторы ПВО (зелёный/красный)"
   }
  ],
  "limitations": []
 },
 {
  "assetId": "casing",
  "file": "casing.glb",
  "path": "rig-glb/01_classic_rig/casing.glb",
  "equipmentId": "casing",
  "purpose": "Обсадные колонны (конструкция скважины)",
  "rootNode": 9,
  "rootMatrix": null,
  "nodeCount": 10,
  "meshNodeCount": 9,
  "movableParts": [],
  "limitations": [
   "Статичные направление/кондуктор/промежуточная колонна (полупрозрачные). Эксплуатационная колонна рисуется процедурно."
  ]
 },
 {
  "assetId": "catwalk",
  "file": "catwalk.glb",
  "path": "rig-glb/01_classic_rig/catwalk.glb",
  "equipmentId": null,
  "purpose": "Приёмные мостки",
  "rootNode": 6,
  "rootMatrix": null,
  "nodeCount": 7,
  "meshNodeCount": 6,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "cementFleet",
  "file": "cementFleet.glb",
  "path": "rig-glb/01_classic_rig/cementFleet.glb",
  "equipmentId": "cementFleet",
  "purpose": "Цементировочный флот",
  "rootNode": 102,
  "rootMatrix": null,
  "nodeCount": 103,
  "meshNodeCount": 96,
  "movableParts": [
   {
    "nodeIndex": 20,
    "nodeName": "cementFleet.fleet_vehicle_0",
    "part": "fleet_vehicle",
    "index": 0,
    "equipmentId": "cementFleet",
    "role": "body",
    "signature": {
     "childMeshes": 20,
     "childVertices": [
      24,
      124,
      124,
      124,
      124,
      124,
      124,
      24,
      24,
      24,
      24,
      24,
      124,
      124,
      124,
      24,
      124,
      124,
      124,
      24
     ]
    },
    "restTranslation": [
     0,
     0,
     0
    ],
    "restMatrix": null,
    "referencePosition": [
     0,
     0,
     0
    ],
    "ref": "Mf[i].m — машина флота: позиция по маршруту ES(), видимость"
   },
   {
    "nodeIndex": 41,
    "nodeName": "cementFleet.fleet_vehicle_1",
    "part": "fleet_vehicle",
    "index": 1,
    "equipmentId": "cementFleet",
    "role": "body",
    "signature": {
     "childMeshes": 20,
     "childVertices": [
      24,
      124,
      124,
      124,
      124,
      124,
      124,
      24,
      24,
      24,
      24,
      24,
      124,
      124,
      124,
      24,
      124,
      124,
      124,
      24
     ]
    },
    "restTranslation": [
     0,
     0,
     0
    ],
    "restMatrix": null,
    "referencePosition": [
     0,
     0,
     0
    ],
    "ref": "Mf[i].m — машина флота: позиция по маршруту ES(), видимость"
   },
   {
    "nodeIndex": 57,
    "nodeName": "cementFleet.fleet_vehicle_2",
    "part": "fleet_vehicle",
    "index": 2,
    "equipmentId": "cementFleet",
    "role": "body",
    "signature": {
     "childMeshes": 15,
     "childVertices": [
      24,
      124,
      124,
      124,
      124,
      124,
      124,
      24,
      24,
      24,
      24,
      28,
      24,
      124,
      124
     ]
    },
    "restTranslation": [
     0,
     0,
     0
    ],
    "restMatrix": null,
    "referencePosition": [
     0,
     0,
     0
    ],
    "ref": "Mf[i].m — машина флота: позиция по маршруту ES(), видимость"
   },
   {
    "nodeIndex": 77,
    "nodeName": "cementFleet.fleet_vehicle_3",
    "part": "fleet_vehicle",
    "index": 3,
    "equipmentId": "cementFleet",
    "role": "body",
    "signature": {
     "childMeshes": 19,
     "childVertices": [
      24,
      124,
      124,
      124,
      124,
      124,
      124,
      24,
      124,
      24,
      124,
      24,
      124,
      24,
      124,
      24,
      124,
      24,
      124
     ]
    },
    "restTranslation": [
     0,
     0,
     0
    ],
    "restMatrix": null,
    "referencePosition": [
     0,
     0,
     0
    ],
    "ref": "Mf[i].m — машина флота: позиция по маршруту ES(), видимость"
   },
   {
    "nodeIndex": 96,
    "nodeName": "cementFleet.fleet_hoses",
    "part": "fleet_hoses",
    "index": 0,
    "equipmentId": "cementFleet",
    "role": "tool",
    "signature": {
     "childMeshes": 18,
     "childVertices": [
      64,
      64,
      221,
      64,
      64,
      221,
      64,
      64,
      221,
      64,
      64,
      64,
      64,
      64,
      221,
      221,
      221,
      221
     ]
    },
    "restTranslation": [
     0,
     0,
     0
    ],
    "restMatrix": null,
    "referencePosition": [
     0,
     0,
     0
    ],
    "ref": "hh — обвязка флота (видимость)"
   },
   {
    "nodeIndex": 101,
    "nodeName": "cementFleet.cement_head",
    "part": "cement_head",
    "index": 0,
    "equipmentId": "cementFleet",
    "role": "tool",
    "signature": {
     "childMeshes": 4,
     "childVertices": [
      24,
      124,
      124,
      24
     ]
    },
    "restTranslation": [
     0,
     0,
     0
    ],
    "restMatrix": null,
    "referencePosition": [
     0,
     0,
     0
    ],
    "ref": "So — цементировочная головка (видимость)"
   }
  ],
  "limitations": [
   "Две машины ЦА-320 одинаковы по геометрии: узлы 20 и 41 взаимозаменяемы (порядок присвоен по индексу)."
  ]
 },
 {
  "assetId": "centrifuge",
  "file": "centrifuge.glb",
  "path": "rig-glb/01_classic_rig/centrifuge.glb",
  "equipmentId": "centrifuge",
  "purpose": "Центрифуга",
  "rootNode": 5,
  "rootMatrix": null,
  "nodeCount": 6,
  "meshNodeCount": 5,
  "movableParts": [
   {
    "nodeIndex": 2,
    "nodeName": "centrifuge.centrifuge_bowl",
    "part": "centrifuge_bowl",
    "index": 0,
    "equipmentId": "centrifuge",
    "role": "rotor",
    "signature": {
     "vertices": 124,
     "min": [
      -0.42,
      -1.3,
      -0.42
     ],
     "max": [
      0.42,
      1.3,
      0.42
     ]
    },
    "restTranslation": [
     18,
     3.95,
     -20
    ],
    "restMatrix": [
     0.0,
     -0.73739,
     0.67546,
     0,
     -1.0,
     0.0,
     0.0,
     0,
     0,
     -0.67546,
     -0.73739,
     0,
     18,
     3.95,
     -20,
     1
    ],
    "referencePosition": [
     18,
     3.95,
     -20
    ],
    "ref": "Y.cfBowl — барабан центрифуги",
    "axis": "x",
    "pivot": [
     18,
     3.95,
     -20
    ]
   }
  ],
  "limitations": []
 },
 {
  "assetId": "choke",
  "file": "choke.glb",
  "path": "rig-glb/01_classic_rig/choke.glb",
  "equipmentId": "choke",
  "purpose": "Манифольд дросселирования и глушения",
  "rootNode": 40,
  "rootMatrix": null,
  "nodeCount": 41,
  "meshNodeCount": 40,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "cluster",
  "file": "cluster.glb",
  "path": "rig-glb/01_classic_rig/cluster.glb",
  "equipmentId": null,
  "purpose": "Устья скважин куста",
  "rootNode": 33,
  "rootMatrix": null,
  "nodeCount": 34,
  "meshNodeCount": 33,
  "movableParts": [
   {
    "nodeIndex": 19,
    "nodeName": "cluster.wellhead_tree_template_0",
    "part": "wellhead_tree_template",
    "index": 0,
    "equipmentId": null,
    "role": "body",
    "signature": {
     "vertices": 124,
     "min": [
      -0.35,
      -0.45,
      -0.35
     ],
     "max": [
      0.35,
      0.45,
      0.35
     ]
    },
    "restTranslation": [
     -10,
     0.5,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     -10,
     0.5,
     0,
     1
    ],
    "referencePosition": [
     -10,
     0.5,
     0
    ],
    "ref": "фонтанная арматура устья x = −10: шаблон для клонирования на законченные устья (в GLB скрытые деревья i.trees[] не экспортированы)"
   },
   {
    "nodeIndex": 20,
    "nodeName": "cluster.wellhead_tree_template_1",
    "part": "wellhead_tree_template",
    "index": 1,
    "equipmentId": null,
    "role": "body",
    "signature": {
     "vertices": 124,
     "min": [
      -0.13,
      -0.9,
      -0.13
     ],
     "max": [
      0.13,
      0.9,
      0.13
     ]
    },
    "restTranslation": [
     -10,
     1.9,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     -10,
     1.9,
     0,
     1
    ],
    "referencePosition": [
     -10,
     1.9,
     0
    ],
    "ref": "фонтанная арматура устья x = −10: шаблон для клонирования на законченные устья (в GLB скрытые деревья i.trees[] не экспортированы)"
   },
   {
    "nodeIndex": 21,
    "nodeName": "cluster.wellhead_tree_template_2",
    "part": "wellhead_tree_template",
    "index": 2,
    "equipmentId": null,
    "role": "body",
    "signature": {
     "vertices": 24,
     "min": [
      -0.2,
      -0.2,
      -0.2
     ],
     "max": [
      0.2,
      0.2,
      0.2
     ]
    },
    "restTranslation": [
     -10,
     1.4,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     -10,
     1.4,
     0,
     1
    ],
    "referencePosition": [
     -10,
     1.4,
     0
    ],
    "ref": "фонтанная арматура устья x = −10: шаблон для клонирования на законченные устья (в GLB скрытые деревья i.trees[] не экспортированы)"
   },
   {
    "nodeIndex": 22,
    "nodeName": "cluster.wellhead_tree_template_3",
    "part": "wellhead_tree_template",
    "index": 3,
    "equipmentId": null,
    "role": "body",
    "signature": {
     "vertices": 24,
     "min": [
      -0.2,
      -0.2,
      -0.2
     ],
     "max": [
      0.2,
      0.2,
      0.2
     ]
    },
    "restTranslation": [
     -10,
     2.4,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     -10,
     2.4,
     0,
     1
    ],
    "referencePosition": [
     -10,
     2.4,
     0
    ],
    "ref": "фонтанная арматура устья x = −10: шаблон для клонирования на законченные устья (в GLB скрытые деревья i.trees[] не экспортированы)"
   },
   {
    "nodeIndex": 23,
    "nodeName": "cluster.wellhead_tree_template_4",
    "part": "wellhead_tree_template",
    "index": 4,
    "equipmentId": null,
    "role": "body",
    "signature": {
     "vertices": 124,
     "min": [
      -0.11,
      -0.7,
      -0.11
     ],
     "max": [
      0.11,
      0.7,
      0.11
     ]
    },
    "restTranslation": [
     -10,
     2,
     0
    ],
    "restMatrix": [
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     0,
     0,
     0,
     1,
     0,
     -10,
     2,
     0,
     1
    ],
    "referencePosition": [
     -10,
     2,
     0
    ],
    "ref": "фонтанная арматура устья x = −10: шаблон для клонирования на законченные устья (в GLB скрытые деревья i.trees[] не экспортированы)"
   },
   {
    "nodeIndex": 24,
    "nodeName": "cluster.wellhead_tree_template_5",
    "part": "wellhead_tree_template",
    "index": 5,
    "equipmentId": null,
    "role": "body",
    "signature": {
     "vertices": 24,
     "min": [
      -0.175,
      -0.175,
      -0.175
     ],
     "max": [
      0.175,
      0.175,
      0.175
     ]
    },
    "restTranslation": [
     -9.3,
     2,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     -9.3,
     2,
     0,
     1
    ],
    "referencePosition": [
     -9.3,
     2,
     0
    ],
    "ref": "фонтанная арматура устья x = −10: шаблон для клонирования на законченные устья (в GLB скрытые деревья i.trees[] не экспортированы)"
   },
   {
    "nodeIndex": 25,
    "nodeName": "cluster.wellhead_tree_template_6",
    "part": "wellhead_tree_template",
    "index": 6,
    "equipmentId": null,
    "role": "body",
    "signature": {
     "vertices": 24,
     "min": [
      -0.175,
      -0.175,
      -0.175
     ],
     "max": [
      0.175,
      0.175,
      0.175
     ]
    },
    "restTranslation": [
     -10.7,
     2,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     -10.7,
     2,
     0,
     1
    ],
    "referencePosition": [
     -10.7,
     2,
     0
    ],
    "ref": "фонтанная арматура устья x = −10: шаблон для клонирования на законченные устья (в GLB скрытые деревья i.trees[] не экспортированы)"
   },
   {
    "nodeIndex": 26,
    "nodeName": "cluster.wellhead_tree_template_7",
    "part": "wellhead_tree_template",
    "index": 7,
    "equipmentId": null,
    "role": "body",
    "signature": {
     "vertices": 105,
     "min": [
      -0.21,
      -0.20473,
      -0.02598
     ],
     "max": [
      0.21,
      0.20473,
      0.02598
     ]
    },
    "restTranslation": [
     -10,
     2.95,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     -10,
     2.95,
     0,
     1
    ],
    "referencePosition": [
     -10,
     2.95,
     0
    ],
    "ref": "фонтанная арматура устья x = −10: шаблон для клонирования на законченные устья (в GLB скрытые деревья i.trees[] не экспортированы)"
   }
  ],
  "limitations": [
   "Фонтанная арматура для устьев 0/10/20/30 в эталоне была скрыта и не попала в GLB; renderer клонирует арматуру устья x = −10 (8 узлов-шаблонов)."
  ]
 },
 {
  "assetId": "compressor",
  "file": "compressor.glb",
  "path": "rig-glb/01_classic_rig/compressor.glb",
  "equipmentId": null,
  "purpose": "Компрессорная",
  "rootNode": 36,
  "rootMatrix": null,
  "nodeCount": 37,
  "meshNodeCount": 33,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "crown",
  "file": "crown.glb",
  "path": "rig-glb/01_classic_rig/crown.glb",
  "equipmentId": "crown",
  "purpose": "Кронблок",
  "rootNode": 20,
  "rootMatrix": null,
  "nodeCount": 21,
  "meshNodeCount": 20,
  "movableParts": [
   {
    "nodeIndex": 10,
    "nodeName": "crown.rope_0",
    "part": "rope",
    "index": 0,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     -0.68,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     -0.68,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     -0.68,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   },
   {
    "nodeIndex": 11,
    "nodeName": "crown.rope_1",
    "part": "rope",
    "index": 1,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     -0.53,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     -0.53,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     -0.53,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   },
   {
    "nodeIndex": 12,
    "nodeName": "crown.rope_2",
    "part": "rope",
    "index": 2,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     -0.38,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     -0.38,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     -0.38,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   },
   {
    "nodeIndex": 13,
    "nodeName": "crown.rope_3",
    "part": "rope",
    "index": 3,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     -0.23,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     -0.23,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     -0.23,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   },
   {
    "nodeIndex": 14,
    "nodeName": "crown.rope_4",
    "part": "rope",
    "index": 4,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     -0.08,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     -0.08,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     -0.08,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   },
   {
    "nodeIndex": 15,
    "nodeName": "crown.rope_5",
    "part": "rope",
    "index": 5,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     0.07,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     0.07,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     0.07,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   },
   {
    "nodeIndex": 16,
    "nodeName": "crown.rope_6",
    "part": "rope",
    "index": 6,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     0.22,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     0.22,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     0.22,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   },
   {
    "nodeIndex": 17,
    "nodeName": "crown.rope_7",
    "part": "rope",
    "index": 7,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     0.37,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     0.37,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     0.37,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   },
   {
    "nodeIndex": 18,
    "nodeName": "crown.rope_8",
    "part": "rope",
    "index": 8,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     0.52,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     0.52,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     0.52,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   },
   {
    "nodeIndex": 19,
    "nodeName": "crown.rope_9",
    "part": "rope",
    "index": 9,
    "equipmentId": "crown",
    "role": "rope",
    "signature": {
     "vertices": 40,
     "min": [
      -0.02598,
      -0.5,
      -0.03
     ],
     "max": [
      0.02598,
      0.5,
      0.03
     ]
    },
    "restTranslation": [
     0.67,
     43.53125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     5.5375,
     0,
     0,
     0,
     0,
     1,
     0,
     0.67,
     43.53125,
     0,
     1
    ],
    "referencePosition": [
     0.67,
     43.53125,
     0
    ],
    "ref": "Y.ropes[i] — струна талевого каната: scale.y и position.y от высоты блока",
    "axis": "y"
   }
  ],
  "limitations": []
 },
 {
  "assetId": "cuttings",
  "file": "cuttings.glb",
  "path": "rig-glb/01_classic_rig/cuttings.glb",
  "equipmentId": "cuttings",
  "purpose": "Шламовый бункер (безамбарное бурение)",
  "rootNode": 3,
  "rootMatrix": null,
  "nodeCount": 4,
  "meshNodeCount": 3,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "deadline",
  "file": "deadline.glb",
  "path": "rig-glb/01_classic_rig/deadline.glb",
  "equipmentId": "deadline",
  "purpose": "Механизм крепления неподвижного конца",
  "rootNode": 4,
  "rootMatrix": null,
  "nodeCount": 5,
  "meshNodeCount": 4,
  "movableParts": [],
  "limitations": [
   "Подвижных деталей нет (в эталоне механизм неподвижного конца не анимировался)."
  ]
 },
 {
  "assetId": "degasser",
  "file": "degasser.glb",
  "path": "rig-glb/01_classic_rig/degasser.glb",
  "equipmentId": "degasser",
  "purpose": "Дегазатор",
  "rootNode": 4,
  "rootMatrix": null,
  "nodeCount": 5,
  "meshNodeCount": 4,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "desander",
  "file": "desander.glb",
  "path": "rig-glb/01_classic_rig/desander.glb",
  "equipmentId": "desander",
  "purpose": "Пескоотделитель и илоотделитель",
  "rootNode": 15,
  "rootMatrix": null,
  "nodeCount": 16,
  "meshNodeCount": 15,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "doghouse",
  "file": "doghouse.glb",
  "path": "rig-glb/01_classic_rig/doghouse.glb",
  "equipmentId": null,
  "purpose": "Кабина бурильщика",
  "rootNode": 10,
  "rootMatrix": null,
  "nodeCount": 11,
  "meshNodeCount": 9,
  "movableParts": [
   {
    "nodeIndex": 8,
    "nodeName": "doghouse.alarm_lamp",
    "part": "alarm_lamp",
    "index": 0,
    "equipmentId": null,
    "role": "lamp",
    "signature": {
     "vertices": 117,
     "min": [
      -0.22,
      -0.22,
      -0.22
     ],
     "max": [
      0.22,
      0.22,
      0.22
     ]
    },
    "restTranslation": [
     -5.8,
     11.65,
     2.6
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     -5.8,
     11.65,
     2.6,
     1
    ],
    "referencePosition": [
     -5.8,
     11.65,
     2.6
    ],
    "ref": "uh — маячок тревоги в будке бурильщика"
   }
  ],
  "limitations": []
 },
 {
  "assetId": "drawworks",
  "file": "drawworks.glb",
  "path": "rig-glb/01_classic_rig/drawworks.glb",
  "equipmentId": "drawworks",
  "purpose": "Буровая лебёдка",
  "rootNode": 56,
  "rootMatrix": null,
  "nodeCount": 57,
  "meshNodeCount": 55,
  "movableParts": [
   {
    "nodeIndex": 2,
    "nodeName": "drawworks.drum",
    "part": "drum",
    "index": 0,
    "equipmentId": "drawworks",
    "role": "drive",
    "signature": {
     "vertices": 148,
     "min": [
      -0.66,
      -1.3,
      -0.66
     ],
     "max": [
      0.66,
      1.3,
      0.66
     ]
    },
    "restTranslation": [
     0,
     9.6,
     -4.8
    ],
    "restMatrix": [
     0,
     0.89605,
     -0.44395,
     0,
     -1.0,
     0,
     -0.0,
     0,
     0,
     0.44395,
     0.89605,
     0,
     0,
     9.6,
     -4.8,
     1
    ],
    "referencePosition": [
     0,
     9.6,
     -4.8
    ],
    "ref": "Y.drum — барабан лебёдки, rotation.x += (prevTd − tdY) × −1.6",
    "axis": "x",
    "pivot": [
     0,
     9.6,
     -4.8
    ]
   }
  ],
  "limitations": []
 },
 {
  "assetId": "drillstring",
  "file": "drillstring.glb",
  "path": "rig-glb/01_classic_rig/drillstring.glb",
  "equipmentId": "drillstring",
  "purpose": "Бурильная колонна",
  "rootNode": 1,
  "rootMatrix": null,
  "nodeCount": 2,
  "meshNodeCount": 1,
  "movableParts": [
   {
    "nodeIndex": 0,
    "nodeName": "drillstring.drillstring",
    "part": "drillstring",
    "index": 0,
    "equipmentId": "drillstring",
    "role": "rotor",
    "signature": {
     "vertices": 88,
     "min": [
      -0.09749,
      -0.5,
      -0.1
     ],
     "max": [
      0.09749,
      0.5,
      0.1
     ]
    },
    "restTranslation": [
     0,
     17.15625,
     0
    ],
    "restMatrix": [
     -0.05418,
     0,
     -0.99853,
     0,
     0,
     34.3125,
     0,
     0,
     0.99853,
     0,
     -0.05418,
     0,
     0,
     17.15625,
     0,
     1
    ],
    "referencePosition": [
     0,
     17.15625,
     0
    ],
    "ref": "Y.string — колонна над устьем: scale.y, position.y, rotation.y",
    "axis": "y",
    "pivot": [
     0,
     0,
     0
    ]
   }
  ],
  "limitations": [
   "Узор замков задан текстурой (KHR_texture_transform); повтор текстуры по длине обновляет renderer."
  ]
 },
 {
  "assetId": "gensets",
  "file": "gensets.glb",
  "path": "rig-glb/01_classic_rig/gensets.glb",
  "equipmentId": "gensets",
  "purpose": "ДЭС и склад ГСМ",
  "rootNode": 198,
  "rootMatrix": null,
  "nodeCount": 199,
  "meshNodeCount": 185,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "gti",
  "file": "gti.glb",
  "path": "rig-glb/01_classic_rig/gti.glb",
  "equipmentId": null,
  "purpose": "Станция ГТИ",
  "rootNode": 36,
  "rootMatrix": null,
  "nodeCount": 37,
  "meshNodeCount": 33,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "mast",
  "file": "mast.glb",
  "path": "rig-glb/01_classic_rig/mast.glb",
  "equipmentId": "mast",
  "purpose": "Вышка (мачта А-типа)",
  "rootNode": 273,
  "rootMatrix": null,
  "nodeCount": 274,
  "meshNodeCount": 270,
  "movableParts": [],
  "limitations": [
   "Подвижных деталей нет."
  ]
 },
 {
  "assetId": "mudpumps",
  "file": "mudpumps.glb",
  "path": "rig-glb/01_classic_rig/mudpumps.glb",
  "equipmentId": "mudpumps",
  "purpose": "Буровые насосы",
  "rootNode": 108,
  "rootMatrix": null,
  "nodeCount": 109,
  "meshNodeCount": 104,
  "movableParts": [
   {
    "nodeIndex": 6,
    "nodeName": "mudpumps.piston_0",
    "part": "piston",
    "index": 0,
    "equipmentId": "mudpumps",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.09,
      -0.45,
      -0.09
     ],
     "max": [
      0.09,
      0.45,
      0.09
     ]
    },
    "restTranslation": [
     -17.8,
     1,
     -20.97266
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     -17.8,
     1,
     -20.97266,
     1
    ],
    "referencePosition": [
     -17.8,
     1,
     -20.88672
    ],
    "ref": "Y.pumpRods[i].m — шток/поршень: z = z0 + sin(t·9 + ph)·0.25·pump; корпус насоса неподвижен",
    "axis": "z",
    "z0": -20.9,
    "phase": -2.09
   },
   {
    "nodeIndex": 7,
    "nodeName": "mudpumps.piston_1",
    "part": "piston",
    "index": 1,
    "equipmentId": "mudpumps",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.09,
      -0.45,
      -0.09
     ],
     "max": [
      0.09,
      0.45,
      0.09
     ]
    },
    "restTranslation": [
     -17,
     1,
     -20.65626
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     -17,
     1,
     -20.65626,
     1
    ],
    "referencePosition": [
     -17,
     1,
     -21.12334
    ],
    "ref": "Y.pumpRods[i].m — шток/поршень: z = z0 + sin(t·9 + ph)·0.25·pump; корпус насоса неподвижен",
    "axis": "z",
    "z0": -20.9,
    "phase": 0
   },
   {
    "nodeIndex": 8,
    "nodeName": "mudpumps.piston_2",
    "part": "piston",
    "index": 2,
    "equipmentId": "mudpumps",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.09,
      -0.45,
      -0.09
     ],
     "max": [
      0.09,
      0.45,
      0.09
     ]
    },
    "restTranslation": [
     -16.2,
     1,
     -21.06922
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     -16.2,
     1,
     -21.06922,
     1
    ],
    "referencePosition": [
     -16.2,
     1,
     -20.69165
    ],
    "ref": "Y.pumpRods[i].m — шток/поршень: z = z0 + sin(t·9 + ph)·0.25·pump; корпус насоса неподвижен",
    "axis": "z",
    "z0": -20.9,
    "phase": 2.09
   },
   {
    "nodeIndex": 20,
    "nodeName": "mudpumps.piston_3",
    "part": "piston",
    "index": 3,
    "equipmentId": "mudpumps",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.09,
      -0.45,
      -0.09
     ],
     "max": [
      0.09,
      0.45,
      0.09
     ]
    },
    "restTranslation": [
     -10.8,
     1,
     -20.97266
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     -10.8,
     1,
     -20.97266,
     1
    ],
    "referencePosition": [
     -10.8,
     1,
     -20.88672
    ],
    "ref": "Y.pumpRods[i].m — шток/поршень: z = z0 + sin(t·9 + ph)·0.25·pump; корпус насоса неподвижен",
    "axis": "z",
    "z0": -20.9,
    "phase": -2.09
   },
   {
    "nodeIndex": 21,
    "nodeName": "mudpumps.piston_4",
    "part": "piston",
    "index": 4,
    "equipmentId": "mudpumps",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.09,
      -0.45,
      -0.09
     ],
     "max": [
      0.09,
      0.45,
      0.09
     ]
    },
    "restTranslation": [
     -10,
     1,
     -20.65626
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     -10,
     1,
     -20.65626,
     1
    ],
    "referencePosition": [
     -10,
     1,
     -21.12334
    ],
    "ref": "Y.pumpRods[i].m — шток/поршень: z = z0 + sin(t·9 + ph)·0.25·pump; корпус насоса неподвижен",
    "axis": "z",
    "z0": -20.9,
    "phase": 0
   },
   {
    "nodeIndex": 22,
    "nodeName": "mudpumps.piston_5",
    "part": "piston",
    "index": 5,
    "equipmentId": "mudpumps",
    "role": "piston",
    "signature": {
     "vertices": 124,
     "min": [
      -0.09,
      -0.45,
      -0.09
     ],
     "max": [
      0.09,
      0.45,
      0.09
     ]
    },
    "restTranslation": [
     -9.2,
     1,
     -21.06922
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     -9.2,
     1,
     -21.06922,
     1
    ],
    "referencePosition": [
     -9.2,
     1,
     -20.69165
    ],
    "ref": "Y.pumpRods[i].m — шток/поршень: z = z0 + sin(t·9 + ph)·0.25·pump; корпус насоса неподвижен",
    "axis": "z",
    "z0": -20.9,
    "phase": 2.09
   }
  ],
  "limitations": [
   "В модели насоса нет отдельного кривошипа/шатуна: анимируются только 6 штоков-поршней (по 3 на насос). Корпус и приводная часть неподвижны."
  ]
 },
 {
  "assetId": "piperack",
  "file": "piperack.glb",
  "path": "rig-glb/01_classic_rig/piperack.glb",
  "equipmentId": null,
  "purpose": "Стеллажи с трубами",
  "rootNode": 42,
  "rootMatrix": null,
  "nodeCount": 43,
  "meshNodeCount": 42,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "rails",
  "file": "rails.glb",
  "path": "rig-glb/01_classic_rig/rails.glb",
  "equipmentId": null,
  "purpose": "Эшелонная система перемещения",
  "rootNode": 74,
  "rootMatrix": null,
  "nodeCount": 75,
  "meshNodeCount": 74,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "rotary",
  "file": "rotary.glb",
  "path": "rig-glb/01_classic_rig/rotary.glb",
  "equipmentId": "rotary",
  "purpose": "Ротор (стол ротора)",
  "rootNode": 7,
  "rootMatrix": null,
  "nodeCount": 8,
  "meshNodeCount": 7,
  "movableParts": [
   {
    "nodeIndex": 4,
    "nodeName": "rotary.slips_0",
    "part": "slips",
    "index": 0,
    "equipmentId": "powerslips",
    "role": "slips",
    "signature": {
     "vertices": 24,
     "min": [
      -0.1,
      -0.21,
      -0.065
     ],
     "max": [
      0.1,
      0.21,
      0.065
     ]
    },
    "restTranslation": [
     0.62,
     8.86,
     0
    ],
    "restMatrix": [
     0.0,
     1,
     0,
     0,
     -1,
     0.0,
     0,
     0,
     0,
     0,
     1,
     0,
     0.62,
     8.86,
     0,
     1
    ],
    "referencePosition": [
     0.62,
     8.86,
     0
    ],
    "ref": "Y.slipsA[i] — клин ПКР: радиальный ход 0.62→0.2, подъём/опускание, поворот только при установке",
    "axis": "radial",
    "pivot": [
     0,
     8.7,
     0
    ],
    "angle": 0
   },
   {
    "nodeIndex": 5,
    "nodeName": "rotary.slips_1",
    "part": "slips",
    "index": 1,
    "equipmentId": "powerslips",
    "role": "slips",
    "signature": {
     "vertices": 24,
     "min": [
      -0.1,
      -0.21,
      -0.065
     ],
     "max": [
      0.1,
      0.21,
      0.065
     ]
    },
    "restTranslation": [
     -0.30979,
     8.86,
     0.53706
    ],
    "restMatrix": [
     -0.0,
     1,
     0.0,
     0,
     0.49966,
     0,
     -0.86622,
     0,
     -0.86622,
     0,
     -0.49966,
     0,
     -0.30979,
     8.86,
     0.53706,
     1
    ],
    "referencePosition": [
     -0.30979,
     8.86,
     0.53706
    ],
    "ref": "Y.slipsA[i] — клин ПКР: радиальный ход 0.62→0.2, подъём/опускание, поворот только при установке",
    "axis": "radial",
    "pivot": [
     0,
     8.7,
     0
    ],
    "angle": 2.094
   },
   {
    "nodeIndex": 6,
    "nodeName": "rotary.slips_2",
    "part": "slips",
    "index": 2,
    "equipmentId": "powerslips",
    "role": "slips",
    "signature": {
     "vertices": 24,
     "min": [
      -0.1,
      -0.21,
      -0.065
     ],
     "max": [
      0.1,
      0.21,
      0.065
     ]
    },
    "restTranslation": [
     -0.31042,
     8.86,
     -0.53669
    ],
    "restMatrix": [
     0,
     1.0,
     -0.0,
     0,
     0.50068,
     0.0,
     0.86563,
     0,
     0.86563,
     0,
     -0.50068,
     0,
     -0.31042,
     8.86,
     -0.53669,
     1
    ],
    "referencePosition": [
     -0.31042,
     8.86,
     -0.53669
    ],
    "ref": "Y.slipsA[i] — клин ПКР: радиальный ход 0.62→0.2, подъём/опускание, поворот только при установке",
    "axis": "radial",
    "pivot": [
     0,
     8.7,
     0
    ],
    "angle": 4.188
   },
   {
    "nodeIndex": 1,
    "nodeName": "rotary.rotary_table_1",
    "part": "rotary_table",
    "index": 1,
    "equipmentId": "rotary",
    "role": "rotor",
    "signature": {
     "vertices": 172,
     "min": [
      -0.85,
      -0.06,
      -0.85
     ],
     "max": [
      0.85,
      0.06,
      0.85
     ]
    },
    "restTranslation": [
     0,
     8.7,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     8.7,
     0,
     1
    ],
    "referencePosition": [
     0,
     8.7,
     0
    ],
    "ref": "диск стола ротора/вкладыш (в эталоне неподвижен; вращение — дополнение)",
    "axis": "y",
    "pivot": [
     0,
     8.7,
     0
    ]
   },
   {
    "nodeIndex": 2,
    "nodeName": "rotary.rotary_table_2",
    "part": "rotary_table",
    "index": 2,
    "equipmentId": "rotary",
    "role": "rotor",
    "signature": {
     "vertices": 124,
     "min": [
      -0.36,
      -0.07,
      -0.36
     ],
     "max": [
      0.36,
      0.07,
      0.36
     ]
    },
    "restTranslation": [
     0,
     8.72,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     8.72,
     0,
     1
    ],
    "referencePosition": [
     0,
     8.72,
     0
    ],
    "ref": "диск стола ротора/вкладыш (в эталоне неподвижен; вращение — дополнение)",
    "axis": "y",
    "pivot": [
     0,
     8.7,
     0
    ]
   }
  ],
  "limitations": [
   "В эталоне стол ротора неподвижен (бурение верхним приводом); вращение диска и вкладыша — дополнение (config.rotaryTableFollowsString).",
   "Клинья ПКР — дочерние узлы корня ротора, а не диска: со столом они не вращаются."
  ]
 },
 {
  "assetId": "roughneck",
  "file": "roughneck.glb",
  "path": "rig-glb/01_classic_rig/roughneck.glb",
  "equipmentId": "roughneck",
  "purpose": "Буровой ключ (АКБ / гидроключ)",
  "rootNode": 8,
  "rootMatrix": null,
  "nodeCount": 9,
  "meshNodeCount": 6,
  "movableParts": [
   {
    "nodeIndex": 7,
    "nodeName": "roughneck.akb_arm",
    "part": "akb_arm",
    "index": 0,
    "equipmentId": "roughneck",
    "role": "tool",
    "signature": {
     "childMeshes": 1,
     "childVertices": [
      52
     ]
    },
    "restTranslation": [
     2.8,
     8.2,
     -2.4
    ],
    "restMatrix": [
     0.92573,
     0,
     -0.37818,
     0,
     0,
     1,
     0,
     0,
     0.37818,
     0,
     0.92573,
     0,
     2.8,
     8.2,
     -2.4,
     1
    ],
    "referencePosition": [
     2.8,
     8.2,
     -2.4
    ],
    "ref": "Y.akb.piv — стрела ключа АКБ: rotation.y = lerp(park, work, akb)",
    "axis": "y",
    "pivot": [
     2.8,
     8.2,
     -2.4
    ]
   },
   {
    "nodeIndex": 4,
    "nodeName": "roughneck.akb_roller_0",
    "part": "akb_roller",
    "index": 0,
    "equipmentId": "roughneck",
    "role": "drive",
    "signature": {
     "vertices": 64,
     "min": [
      -0.09511,
      -0.15,
      -0.1
     ],
     "max": [
      0.09511,
      0.15,
      0.1
     ]
    },
    "restTranslation": [
     -0.2,
     0.25,
     0.42
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     -0.2,
     0.25,
     0.42,
     1
    ],
    "referencePosition": [
     -0.2,
     0.25,
     0.42
    ],
    "ref": "Y.akb.rollers[i] — ролики вращателя, вращаются при свинчивании 0.8–2.8 с",
    "axis": "y"
   },
   {
    "nodeIndex": 5,
    "nodeName": "roughneck.akb_roller_1",
    "part": "akb_roller",
    "index": 1,
    "equipmentId": "roughneck",
    "role": "drive",
    "signature": {
     "vertices": 64,
     "min": [
      -0.09511,
      -0.15,
      -0.1
     ],
     "max": [
      0.09511,
      0.15,
      0.1
     ]
    },
    "restTranslation": [
     0.2,
     0.25,
     0.42
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0.2,
     0.25,
     0.42,
     1
    ],
    "referencePosition": [
     0.2,
     0.25,
     0.42
    ],
    "ref": "Y.akb.rollers[i] — ролики вращателя, вращаются при свинчивании 0.8–2.8 с",
    "axis": "y"
   }
  ],
  "limitations": []
 },
 {
  "assetId": "setback",
  "file": "setback.glb",
  "path": "rig-glb/01_classic_rig/setback.glb",
  "equipmentId": "setback",
  "purpose": "Подсвечник и балкон верхового",
  "rootNode": 47,
  "rootMatrix": null,
  "nodeCount": 48,
  "meshNodeCount": 47,
  "movableParts": [
   {
    "nodeIndex": 11,
    "nodeName": "setback.stand_0",
    "part": "stand",
    "index": 0,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2,
     20.9,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2,
     20.9,
     0,
     1
    ],
    "referencePosition": [
     2,
     20.9,
     0
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2,
     0
    ]
   },
   {
    "nodeIndex": 12,
    "nodeName": "setback.stand_1",
    "part": "stand",
    "index": 1,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2.6,
     20.9,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2.6,
     20.9,
     0,
     1
    ],
    "referencePosition": [
     2.6,
     20.9,
     0
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2.6,
     0
    ]
   },
   {
    "nodeIndex": 13,
    "nodeName": "setback.stand_2",
    "part": "stand",
    "index": 2,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.2,
     20.9,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.2,
     20.9,
     0,
     1
    ],
    "referencePosition": [
     3.2,
     20.9,
     0
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.2,
     0
    ]
   },
   {
    "nodeIndex": 14,
    "nodeName": "setback.stand_3",
    "part": "stand",
    "index": 3,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.8,
     20.9,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.8,
     20.9,
     0,
     1
    ],
    "referencePosition": [
     3.8,
     20.9,
     0
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.8,
     0
    ]
   },
   {
    "nodeIndex": 15,
    "nodeName": "setback.stand_4",
    "part": "stand",
    "index": 4,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2,
     20.9,
     0.58
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2,
     20.9,
     0.58,
     1
    ],
    "referencePosition": [
     2,
     20.9,
     0.58
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2,
     0.58
    ]
   },
   {
    "nodeIndex": 16,
    "nodeName": "setback.stand_5",
    "part": "stand",
    "index": 5,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2.6,
     20.9,
     0.58
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2.6,
     20.9,
     0.58,
     1
    ],
    "referencePosition": [
     2.6,
     20.9,
     0.58
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2.6,
     0.58
    ]
   },
   {
    "nodeIndex": 17,
    "nodeName": "setback.stand_6",
    "part": "stand",
    "index": 6,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.2,
     20.9,
     0.58
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.2,
     20.9,
     0.58,
     1
    ],
    "referencePosition": [
     3.2,
     20.9,
     0.58
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.2,
     0.58
    ]
   },
   {
    "nodeIndex": 18,
    "nodeName": "setback.stand_7",
    "part": "stand",
    "index": 7,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     4.4,
     20.9,
     0.58
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     4.4,
     20.9,
     0.58,
     1
    ],
    "referencePosition": [
     4.4,
     20.9,
     0.58
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     4.4,
     0.58
    ]
   },
   {
    "nodeIndex": 19,
    "nodeName": "setback.stand_8",
    "part": "stand",
    "index": 8,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2,
     20.9,
     1.16
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2,
     20.9,
     1.16,
     1
    ],
    "referencePosition": [
     2,
     20.9,
     1.16
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2,
     1.16
    ]
   },
   {
    "nodeIndex": 20,
    "nodeName": "setback.stand_9",
    "part": "stand",
    "index": 9,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2.6,
     20.9,
     1.16
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2.6,
     20.9,
     1.16,
     1
    ],
    "referencePosition": [
     2.6,
     20.9,
     1.16
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2.6,
     1.16
    ]
   },
   {
    "nodeIndex": 21,
    "nodeName": "setback.stand_10",
    "part": "stand",
    "index": 10,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.8,
     20.9,
     1.16
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.8,
     20.9,
     1.16,
     1
    ],
    "referencePosition": [
     3.8,
     20.9,
     1.16
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.8,
     1.16
    ]
   },
   {
    "nodeIndex": 22,
    "nodeName": "setback.stand_11",
    "part": "stand",
    "index": 11,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     4.4,
     20.9,
     1.16
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     4.4,
     20.9,
     1.16,
     1
    ],
    "referencePosition": [
     4.4,
     20.9,
     1.16
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     4.4,
     1.16
    ]
   },
   {
    "nodeIndex": 23,
    "nodeName": "setback.stand_12",
    "part": "stand",
    "index": 12,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2,
     20.9,
     1.74
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2,
     20.9,
     1.74,
     1
    ],
    "referencePosition": [
     2,
     20.9,
     1.74
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2,
     1.74
    ]
   },
   {
    "nodeIndex": 24,
    "nodeName": "setback.stand_13",
    "part": "stand",
    "index": 13,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.2,
     20.9,
     1.74
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.2,
     20.9,
     1.74,
     1
    ],
    "referencePosition": [
     3.2,
     20.9,
     1.74
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.2,
     1.74
    ]
   },
   {
    "nodeIndex": 25,
    "nodeName": "setback.stand_14",
    "part": "stand",
    "index": 14,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.8,
     20.9,
     1.74
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.8,
     20.9,
     1.74,
     1
    ],
    "referencePosition": [
     3.8,
     20.9,
     1.74
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.8,
     1.74
    ]
   },
   {
    "nodeIndex": 26,
    "nodeName": "setback.stand_15",
    "part": "stand",
    "index": 15,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     4.4,
     20.9,
     1.74
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     4.4,
     20.9,
     1.74,
     1
    ],
    "referencePosition": [
     4.4,
     20.9,
     1.74
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     4.4,
     1.74
    ]
   },
   {
    "nodeIndex": 27,
    "nodeName": "setback.stand_16",
    "part": "stand",
    "index": 16,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2.6,
     20.9,
     2.32
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2.6,
     20.9,
     2.32,
     1
    ],
    "referencePosition": [
     2.6,
     20.9,
     2.32
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2.6,
     2.32
    ]
   },
   {
    "nodeIndex": 28,
    "nodeName": "setback.stand_17",
    "part": "stand",
    "index": 17,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.2,
     20.9,
     2.32
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.2,
     20.9,
     2.32,
     1
    ],
    "referencePosition": [
     3.2,
     20.9,
     2.32
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.2,
     2.32
    ]
   },
   {
    "nodeIndex": 29,
    "nodeName": "setback.stand_18",
    "part": "stand",
    "index": 18,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.8,
     20.9,
     2.32
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.8,
     20.9,
     2.32,
     1
    ],
    "referencePosition": [
     3.8,
     20.9,
     2.32
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.8,
     2.32
    ]
   },
   {
    "nodeIndex": 30,
    "nodeName": "setback.stand_19",
    "part": "stand",
    "index": 19,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     4.4,
     20.9,
     2.32
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     4.4,
     20.9,
     2.32,
     1
    ],
    "referencePosition": [
     4.4,
     20.9,
     2.32
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     4.4,
     2.32
    ]
   },
   {
    "nodeIndex": 31,
    "nodeName": "setback.stand_20",
    "part": "stand",
    "index": 20,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2,
     20.9,
     2.9
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2,
     20.9,
     2.9,
     1
    ],
    "referencePosition": [
     2,
     20.9,
     2.9
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2,
     2.9
    ]
   },
   {
    "nodeIndex": 32,
    "nodeName": "setback.stand_21",
    "part": "stand",
    "index": 21,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     2.6,
     20.9,
     2.9
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2.6,
     20.9,
     2.9,
     1
    ],
    "referencePosition": [
     2.6,
     20.9,
     2.9
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     2.6,
     2.9
    ]
   },
   {
    "nodeIndex": 33,
    "nodeName": "setback.stand_22",
    "part": "stand",
    "index": 22,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.2,
     20.9,
     2.9
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.2,
     20.9,
     2.9,
     1
    ],
    "referencePosition": [
     3.2,
     20.9,
     2.9
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.2,
     2.9
    ]
   },
   {
    "nodeIndex": 34,
    "nodeName": "setback.stand_23",
    "part": "stand",
    "index": 23,
    "equipmentId": "setback",
    "role": "stand",
    "signature": {
     "vertices": 52,
     "min": [
      -0.065,
      -12.7,
      -0.065
     ],
     "max": [
      0.065,
      12.7,
      0.065
     ]
    },
    "restTranslation": [
     3.8,
     20.9,
     2.9
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     3.8,
     20.9,
     2.9,
     1
    ],
    "referencePosition": [
     3.8,
     20.9,
     2.9
    ],
    "ref": "Y.setStands[i] — свеча в подсвечнике; при переносе этот же узел перемещается (JS(bot, top))",
    "slot": [
     3.8,
     2.9
    ]
   }
  ],
  "limitations": []
 },
 {
  "assetId": "shakers",
  "file": "shakers.glb",
  "path": "rig-glb/01_classic_rig/shakers.glb",
  "equipmentId": "shakers",
  "purpose": "Вибросита и жёлобная система",
  "rootNode": 16,
  "rootMatrix": null,
  "nodeCount": 17,
  "meshNodeCount": 14,
  "movableParts": [
   {
    "nodeIndex": 5,
    "nodeName": "shakers.shaker_deck_0",
    "part": "shaker_deck",
    "index": 0,
    "equipmentId": "shakers",
    "role": "body",
    "signature": {
     "childMeshes": 4,
     "childVertices": [
      24,
      24,
      24,
      124
     ]
    },
    "restTranslation": [
     0.4,
     4.06994,
     -19.6
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0.4,
     4.06994,
     -19.6,
     1
    ],
    "referencePosition": [
     0.4,
     4.06696,
     -19.6
    ],
    "ref": "Y.shakerDecks[i] — сетка вибросита: y = Je + 1.15 + sin(t·60)·0.02·pump",
    "axis": "y"
   },
   {
    "nodeIndex": 12,
    "nodeName": "shakers.shaker_deck_1",
    "part": "shaker_deck",
    "index": 1,
    "equipmentId": "shakers",
    "role": "body",
    "signature": {
     "childMeshes": 4,
     "childVertices": [
      24,
      24,
      24,
      124
     ]
    },
    "restTranslation": [
     2.8,
     4.06994,
     -19.6
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     2.8,
     4.06994,
     -19.6,
     1
    ],
    "referencePosition": [
     2.8,
     4.06696,
     -19.6
    ],
    "ref": "Y.shakerDecks[i] — сетка вибросита: y = Je + 1.15 + sin(t·60)·0.02·pump",
    "axis": "y"
   }
  ],
  "limitations": []
 },
 {
  "assetId": "standpipe",
  "file": "standpipe.glb",
  "path": "rig-glb/01_classic_rig/standpipe.glb",
  "equipmentId": "standpipe",
  "purpose": "Манифольд, стояк и буровой рукав",
  "rootNode": 8,
  "rootMatrix": null,
  "nodeCount": 9,
  "meshNodeCount": 8,
  "movableParts": [
   {
    "nodeIndex": 7,
    "nodeName": "standpipe.kelly_hose",
    "part": "kelly_hose",
    "index": 0,
    "equipmentId": "standpipe",
    "role": "tool",
    "signature": {
     "vertices": 369,
     "min": [
      0.36476,
      24.46365,
      -1.23924
     ],
     "max": [
      1.94788,
      39.02219,
      1.20116
     ]
    },
    "restTranslation": [
     0,
     0,
     0
    ],
    "restMatrix": null,
    "referencePosition": [
     0,
     0,
     0
    ],
    "ref": "Y.hose — буровой рукав: геометрия перестраивается renderer'ом по точкам из snapshot"
   }
  ],
  "limitations": [
   "Буровой рукав в GLB — снимок геометрии на момент экспорта; renderer заменяет её трубкой по точкам из snapshot."
  ]
 },
 {
  "assetId": "substructure",
  "file": "substructure.glb",
  "path": "rig-glb/01_classic_rig/substructure.glb",
  "equipmentId": null,
  "purpose": "Основание (вышечный блок)",
  "rootNode": 187,
  "rootMatrix": null,
  "nodeCount": 188,
  "meshNodeCount": 181,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "tanks",
  "file": "tanks.glb",
  "path": "rig-glb/01_classic_rig/tanks.glb",
  "equipmentId": "tanks",
  "purpose": "Ёмкости ЦСГО и блок приготовления",
  "rootNode": 169,
  "rootMatrix": null,
  "nodeCount": 170,
  "meshNodeCount": 162,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 },
 {
  "assetId": "topdrive",
  "file": "topdrive.glb",
  "path": "rig-glb/01_classic_rig/topdrive.glb",
  "equipmentId": "topdrive",
  "purpose": "Верхний привод (СВП)",
  "rootNode": 60,
  "rootMatrix": [
   1,
   0,
   0,
   0,
   0,
   1,
   0,
   0,
   0,
   0,
   1,
   0,
   0,
   34.3125,
   0,
   1
  ],
  "nodeCount": 61,
  "meshNodeCount": 55,
  "movableParts": [
   {
    "nodeIndex": 60,
    "nodeName": "topdrive.topdrive_root",
    "part": "topdrive_root",
    "index": 0,
    "equipmentId": "topdrive",
    "role": "body",
    "signature": {
     "childMeshes": 23,
     "childVertices": [
      24,
      124,
      24,
      124,
      24,
      24,
      24,
      24,
      24,
      52,
      52,
      52,
      52,
      24,
      124,
      124,
      24,
      124,
      40,
      105,
      105,
      24,
      124
     ]
    },
    "restTranslation": [
     0,
     34.3125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     34.3125,
     0,
     1
    ],
    "referencePosition": [
     0,
     34.3125,
     0
    ],
    "ref": "Y.u.topdrive (весь агрегат СВП движется по вертикали — это отдельный GLB)",
    "axis": "y"
   },
   {
    "nodeIndex": 2,
    "nodeName": "topdrive.td_quill",
    "part": "td_quill",
    "index": 0,
    "equipmentId": "topdrive",
    "role": "drive",
    "signature": {
     "childMeshes": 2,
     "childVertices": [
      124,
      24
     ]
    },
    "restTranslation": [
     0,
     0,
     0
    ],
    "restMatrix": [
     -0.05418,
     0,
     -0.99853,
     0,
     0,
     1,
     0,
     0,
     0.99853,
     0,
     -0.05418,
     0,
     0,
     0,
     0,
     1
    ],
    "referencePosition": [
     0,
     0,
     0
    ],
    "ref": "Y.tdRot — вал/ствол СВП, вращение вокруг оси скважины",
    "axis": "y",
    "pivot": [
     0,
     0,
     0
    ]
   },
   {
    "nodeIndex": 22,
    "nodeName": "topdrive.links",
    "part": "links",
    "index": 0,
    "equipmentId": "racker",
    "role": "tool",
    "signature": {
     "childMeshes": 4,
     "childVertices": [
      52,
      221,
      52,
      221
     ]
    },
    "restTranslation": [
     0,
     1.2,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     1.2,
     0,
     1
    ],
    "referencePosition": [
     0,
     1.2,
     0
    ],
    "ref": "Y.links — штропы (кватернион из положения элеватора)",
    "pivot": [
     0,
     1.2,
     0
    ]
   },
   {
    "nodeIndex": 21,
    "nodeName": "topdrive.elevator",
    "part": "elevator",
    "index": 0,
    "equipmentId": "racker",
    "role": "tool",
    "signature": {
     "childMeshes": 3,
     "childVertices": [
      24,
      24,
      24
     ]
    },
    "restTranslation": [
     0,
     -2.05,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     -2.05,
     0,
     1
    ],
    "referencePosition": [
     0,
     -2.05,
     0
    ],
    "ref": "Y.elev — элеватор (обратный кватернион штропов)",
    "pivot": [
     0,
     -2.05,
     0
    ]
   },
   {
    "nodeIndex": 20,
    "nodeName": "topdrive.elevator_lamp",
    "part": "elevator_lamp",
    "index": 0,
    "equipmentId": "racker",
    "role": "lamp",
    "signature": {
     "vertices": 24,
     "min": [
      -0.06,
      -0.06,
      -0.03
     ],
     "max": [
      0.06,
      0.06,
      0.03
     ]
    },
    "restTranslation": [
     0.3,
     0.05,
     0.3
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0.3,
     0.05,
     0.3,
     1
    ],
    "referencePosition": [
     0.3,
     0.05,
     0.3
    ],
    "ref": "Y.elevLamp — индикатор защёлки элеватора (зелёный/оранжевый)"
   }
  ],
  "limitations": [
   "СВП движется целиком по вертикали (отдельный GLB); вращается только вал (td_quill)."
  ]
 },
 {
  "assetId": "trajectory",
  "file": "trajectory.glb",
  "path": "rig-glb/01_classic_rig/trajectory.glb",
  "equipmentId": "trajectory",
  "purpose": "Траектории скважин куста",
  "rootNode": 15,
  "rootMatrix": null,
  "nodeCount": 16,
  "meshNodeCount": 12,
  "movableParts": [],
  "limitations": [
   "Статичные траектории скважин (снимок на момент экспорта). Текущий ствол, колонна, цемент и пачка газа рисуются процедурно в WellRenderer."
  ]
 },
 {
  "assetId": "travel",
  "file": "travel.glb",
  "path": "rig-glb/01_classic_rig/travel.glb",
  "equipmentId": "travel",
  "purpose": "Талевый блок и крюк",
  "rootNode": 12,
  "rootMatrix": [
   1,
   0,
   0,
   0,
   0,
   1,
   0,
   0,
   0,
   0,
   1,
   0,
   0,
   34.3125,
   0,
   1
  ],
  "nodeCount": 13,
  "meshNodeCount": 12,
  "movableParts": [
   {
    "nodeIndex": 12,
    "nodeName": "travel.travel_root",
    "part": "travel_root",
    "index": 0,
    "equipmentId": "travel",
    "role": "body",
    "signature": {
     "childMeshes": 12,
     "childVertices": [
      24,
      24,
      148,
      148,
      148,
      148,
      148,
      124,
      24,
      24,
      124,
      231
     ]
    },
    "restTranslation": [
     0,
     34.3125,
     0
    ],
    "restMatrix": [
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     0,
     0,
     1,
     0,
     0,
     34.3125,
     0,
     1
    ],
    "referencePosition": [
     0,
     34.3125,
     0
    ],
    "ref": "Y.u.travel (весь талевый блок движется по вертикали — отдельный GLB)",
    "axis": "y"
   }
  ],
  "limitations": [
   "Талевый блок движется целиком (это отдельный GLB-агрегат), синхронно с СВП."
  ]
 },
 {
  "assetId": "vfd",
  "file": "vfd.glb",
  "path": "rig-glb/01_classic_rig/vfd.glb",
  "equipmentId": "vfd",
  "purpose": "Электроблок (ЧРП, КТП, АСУ)",
  "rootNode": 60,
  "rootMatrix": null,
  "nodeCount": 61,
  "meshNodeCount": 55,
  "movableParts": [],
  "limitations": [
   "Статичный ассет: подвижных деталей в эталоне нет."
  ]
 }
] as ClassicRigAssetBinding[];

export const CAMP_ASSETS: CampAssetBinding[] = [
 {
  "assetId": "camp_banya",
  "file": "banya.glb",
  "path": "rig-glb/03_camp/banya.glb",
  "purpose": "Баня-сушилка"
 },
 {
  "assetId": "camp_canteen",
  "file": "canteen.glb",
  "path": "rig-glb/03_camp/canteen.glb",
  "purpose": "Столовая"
 },
 {
  "assetId": "camp_living",
  "file": "living.glb",
  "path": "rig-glb/03_camp/living.glb",
  "purpose": "Жилые вагон-дома"
 },
 {
  "assetId": "camp_medic",
  "file": "medic.glb",
  "path": "rig-glb/03_camp/medic.glb",
  "purpose": "Медпункт"
 },
 {
  "assetId": "camp_office",
  "file": "office.glb",
  "path": "rig-glb/03_camp/office.glb",
  "purpose": "Вагон мастера (диспетчерская)"
 },
 {
  "assetId": "camp_power",
  "file": "power.glb",
  "path": "rig-glb/03_camp/power.glb",
  "purpose": "ДЭС и склад ГСМ"
 },
 {
  "assetId": "camp_vehicles",
  "file": "vehicles.glb",
  "path": "rig-glb/03_camp/vehicles.glb",
  "purpose": "Вахтовый транспорт"
 }
];

/** Персонажи классической бригады: суставы — именованные узлы GLB. */
export const CHARACTER_ASSETS: CharacterAssetBinding[] = [
 {
  "workerId": "driller_A",
  "file": "driller_A.glb",
  "path": "rig-characters/driller_A.glb",
  "joints": {
   "ankle_L": 10,
   "knee_L": 11,
   "hip_L": 12,
   "ankle_R": 21,
   "knee_R": 22,
   "hip_R": 23,
   "wrist_L": 36,
   "elbow_L": 37,
   "shoulder_L": 38,
   "wrist_R": 46,
   "elbow_R": 47,
   "shoulder_R": 48,
   "head": 60,
   "neck": 61,
   "chest": 62,
   "spine": 63,
   "pelvis": 64
  }
 },
 {
  "workerId": "helper1_A",
  "file": "helper1_A.glb",
  "path": "rig-characters/helper1_A.glb",
  "joints": {
   "ankle_L": 10,
   "knee_L": 11,
   "hip_L": 12,
   "ankle_R": 21,
   "knee_R": 22,
   "hip_R": 23,
   "wrist_L": 36,
   "elbow_L": 37,
   "shoulder_L": 38,
   "wrist_R": 46,
   "elbow_R": 47,
   "shoulder_R": 48,
   "head": 60,
   "neck": 61,
   "chest": 62,
   "spine": 63,
   "pelvis": 64
  }
 },
 {
  "workerId": "helper2_A",
  "file": "helper2_A.glb",
  "path": "rig-characters/helper2_A.glb",
  "joints": {
   "ankle_L": 10,
   "knee_L": 11,
   "hip_L": 12,
   "ankle_R": 21,
   "knee_R": 22,
   "hip_R": 23,
   "wrist_L": 36,
   "elbow_L": 37,
   "shoulder_L": 38,
   "wrist_R": 46,
   "elbow_R": 47,
   "shoulder_R": 48,
   "head": 60,
   "neck": 61,
   "chest": 62,
   "spine": 63,
   "pelvis": 64
  }
 },
 {
  "workerId": "derrick_A",
  "file": "derrick_A.glb",
  "path": "rig-characters/derrick_A.glb",
  "joints": {
   "ankle_L": 10,
   "knee_L": 11,
   "hip_L": 12,
   "ankle_R": 21,
   "knee_R": 22,
   "hip_R": 23,
   "wrist_L": 36,
   "elbow_L": 37,
   "shoulder_L": 38,
   "wrist_R": 46,
   "elbow_R": 47,
   "shoulder_R": 48,
   "head": 60,
   "neck": 61,
   "chest": 62,
   "spine": 63,
   "pelvis": 64
  }
 },
 {
  "workerId": "mech_A",
  "file": "mech_A.glb",
  "path": "rig-characters/mech_A.glb",
  "joints": {
   "ankle_L": 10,
   "knee_L": 11,
   "hip_L": 12,
   "ankle_R": 21,
   "knee_R": 22,
   "hip_R": 23,
   "wrist_L": 36,
   "elbow_L": 37,
   "shoulder_L": 38,
   "wrist_R": 46,
   "elbow_R": 47,
   "shoulder_R": 48,
   "head": 60,
   "neck": 61,
   "chest": 62,
   "spine": 63,
   "pelvis": 64
  }
 },
 {
  "workerId": "mud_A",
  "file": "mud_A.glb",
  "path": "rig-characters/mud_A.glb",
  "joints": {
   "ankle_L": 10,
   "knee_L": 11,
   "hip_L": 12,
   "ankle_R": 21,
   "knee_R": 22,
   "hip_R": 23,
   "wrist_L": 36,
   "elbow_L": 37,
   "shoulder_L": 38,
   "wrist_R": 46,
   "elbow_R": 47,
   "shoulder_R": 48,
   "head": 60,
   "neck": 61,
   "chest": 62,
   "spine": 63,
   "pelvis": 64
  }
 },
 {
  "workerId": "electric_A",
  "file": "electric_A.glb",
  "path": "rig-characters/electric_A.glb",
  "joints": {
   "ankle_L": 10,
   "knee_L": 11,
   "hip_L": 12,
   "ankle_R": 21,
   "knee_R": 22,
   "hip_R": 23,
   "wrist_L": 36,
   "elbow_L": 37,
   "shoulder_L": 38,
   "wrist_R": 46,
   "elbow_R": 47,
   "shoulder_R": 48,
   "head": 60,
   "neck": 61,
   "chest": 62,
   "spine": 63,
   "pelvis": 64
  }
 },
 {
  "workerId": "master",
  "file": "master.glb",
  "path": "rig-characters/master.glb",
  "joints": {
   "ankle_L": 10,
   "knee_L": 11,
   "hip_L": 12,
   "ankle_R": 21,
   "knee_R": 22,
   "hip_R": 23,
   "wrist_L": 36,
   "elbow_L": 37,
   "shoulder_L": 38,
   "wrist_R": 46,
   "elbow_R": 47,
   "shoulder_R": 48,
   "head": 60,
   "neck": 61,
   "chest": 62,
   "spine": 63,
   "pelvis": 64
  }
 },
 {
  "workerId": "gti",
  "file": "gti.glb",
  "path": "rig-characters/gti.glb",
  "joints": {
   "ankle_L": 10,
   "knee_L": 11,
   "hip_L": 12,
   "ankle_R": 21,
   "knee_R": 22,
   "hip_R": 23,
   "wrist_L": 36,
   "elbow_L": 37,
   "shoulder_L": 38,
   "wrist_R": 46,
   "elbow_R": 47,
   "shoulder_R": 48,
   "head": 60,
   "neck": 61,
   "chest": 62,
   "spine": 63,
   "pelvis": 64
  }
 }
];

export const TABLET_PROP = { file: "tablet.glb", path: "rig-characters/props/tablet.glb", attachTo: "wrist_L" } as const;

export const assetById = (id: string): ClassicRigAssetBinding | undefined => CLASSIC_RIG_ASSETS.find((a) => a.assetId === id);
export const partsOf = (assetId: string, part: string): MovablePartBinding[] =>
  (assetById(assetId)?.movableParts ?? []).filter((p) => p.part === part).sort((a, b) => a.index - b.index);
