# @rigintel/classic-rig-runtime

Управляемый TypeScript-runtime **классической буровой установки** вместо монолитной three.js-сцены.

Пакет разделён на две части:

| Часть | Импорт | Где работает | Что делает |
|---|---|---|---|
| Симуляция, операции, персонажи, телеметрия, экзамены | `@rigintel/classic-rig-runtime` | Node.js, браузер, SSR | Решает всё: фазы, агрегаты, где люди, нарушения, баллы. Без `react`/`three`/`next`/`window`/`document` (проверяется ESLint) |
| Renderer | `@rigintel/classic-rig-runtime/renderer` | только браузер | Загружает GLB, отображает `snapshot`. Ничего не решает |

Роботизированной буровой, роботов пола, режимов A/B, сравнения и ассетов `02_robotic_rig` в пакете нет — ни кода, ни заглушек.

## Структура

```
src/
  types.ts                  ID, команды, snapshot, события телеметрии, описания операций
  reference/                данные, извлечённые из эталона (константы, шаги, работники, погода)
  simulation/               ClassicRigSimulation, ClassicRigRuntime, PhaseMachine, OperationRegistry, команды, события
  operations/               drilling, tripping, casing, cementing, moving, kick — у каждой config / phases / operation
  equipment/                реестр агрегатов, GLB-привязки, контроллеры (СВП, ротор, клинья, насосы, АКБ, ПВО, флот…)
  workers/                  роли, позы, маршруты, задания, поведение, безопасность
  well/                     траектория, колонна, обсадка/цемент
  environment/              погода, сезон, освещение, звуковые сигналы (только id)
  telemetry/                журнал событий, агрегаты (время работы, нарушения, задержки, ошибки порядка)
  exams/                    определения, движок, оценка, баллы
  renderer/                 three.js: AssetLoader, Equipment/Worker/Well/Environment renderer, камера, ClassicRigSceneRuntime
tests/                      simulation, operations, equipment, workers, telemetry, exams (Vitest, Node)
mapping/
  legacy-function-map.md    функции монолита → новые модули, изменения поведения
  asset-bindings.ts         сводка по каждому GLB: подвижные меши, оси, pivot, исходные трансформации, ограничения
  extracted-reference-data.ts  операции, фазы, длительности, агрегаты, маршруты, позы, безопасность, переходы, аварии, умолчания
examples/next-classic-rig/  ClassicRigScene.tsx — интеграция в Next.js 15 + README
```

## Установка и проверки

Требования: Node.js ≥ 20, npm. Пакет рассчитан на `three@0.180.0`, React 19.1.1, TypeScript 5.7.

```bash
npm install
npm test        # vitest run — все тесты в Node, без браузера и GLB
npm run lint    # eslint + tsc --noEmit (src, tests, mapping, examples)
npm run build   # tsc → dist/ (ESM + .d.ts)
```

### Результаты проверок (реальный прогон перед упаковкой)

Окружение: Node v22.23.4, npm 10.9.9, TypeScript 5.7.3, Vitest 3.2.7, ESLint 9.39.5, three 0.180.0.

| Команда | Результат |
|---|---|
| `npm test` | **код 0** — `Test Files 24 passed (24)`, `Tests 73 passed (73)` |
| `npm run lint` | **код 0** — ESLint: 0 ошибок, 0 предупреждений; `tsc --noEmit`: 0 ошибок |
| `npm run build` | **код 0** — `dist/`: 91 JS-модуль + декларации |
| Next.js 15.5.9, `basePath: "/app"` | `next build` — успешно (страница `/rig` пререндерится, three.js вынесен в отдельный чанк); `next start` + Chrome: 36 GLB буровой, городок и 9 персонажей загружены, 83 детали подтверждены сигнатурой, 0 отклонено; бурение и ГНВП запускаются из панели |

Проверка архитектурных правил: импорт `three`/`react`/`next` или обращение к `window`/`document`
в `src/**` вне `src/renderer` — ошибка ESLint (`no-restricted-imports`, `no-restricted-globals`).

