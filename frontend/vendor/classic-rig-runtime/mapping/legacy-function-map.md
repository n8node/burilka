# Соответствие функций монолитной сцены и модулей пакета

Исходник: минифицированный `index.html` (three.js, одна сцена с двумя буровыми).
Имена слева — идентификаторы из минифицированного кода. Всё, что относится к роботизированной БУ
(`R:*`, роботы пола, режимы A/B, сравнение, `02_robotic_rig`), в пакет не перенесено.

Обозначения: **Было** — что делала функция в монолите; **Стало** — куда перенесена логика;
**Вход → выход** — данные новой функции; **Изменения** — сознательные отличия от эталона.

## Ядро симуляции и операции

| Эталон | Было | Стало | Вход → выход | Изменения поведения |
|---|---|---|---|---|
| `Y.S` | Глобальное состояние буровой: `op`, `phase`, `tdY`, `md`, `cs`, `pump`, `rot`… | `src/simulation/ClassicRigState.ts` → `ClassicRigState`, `createInitialState()` | конфиг → полное внутреннее состояние | Одно состояние на одну буровую; поля робота удалены; добавлены `estop`, `bop.manualClosed`, `kick.early`. Наружу отдаётся только `ClassicRigSnapshot` |
| `Wm` | Покадровый цикл наращивания: таблица фаз `bn`, переходы, бурение | `src/operations/drilling/drilling-operation.ts` (`DRILLING_PHASE_HANDLERS`), `drilling-phases.ts`, `drilling-config.ts` | `OperationContext`, `dt` → изменённое состояние, события фаз | Фазы описаны данными (`DRILLING_PHASES`: длительность, вращение, цель насосов, разрешённые в красной зоне люди). Длительности те же (`slips 2.2 … release 1.8`). Блокировка вращения при людях у ротора (`rotationInterlock`, по умолчанию вкл.) — дополнение |
| `H1` | Шаговые программы `To.*` (обсадка/цемент, ГНВП, переезд): `e.p += dt/dur`, `e.i++` | `src/simulation/PhaseMachine.ts` + `src/operations/{casing,cementing,tripping,kick,moving}/*-operation.ts` | шаги `{id,dur}`, `dt` → индекс/прогресс шага, события `phase_started/completed` | Программа обсадки разбита на три операции: `tripping=[pooh]`, `casing=[rigup,rih]`, `cementing=[circ…woc]`; цепочка сохранена (`next`). Цели насосов шага — `pumpTarget` в определении |
| `qS` | Завершение программы: возврат к бурению, автопереезд, следующий куст | `OperationRegistry` (`complete`, `next`) + `ClassicRigSimulation.startOperation()` | контекст → следующая операция | Переходы задаются полем `next` операции; `auto=false` останавливает цепочку после текущей операции |
| `lo` | Запуск программы (`casing`/`move`/`kick`) с проверками | `ClassicRigSimulation.dispatch({type:"select_operation"})` → `requestOperation()` → `startOperation()` | команда → событие `operation_started` или `command_rejected` | Недоступная команда не игнорируется молча: пишется `command_rejected` (ошибка порядка в телеметрии) |
| `Pf` | Сброс площадки на новый куст (свечи, x=0, скважины) | `ClassicRigSimulation.resetPad()` | — → состояние «куст заново» | без изменений по смыслу |
| `fh` | Доступность кнопок операций | `canStartOperation()` + `checkRequirements()` в `src/simulation/OperationRegistry.ts`, поле `requirements` операций | id операции → `{ok, reason}` | Причина отказа возвращается текстом |
| `ZS`, `If`, `N1`, `O1`, `z1` | Создание/возврат свечи, перенос свечи из подсвечника | `src/operations/drilling/drilling-state.ts` (`takeStandFromSetback`, `returnStandToSetback`, `abortConnection`), `src/equipment/racker-controller.ts` | состояние → `StandTransfer` | Свеча — отдельная сущность `standTransfer` в снимке, слот подсвечника пустеет (тест `stand-transfer`) |
| `$S` | Кинематика наращивания: элеватор, клинья, АКБ, положение свечи | `src/operations/drilling/drilling-kinematics.ts` → `computeConnectionKinematics()` | состояние → `{pivot, elevator, slipsK, akb, elevatorClosed}` | Чистая функция без three.js |
| `RS`, `CS`, `PS`, `IS`, `T1`, `sd`, `we` | ГНВП: приток, тревога, герметизация, глушение, открытие; параметры раннего/визуального обнаружения | `src/operations/kick/*` (`kick-config.ts` — `KICK_PARAMS`, `kick-operation.ts`) | `dt`, флаг `early` → прирост объёма, давление, события `kick_detected/killed`, `bop_closed/opened` | Длительность притока 5/14 с — как в эталоне. Ручное открытие ПВО во время глушения — нарушение `bop_opened_during_well_control` |
| `Lf`, `Af`, `Za`, `XS`, `P1` | Переезд: подготовка, движение по рельсам, центровка; что едет вместе с буровой | `src/operations/moving/*`, `STATIONARY_ASSETS` в `equipment-registry.ts` | прогресс → `rigOffsetX` | Последнее устье — отказ с причиной вместо тоста |
| `lh`, `lr`, `ja` | Скважины куста (7 шт., старт №4), траектория (вертикаль → дуга `R=104−kop` → горизонталь), сводка по скважине | `src/well/depth-model.ts` (`WELL_GEOMETRY`, `trajectoryAt`), `well-state.ts`, `trajectory-state.ts` | md → `{x,y,z,tvd,inc}` | без изменений; масштаб `DEPTH_SCALE=25` |
| `Rl`, `vS`, `_1`, `DS` | Трубка траектории, газовая пачка | `src/well/trajectory-state.ts` (`trajectoryPolyline`, `gasSlug`) + `src/renderer/WellRenderer.ts` | md → полилиния/интервал | Геометрия строится в renderer процедурно |
| `ts`, `Rn`, `b1` | Видимые интервалы обсадки/цемента, пробка, давление | `src/well/casing-state.ts`, `src/operations/cementing/*` | прогресс → `{casingShoe, topOfCement, pressure, pumped}` | — |
| `Pl`, `MS`, `No` | Колонна в стволе, КНБК вдоль траектории | `src/well/drillstring-state.ts` (`BHA_COMPONENTS`) + `WellRenderer` | md → сегменты колонны/КНБК | КНБК рисуется процедурно (GLB `bha` не используется: в нём снимок позы) |

