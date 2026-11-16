"use client";
/**
 * Пример интеграции в Next.js 15 (App Router, basePath "/app").
 *
 *  • simulation/telemetry/exams импортируются статически — они чистые и безопасны для SSR;
 *  • three.js-renderer подгружается динамически внутри useEffect — только в браузере;
 *  • requestAnimationFrame передаёт dt в runtime.update(dt), renderer рисует snapshot;
 *  • React перерисовывает панель ~5 раз в секунду, а не на каждый кадр.
 *
 * Использование: app/rig/page.tsx →  export default function Page() { return <ClassicRigScene />; }
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CLASSIC_RIG_EXAMS,
  ClassicRigRuntime,
  type ClassicRigExamResult,
  type ClassicRigOperationId,
  type ClassicRigSnapshot,
  type TelemetryAggregates,
  type WeatherPresetId,
} from "@rigintel/classic-rig-runtime";
import type { CameraViewId, ClassicRigSceneRuntime } from "@rigintel/classic-rig-runtime/renderer";

const OPERATIONS: { id: ClassicRigOperationId; label: string }[] = [
  { id: "drilling", label: "Бурение" },
  { id: "tripping", label: "СПО (подъём)" },
  { id: "casing", label: "Обсадка" },
  { id: "cementing", label: "Цементирование" },
  { id: "moving", label: "Переезд" },
  { id: "kick", label: "ГНВП" },
];
const VIEWS: CameraViewId[] = ["overview", "rig", "floor", "derrick", "underground", "camp"];
const WEATHER: WeatherPresetId[] = ["clear", "cloudy", "fog", "rain", "storm", "snow", "blizzard"];

export type ClassicRigSceneProps = {
  /** basePath приложения (next.config.ts → basePath) */
  basePath?: string;
};