## Интеграция с Next.js и Three.js

Коротко (подробно — `examples/next-classic-rig/README.md`):

```ts
// next.config.ts
const config: NextConfig = { basePath: "/app", transpilePackages: ["@rigintel/classic-rig-runtime"] };
```

```tsx
"use client";
const runtime = new ClassicRigRuntime();                         // чистая часть — можно и на сервере
useEffect(() => {
  (async () => {
    const { ClassicRigSceneRuntime } = await import("@rigintel/classic-rig-runtime/renderer");
    const scene = new ClassicRigSceneRuntime({ canvas, basePath: "/app" });
    const report = await scene.load();                           // { verified, rejected, missingAssets }
    runtime.attachRenderer(scene);
    const frame = (t) => { runtime.update(dt); requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  })();
  return () => runtime.dispose();
}, []);
```

Ассеты ищутся по `${basePath}/rig-glb/01_classic_rig/*.glb`, `${basePath}/rig-glb/03_camp/*.glb`,
`${basePath}/rig-characters/*.glb` (то есть `frontend/public/...`). Для CDN — опция `assetRoot`.

Renderer: `setView("overview" | "rig" | "floor" | "derrick" | "underground" | "camp")`, `resize(w, h)`,
`pick(x, y)` → `{kind:"equipment"|"worker", id}`, `highlight(id)`, `setUndergroundVisible(v)`, `dispose()`.

## Управление симуляцией

```ts
import { ClassicRigRuntime } from "@rigintel/classic-rig-runtime";

const rt = new ClassicRigRuntime({ config: { auto: false } });
rt.update(1 / 60);                                    // шаг; внутри дробится до maxStep = 0.05 с
rt.dispatch({ type: "select_operation", operation: "kick" });
rt.dispatch({ type: "close_bop" });
rt.pause();  rt.start();  rt.reset();
```

Команды (`ClassicRigCommand`): `start`, `pause`, `reset`, `select_operation`, `select_phase`, `set_speed`,
`set_weather`, `trigger_event` (`kick` | `high_wind` | `calm_wind`), `close_bop`, `open_bop`, `emergency_stop`,
`set_auto`, `set_kick_detection`. Недопустимая команда не выполняется и пишется в телеметрию как `command_rejected`.
Доступность операции заранее: `rt.simulation.canStartOperation(id)` → `{ ok, reason }`.

**Операции:** `drilling` (наращивание: drill → slips → breakTD → tdUp → latch → lift → stab → makeup → tdConnect → release),
`tripping` (pooh), `casing` (rigup, rih), `cementing` (circ, pump, disp, bump, woc), `moving` (prep, move, center),
`kick` (influx, alarm, shutin, kill, open). При `auto: true` цепочка как в эталоне:
проектный забой → подъём → обсадка → цементирование → переезд → следующая скважина.

**Пауза** останавливает время симуляции полностью (агрегаты, люди, телеметрия). **Reset** возвращает
стартовое состояние (скважина №4 куста, бурение) и очищает журнал телеметрии.

**Настройки** (`config`): `auto`, `earlyKickDetection`, `maxStep`, а также два дополнения к эталону:
`rotationInterlock` (вращение не начинается, пока у ротора люди без разрешения сценария; `false` — поведение эталона)
и `rotaryTableFollowsString` (стол ротора вращается с колонной при открытых клиньях).

### Snapshot

`rt.getSnapshot()` — неизменяемый снимок для UI и renderer'а:
`running`, `speed`, `elapsedTime`, `operation`, `phase`, `phaseTitle`, `phaseText`, `phaseProgress`, `operationProgress`,
`rigOffsetX`, `equipment[id]` (`state`, `visible`, `rpm`, `flow`, `kinematics`…), `workers[id]`
(позиция, курс, уровень `level`, задание, текущее действие, поза, `dangerZone`), `well`, `drilling`
(положение СВП, вращение, подача насосов, клинья, свеча в переносе, вес на крюке, давление), `casing`, `cementing`,
`bop`, `kick`, `weather`, `safety`. Подписка: `rt.simulation.subscribe(fn)`; уведомления — `onNotification`, звуковые сигналы — `onSound`.