## Агрегаты

| Эталон | Было | Стало | Вход → выход | Изменения поведения |
|---|---|---|---|---|
| `Qe` | Реестр групп сцены `"A:*"`, `"W:*"`, `"R:*"` | `src/equipment/equipment-registry.ts` (`EQUIPMENT`), `equipment-bindings.ts` (`CLASSIC_RIG_ASSETS`) | — | Только `A:*` классической БУ и `W:*`; `R:*` удалены |
| `U1` | Покадровое обновление агрегатов: ротор, клинья, АКБ, стол, свеча, флот | `src/equipment/*-controller.ts`, `equipment-state.ts` (`computeEquipment`) | состояние → `EquipmentSnapshot[]` (`state`, `rpm`, `flow`, `kinematics`) | Клинья считаются в системе ротора и **не вращаются** с ним; стол ротора следует колонне только при открытых клиньях (`rotaryTableFollowsString`, дополнение) |
| `Ef` | СВП, талевый блок, канаты, барабан, грязевые насосы, шланг | `topdrive-controller.ts`, `travel-controller.ts`, `drawworks-controller.ts`, `mudpump-controller.ts`, `kellyHosePoints()` | `tdY`, `pump`, `t` → смещения деталей | Корпус насоса неподвижен, двигаются 6 штоков (`pumpRods z = z0 + sin(9t+φ)·0.25·pump`) |
| `LS`, `ES`, `AS` | Цементировочный флот: появление, подъезд, работа | `src/equipment/cement-fleet-controller.ts`, `casing-program.ts` (`programVisuals`) | шаг программы → видимость/положение машин | Флот скрыт вне программы обсадки/цементирования; на бурении у манифольда транспорта нет (тест `cement-fleet`) |
| `DS` (ПВО) | Плашки, универсальный превентор, индикаторы | `src/equipment/bop-controller.ts` | `bop.closed` (0…1) → смещения плашек | Ручное закрытие/открытие — 1.5 с; закрытие при вращении — нарушение |

## Персонажи

