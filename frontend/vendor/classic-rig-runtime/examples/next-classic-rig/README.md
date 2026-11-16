# Пример: классическая буровая в Next.js 15

`ClassicRigScene.tsx` — клиентский компонент, который подключает пакет к странице Next.js
(App Router, React 19, `basePath: "/app"`). Проверен реальной сборкой `next build` на Next 15.5.9
и запуском `next start` в Chrome (WebGL): ассеты грузятся по `/app/rig-glb/...`, сцена рендерится,
операции и ГНВП запускаются из панели.

## Подключение

1. Пакет в монорепозитории — например, `packages/classic-rig-runtime`, в `frontend/package.json`:
   ```json
   { "dependencies": { "@rigintel/classic-rig-runtime": "file:../packages/classic-rig-runtime", "three": "0.180.0" } }
   ```
   Перед установкой соберите пакет: `npm run build` (нужен каталог `dist`).
2. `next.config.ts`:
   ```ts
   import type { NextConfig } from "next";
   const config: NextConfig = {
     basePath: "/app",
     transpilePackages: ["@rigintel/classic-rig-runtime"],
   };
   export default config;
   ```
   `transpilePackages` обязателен: `dist` собран под бандлер (импорты без расширений).
3. Ассеты лежат там же, где сейчас:
   `frontend/public/rig-glb/01_classic_rig/`, `frontend/public/rig-glb/03_camp/`, `frontend/public/rig-characters/`.
   Если ассеты на CDN — передайте `assetRoot` в `ClassicRigSceneRuntime`.
4. Страница:
   ```tsx
   // app/rig/page.tsx
   import ClassicRigScene from "./ClassicRigScene";
   export default function Page() {
     return <ClassicRigScene basePath="/app" />;
   }
   ```

## Что важно в компоненте

- Симуляция, телеметрия и экзамены импортируются статически: в них нет `window`/`three`, они безопасны при SSR.
- `@rigintel/classic-rig-runtime/renderer` (three.js) импортируется **динамически внутри `useEffect`** — только в браузере.
- `requestAnimationFrame` передаёт `dt` в `runtime.update(dt)`; `dt` ограничен 0.1 с, чтобы после неактивной вкладки симуляция не «прыгала».
- React-состояние обновляется ~5 раз в секунду, не на каждый кадр.
- Доступность кнопок решает симуляция (`runtime.simulation.canStartOperation(id)`), UI только показывает причину.
- При размонтировании: `cancelAnimationFrame`, отписки, `runtime.dispose()` (освобождает WebGL-ресурсы renderer'а).
- `pick()` + `highlight()` — выбор агрегата кликом по сцене.

Под Next 15 c `moduleResolution: "node"` (так создаёт `tsconfig` сам Next) типы подпути `/renderer`
находятся через `typesVersions` в `package.json` пакета.