export default function ClassicRigScene({ basePath = "/app" }: ClassicRigSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtime = useMemo(() => new ClassicRigRuntime(), []);
  const sceneRef = useRef<ClassicRigSceneRuntime | null>(null);
  const [snapshot, setSnapshot] = useState<ClassicRigSnapshot>(() => runtime.getSnapshot());
  const [telemetry, setTelemetry] = useState<TelemetryAggregates | null>(null);
  const [exam, setExam] = useState<ClassicRigExamResult | null>(null);
  const [loading, setLoading] = useState<string>("Загрузка ассетов…");
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let last = performance.now();
    let uiTimer = 0;
    let cleanupResize = () => {};
    const offNotice = runtime.simulation.onNotification((n) => setNotice(n.text));
    const offExam = runtime.exams.onFinished(setExam);

    (async () => {
      const { ClassicRigSceneRuntime } = await import("@rigintel/classic-rig-runtime/renderer");
      if (disposed || !canvasRef.current) return;
      const scene = new ClassicRigSceneRuntime({
        canvas: canvasRef.current,
        basePath,
        onProgress: (n, total, file) => setLoading(`Загрузка ${n}/${total}: ${file}`),
      });
      const report = await scene.load();
      if (disposed) return scene.dispose();
      if (report.rejected.length || report.missingAssets.length) console.warn("Привязки GLB:", report);
      sceneRef.current = scene;
      runtime.attachRenderer(scene);
      setLoading("");

      const onResize = () => {
        const c = canvasRef.current;
        if (c) scene.resize(c.clientWidth, c.clientHeight);
      };
      window.addEventListener("resize", onResize);
      onResize();

      const frame = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000); // защита от «прыжка» после неактивной вкладки
        last = now;
        runtime.update(dt);
        uiTimer += dt;
        if (uiTimer > 0.2) {
          uiTimer = 0;
          setSnapshot(runtime.getSnapshot());
          setTelemetry(runtime.telemetry.aggregates());
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      cleanupResize = () => window.removeEventListener("resize", onResize);
    })().catch((e) => setLoading(`Ошибка загрузки: ${String(e)}`));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanupResize();
      offNotice();
      offExam();
      runtime.dispose(); // освобождает и renderer
      sceneRef.current = null;
    };
  }, [runtime, basePath]);

  const s = snapshot;
  const kickAllowed = runtime.simulation.canStartOperation("kick");
  const lastOrderError = telemetry?.orderErrors.items.at(-1);
  const btn = { padding: "4px 8px", margin: 2, fontSize: 12 } as const;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const hit = sceneRef.current?.pick(e.clientX - r.left, e.clientY - r.top);
            sceneRef.current?.highlight(hit?.kind === "equipment" ? (hit.id as never) : null);
          }}
        />
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#0b0f14cc", color: "#fff" }}>
            {loading}
          </div>
        )}
      </div>

      <aside style={{ overflow: "auto", padding: 12, background: "#11161d", color: "#dfe6ee", fontSize: 13 }}>
        <h3 style={{ margin: "0 0 6px" }}>{s.phaseTitle}</h3>
        <div style={{ opacity: 0.8 }}>{s.phaseText}</div>
        <div>
          Операция: {s.operation} · фаза {s.phase} · {(s.phaseProgress * 100).toFixed(0)} %
        </div>
        <div>
          Забой {s.well.md.toFixed(0)} м · свечей {s.drilling.connections} · ветер {s.weather.wind.toFixed(1)} м/с
        </div>
        {notice && <div style={{ marginTop: 6, color: "#ffd479" }}>{notice}</div>}
        <h4>Управление</h4>
        <button style={btn} onClick={() => runtime.dispatch({ type: s.running ? "pause" : "start" })}>
          {s.running ? "Пауза" : "Пуск"}
        </button>
        <button style={btn} onClick={() => runtime.reset()}>
          Сброс
        </button>
        <button style={btn} onClick={() => runtime.dispatch({ type: "emergency_stop" })}>
          Аварийный стоп
        </button>
        <button style={btn} onClick={() => runtime.dispatch({ type: s.bop.state === "open" ? "close_bop" : "open_bop" })}>
          {s.bop.state === "open" ? "Закрыть ПВО" : "Открыть ПВО"}
        </button>
        <button
          style={btn}
          disabled={!kickAllowed.ok}
          title={kickAllowed.reason}
          onClick={() => runtime.dispatch({ type: "trigger_event", event: "kick" })}
        >
          Вызвать ГНВП
        </button>
        <button style={btn} onClick={() => runtime.dispatch({ type: "set_speed", value: s.speed >= 4 ? 1 : s.speed * 2 })}>
          Скорость ×{s.speed}
        </button>
        <h4>Операции</h4>
        {OPERATIONS.map((o) => {
          // доступность операции решает симуляция, а не UI
          const can = runtime.simulation.canStartOperation(o.id);
          return (
            <button
              key={o.id}
              style={{ ...btn, fontWeight: s.operation === o.id ? 700 : 400 }}
              disabled={!can.ok}
              title={can.reason}
              onClick={() => runtime.dispatch({ type: "select_operation", operation: o.id })}
            >
              {o.label}
            </button>
          );
        })}
        <h4>Погода / камера</h4>
        <select
          onChange={(e) => runtime.dispatch({ type: "set_weather", weather: { preset: e.target.value as WeatherPresetId } })}
          defaultValue={s.weather.preset}
        >
          {WEATHER.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>{" "}
        <select onChange={(e) => sceneRef.current?.setView(e.target.value as CameraViewId)} defaultValue="rig">
          {VIEWS.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <h4>Телеметрия</h4>
        {telemetry && (
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            <li>
              Насосы: {telemetry.pumpSeconds.toFixed(0)} с · СВП: {telemetry.topdriveSeconds.toFixed(0)} с
            </li>
            <li>
              Наращиваний: {telemetry.connections} · свечей перенесено: {telemetry.standsTransferred}
            </li>
            <li>
              Нарушений: {telemetry.safety.totalViolations} · ошибок порядка: {telemetry.orderErrors.count}
            </li>
            {lastOrderError && (
              <li>
                Последняя ошибка: {lastOrderError.command} — {lastOrderError.reason}
              </li>
            )}
          </ul>
        )}
        <h4>Экзамены</h4>
        {CLASSIC_RIG_EXAMS.map((def) => (
          <button
            key={def.id}
            style={btn}
            onClick={() => {
              setExam(null);
              runtime.exams.start(def);
            }}
          >
            {def.title}
          </button>
        ))}
        {exam && (
          <div style={{ marginTop: 6 }}>
            <b>{exam.passed ? "Сдан" : "Не сдан"}</b> — {exam.score} баллов, {exam.durationSeconds.toFixed(0)} с
            {exam.missedPhases.length > 0 && <div>Пропущено: {exam.missedPhases.join(", ")}</div>}
            {exam.violations.length > 0 && <div>Нарушения: {exam.violations.join(", ")}</div>}
            {exam.orderErrors.length > 0 && <div>Ошибки порядка: {exam.orderErrors.join("; ")}</div>}
          </div>
        )}
      </aside>
    </div>
  );
}