| Эталон | Было | Стало | Вход → выход | Изменения поведения |
|---|---|---|---|---|
| `vs`, `Tn`, `An` | Массив персонажей, стартовые задания, создание группы `W:*` | `src/workers/worker-registry.ts`, `worker-roles.ts`, `reference/workers-reference.ts` (`CLASSIC_WORKERS`) | — → `InternalWorker[]` | Только вахта классической БУ + мастер, ГТИ, механик, лаборант, электрик. Повар и вахта в городке исключены (нет в списке ID из ТЗ) |
| `J1` | Покадровое поведение всех персонажей | `src/workers/worker-runtime.ts` (`updateWorkers`) | состояние, фаза, ветер → события и условия безопасности | Возвращает данные, ничего не рисует |
| `rT` | Бурильщик у пульта | `worker-behaviors.ts` → `drillerBehavior` | фаза → поза/подпись | — |
| `Y1` | Помбуры у ротора | `worker-behaviors.ts` → `floorhandBehavior`, `FLOORHAND_TABLE` | фаза → точка/поза | Уходят из красной зоны до пуска вращения (`rotationInterlock`) |
| `lT` | Верховой | `worker-behaviors.ts` → `derrickmanBehavior` | фаза, ветер → поза | **Всегда на балконе**; при ветре ≥ 15 м/с ждёт (`wind_wait_*`) |
| `Ym`, `pS`, `ps`, `co`, `Rm` | Ходьба по ключевым точкам, задачи, шаг к цели | `worker-tasks.ts` (`stepTowards`, `runTaskList`), `worker-routes.ts` | маршрут, `dt` → позиция/курс | Переход на пол только по лестнице `STAIRS_UP/DOWN`; никого под буровой (тест `worker-levels`) |
| `Ll` | Сдвиг маршрута вместе с буровой | `worker-routes.ts` → `withRigOffset` | точка, `moveX` → точка | — |
| `En`, `Bf` | Текущий шаг программы, подпись фазы для персонажей | `programStepKey()`, `phaseTitle()` в `ClassicRigSimulation` | — | — |
| `dS`, `id`, `Hr`, `fu`, `zo`, `G` | Процедурные позы: 30 каналов, библиотека поз, дыхание/покачивание | `src/workers/worker-poses.ts` (`POSE`, `poseToJoints`) | имя позы, t, фаза → углы суставов | Порт 1:1 по каналам `G`; суставы GLB названы (`pelvis`, `spine`, `hip_L`…) |
| `mS` | Смешивание поз | `src/workers/worker-animation.ts` | поза A/B, вес → каналы | При паузе позы замирают (в эталоне продолжали «дышать») |
| проверка опасной зоны (внутри `J1`) | Проверка «на полу и ближе 3.4 м к оси» | `src/workers/worker-safety.ts` | позиция → `inDanger` | Нарушение фиксируется только при вращении по фазе с `rotation: true` и без разрешения фазы |

## Окружение, звук, камера

| Эталон | Было | Стало | Вход → выход | Изменения поведения |
|---|---|---|---|---|
| `Fi`, `RT`, `VT` | Пресеты погоды, сглаживание ветра | `src/environment/weather.ts`, `reference/environment-reference.ts` | пресет, `dt` → ветер | — |
| `PT` | Автосезон по месяцу и широте | `src/environment/season.ts` (`autoSeason`) | месяц, широта → `summer/winter` | — |
| `kl`, `s0` | Положение солнца, время суток | `src/environment/lighting.ts` (`sunPosition`, `dayPhase`, `daylight`) | дата, координаты → высота/азимут | — |
| `gE` | Звуковая подсказка по ключу шага | `src/environment/sound.ts` (`SOUND_CUES`) + `simulation.onSound()` | ключ шага → id сигнала | Пакет выдаёт только id сигнала; синтез — забота приложения |
| `pE` | Инициализация WebAudio | не перенесено | — | Звуковой движок в чистую часть не входит (запрет `window`) |
| `yT`, `Nf`, `Of` | Ракурсы камеры, плавный перелёт | `src/renderer/CameraController.ts` (`CAMERA_VIEWS`) | id ракурса → позиция/цель | Ракурсов робота нет |
| `Q.flare` | Факел при ГНВП | `EnvironmentRenderer` + `snapshot.environment.flare` | — | — |

## Что не перенесено

* Всё про роботизированную БУ: группы `R:*`, роботы пола, режимы A/B и сравнение, ассеты `02_robotic_rig`.
* DOM-интерфейс монолита (панели, тосты, кнопки) — его заменяет приложение; пример — `examples/next-classic-rig`.
* WebAudio-синтез (`pE` и связанные функции).
* Снеговые шейдеры, живность и прочие декоративные эффекты окружения.
