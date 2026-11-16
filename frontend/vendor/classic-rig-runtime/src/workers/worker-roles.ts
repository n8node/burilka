/** Роли классической бригады (тексты карточек эталона). */
import { CARDS } from "../reference/operations-reference";

export const WORKER_ROLES = {
  role_driller: CARDS.role_driller?.name ?? "Бурильщик",
  role_helper: CARDS.role_helper?.name ?? "Помощник бурильщика",
  role_derrick: CARDS.role_derrick?.name ?? "Верховой рабочий",
  role_mech: CARDS.role_mech?.name ?? "Слесарь-дизелист",
  role_mud: CARDS.role_mud?.name ?? "Помбур на ЦСГО",
  role_electric: CARDS.role_electric?.name ?? "Электромонтёр",
  role_master: CARDS.role_master?.name ?? "Буровой мастер",
  role_gti: CARDS.role_gti?.name ?? "Оператор ГТИ",
} as const;
