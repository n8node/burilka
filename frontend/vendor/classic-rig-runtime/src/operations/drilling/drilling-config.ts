/** Параметры бурения и наращивания — значения эталона (bn, Wm, константы dh/cn/ws/I1). */
import {
  CONNECTION_DURATIONS,
  KINEMATICS,
  LINK_LENGTH,
  LINK_PIVOT_OFFSET,
  ROP_SCENE,
  STAND_LENGTH,
  STAND_TOP_OFFSET,
  START_MD,
  TD_BOTTOM,
  TD_LIFT_TOP,
  TD_STAB,
  TD_TOP,
} from "../../reference/constants";

export const DRILLING_CONFIG = {
  durations: CONNECTION_DURATIONS,
  kinematics: KINEMATICS,
  tdBottom: TD_BOTTOM,
  tdTop: TD_TOP,
  tdLiftTop: TD_LIFT_TOP,
  tdStab: TD_STAB,
  rop: ROP_SCENE,
  startMd: START_MD,
  standLength: STAND_LENGTH,
  linkLength: LINK_LENGTH,
  linkPivotOffset: LINK_PIVOT_OFFSET,
  standTopOffset: STAND_TOP_OFFSET,
  /** fh(): наращивание глубины перед обсадкой и ГНВП */
  minExtraDepthForCasing: 8,
  minExtraDepthForKick: 3,
  /** длительность вывода клиньев в release, после которой помбуры уходят (при rotationInterlock) */
  slipsOutSeconds: 1.2,
} as const;