### Телеметрия

`rt.telemetry.events(from?, to?)` — журнал событий (`operation_*`, `phase_*`, `phase_skipped`, `equipment_started/stopped/state_changed`,
`worker_task_started`, `worker_entered/left_danger_zone`, `safety_violation`, `emergency_stop(_released)`, `wind_wait_*`,
`kick_detected/killed`, `bop_closed/opened`, `connection_completed`, `stand_transferred`, `command_rejected`, `well_completed`, `rig_moved`).

`rt.telemetry.aggregates()` — время работы и число запусков каждого агрегата, время по состояниям, время насосов/ротора/СВП,
наращивания, перенесённые свечи, время людей в красной зоне, нарушения по кодам, аварийные остановки, задержки (ветер, стоп),
ГНВП, ошибки порядка действий, время по операциям. Всё считается по событиям, а не по таймерам UI.

### Экзамены

```ts
import { drillingConnectionExam } from "@rigintel/classic-rig-runtime";
rt.exams.start(drillingConnectionExam);              // reset + стартовое состояние экзамена
rt.exams.status();                                    // пройденные фазы, следующая фаза, время
rt.exams.onFinished((r) => console.log(r.passed, r.score, r.missedPhases, r.violations, r.orderErrors));
```

Готовые экзамены: наращивание свечи, ГНВП (обнаружение → герметизация → глушение), подъём + обсадка + цементирование.
Экзамен работает на той же симуляции и том же журнале событий. Оценка: порядок фаз, безопасность
(запрещённое событие обнуляет блок и проваливает экзамен), использование агрегатов, время. Ручной перескок фаз
(`select_phase`) — ошибка порядка: последовательность фаз начинается заново, экзамен не сдаётся.

## Ассеты

Используются только `rig-glb/01_classic_rig` (36 GLB), `rig-glb/03_camp` (7 GLB) и `rig-characters` (9 GLB).
В GLB у мешей нет имён, поэтому подвижные детали привязаны явно: индекс узла glTF + сигнатура (число вершин и bbox).
Если сигнатура не совпала (модель пересобрана) — деталь не анимируется и попадает в `report.rejected`; сцена продолжает работать.
Полная сводка — `mapping/asset-bindings.ts`.

## Известные ограничения

- У бурового насоса в эталоне нет отдельного кривошипа: анимируются 6 штоков, корпус неподвижен.
- Вращение стола ротора — дополнение к эталону (там стол неподвижен); отключается `rotaryTableFollowsString: false`.
- `powerslips` и `racker` на классической БУ — логические агрегаты (клинья в роторе, перенос свечи верховым), отдельной геометрии нет.
- Монтаж оснастки обсадки (`rigup`) входит в операцию `casing`, поэтому цементировочный флот виден уже во время обсадки.
- Переход на пол буровой — по лестнице (в эталоне нет отдельных «мостков» для людей; приёмные мостки — для труб).
- Траектория скважины и КНБК рисуются процедурно (GLB `trajectory`, `bha` — статичные снимки и не загружаются); фонтанная арматура клонируется из шаблона.
- Окружение упрощено: нет снеговых шейдеров и живности; звук — только идентификаторы сигналов, синтез — на стороне приложения.
- При паузе позы персонажей замирают (в эталоне продолжали «дышать»).
- Телеметрия буровой детерминирована (без шума датчиков).
- Повар и персонал городка исключены (их нет в списке ID работников ТЗ).
- `dist` собран под бандлер (импорты без расширений): в Next.js нужен `transpilePackages`; прямой запуск `dist` в «голом» Node ESM не поддерживается (для Node-тестов используется `src`).
