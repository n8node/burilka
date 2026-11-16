"use client";
/**
 * РџСЂРёРјРµСЂ РёРЅС‚РµРіСЂР°С†РёРё РІ Next.js 15 (App Router, basePath "/app").
 *
 *  вЂў simulation/telemetry/exams РёРјРїРѕСЂС‚РёСЂСѓСЋС‚СЃСЏ СЃС‚Р°С‚РёС‡РµСЃРєРё вЂ” РѕРЅРё С‡РёСЃС‚С‹Рµ Рё Р±РµР·РѕРїР°СЃРЅС‹ РґР»СЏ SSR;
 *  вЂў three.js-renderer РїРѕРґРіСЂСѓР¶Р°РµС‚СЃСЏ РґРёРЅР°РјРёС‡РµСЃРєРё РІРЅСѓС‚СЂРё useEffect вЂ” С‚РѕР»СЊРєРѕ РІ Р±СЂР°СѓР·РµСЂРµ;
 *  вЂў requestAnimationFrame РїРµСЂРµРґР°С‘С‚ dt РІ runtime.update(dt), renderer СЂРёСЃСѓРµС‚ snapshot;
 *  вЂў React РїРµСЂРµСЂРёСЃРѕРІС‹РІР°РµС‚ РїР°РЅРµР»СЊ ~5 СЂР°Р· РІ СЃРµРєСѓРЅРґСѓ, Р° РЅРµ РЅР° РєР°Р¶РґС‹Р№ РєР°РґСЂ.
 *
 * РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ: app/rig/page.tsx в†’  export default function Page() { return <ClassicRigScene />; }
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
  { id: "drilling", label: "Р‘СѓСЂРµРЅРёРµ" },
  { id: "tripping", label: "РЎРџРћ (РїРѕРґСЉС‘Рј)" },
  { id: "casing", label: "РћР±СЃР°РґРєР°" },
  { id: "cementing", label: "Р¦РµРјРµРЅС‚РёСЂРѕРІР°РЅРёРµ" },
  { id: "moving", label: "РџРµСЂРµРµР·Рґ" },
  { id: "kick", label: "Р“РќР’Рџ" },
];
const VIEWS: CameraViewId[] = ["overview", "rig", "floor", "derrick", "underground", "camp"];
const WEATHER: WeatherPresetId[] = ["clear", "cloudy", "fog", "rain", "storm", "snow", "blizzard"];
// id === "cementFleet") gltf.scene.visible = false — visibility is owned by the package renderer.

export type ClassicRigSceneProps = {
  /** basePath РїСЂРёР»РѕР¶РµРЅРёСЏ (next.config.ts в†’ basePath) */
  basePath?: string;
};

export function ClassicRigSceneViewer({ basePath = "/app" }: ClassicRigSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtime = useMemo(() => new ClassicRigRuntime(), []);
  const sceneRef = useRef<ClassicRigSceneRuntime | null>(null);
  const [snapshot, setSnapshot] = useState<ClassicRigSnapshot>(() => runtime.getSnapshot());
  const [telemetry, setTelemetry] = useState<TelemetryAggregates | null>(null);
  const [exam, setExam] = useState<ClassicRigExamResult | null>(null);
  const [loading, setLoading] = useState<string>("Р—Р°РіСЂСѓР·РєР° Р°СЃСЃРµС‚РѕРІвЂ¦");
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
        onProgress: (n, total, file) => setLoading(`Р—Р°РіСЂСѓР·РєР° ${n}/${total}: ${file}`),
      });
      const report = await scene.load();
      if (disposed) return scene.dispose();
      if (report.rejected.length || report.missingAssets.length) console.warn("РџСЂРёРІСЏР·РєРё GLB:", report);
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
        const dt = Math.min(0.1, (now - last) / 1000); // Р·Р°С‰РёС‚Р° РѕС‚ В«РїСЂС‹Р¶РєР°В» РїРѕСЃР»Рµ РЅРµР°РєС‚РёРІРЅРѕР№ РІРєР»Р°РґРєРё
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
    })().catch((e) => setLoading(`РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё: ${String(e)}`));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanupResize();
      offNotice();
      offExam();
      runtime.dispose(); // РѕСЃРІРѕР±РѕР¶РґР°РµС‚ Рё renderer
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
          РћРїРµСЂР°С†РёСЏ: {s.operation} В· С„Р°Р·Р° {s.phase} В· {(s.phaseProgress * 100).toFixed(0)} %
        </div>
        <div>
          Р—Р°Р±РѕР№ {s.well.md.toFixed(0)} Рј В· СЃРІРµС‡РµР№ {s.drilling.connections} В· РІРµС‚РµСЂ {s.weather.wind.toFixed(1)} Рј/СЃ
        </div>
        {notice && <div style={{ marginTop: 6, color: "#ffd479" }}>{notice}</div>}
        <h4>РЈРїСЂР°РІР»РµРЅРёРµ</h4>
        <button style={btn} onClick={() => runtime.dispatch({ type: s.running ? "pause" : "start" })}>
          {s.running ? "РџР°СѓР·Р°" : "РџСѓСЃРє"}
        </button>
        <button style={btn} onClick={() => runtime.reset()}>
          РЎР±СЂРѕСЃ
        </button>
        <button style={btn} onClick={() => runtime.dispatch({ type: "emergency_stop" })}>
          РђРІР°СЂРёР№РЅС‹Р№ СЃС‚РѕРї
        </button>
        <button style={btn} onClick={() => runtime.dispatch({ type: s.bop.state === "open" ? "close_bop" : "open_bop" })}>
          {s.bop.state === "open" ? "Р—Р°РєСЂС‹С‚СЊ РџР’Рћ" : "РћС‚РєСЂС‹С‚СЊ РџР’Рћ"}
        </button>
        <button
          style={btn}
          disabled={!kickAllowed.ok}
          title={kickAllowed.reason}
          onClick={() => runtime.dispatch({ type: "trigger_event", event: "kick" })}
        >
          Р’С‹Р·РІР°С‚СЊ Р“РќР’Рџ
        </button>
        <button style={btn} onClick={() => runtime.dispatch({ type: "set_speed", value: s.speed >= 4 ? 1 : s.speed * 2 })}>
          РЎРєРѕСЂРѕСЃС‚СЊ Г—{s.speed}
        </button>
        <h4>РћРїРµСЂР°С†РёРё</h4>
        {OPERATIONS.map((o) => {
          // РґРѕСЃС‚СѓРїРЅРѕСЃС‚СЊ РѕРїРµСЂР°С†РёРё СЂРµС€Р°РµС‚ СЃРёРјСѓР»СЏС†РёСЏ, Р° РЅРµ UI
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
        <h4>РџРѕРіРѕРґР° / РєР°РјРµСЂР°</h4>
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
        <h4>РўРµР»РµРјРµС‚СЂРёСЏ</h4>
        {telemetry && (
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            <li>
              РќР°СЃРѕСЃС‹: {telemetry.pumpSeconds.toFixed(0)} СЃ В· РЎР’Рџ: {telemetry.topdriveSeconds.toFixed(0)} СЃ
            </li>
            <li>
              РќР°СЂР°С‰РёРІР°РЅРёР№: {telemetry.connections} В· СЃРІРµС‡РµР№ РїРµСЂРµРЅРµСЃРµРЅРѕ: {telemetry.standsTransferred}
            </li>
            <li>
              РќР°СЂСѓС€РµРЅРёР№: {telemetry.safety.totalViolations} В· РѕС€РёР±РѕРє РїРѕСЂСЏРґРєР°: {telemetry.orderErrors.count}
            </li>
            {lastOrderError && (
              <li>
                РџРѕСЃР»РµРґРЅСЏСЏ РѕС€РёР±РєР°: {lastOrderError.command} вЂ” {lastOrderError.reason}
              </li>
            )}
          </ul>
        )}
        <h4>Р­РєР·Р°РјРµРЅС‹</h4>
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
            <b>{exam.passed ? "РЎРґР°РЅ" : "РќРµ СЃРґР°РЅ"}</b> вЂ” {exam.score} Р±Р°Р»Р»РѕРІ, {exam.durationSeconds.toFixed(0)} СЃ
            {exam.missedPhases.length > 0 && <div>РџСЂРѕРїСѓС‰РµРЅРѕ: {exam.missedPhases.join(", ")}</div>}
            {exam.violations.length > 0 && <div>РќР°СЂСѓС€РµРЅРёСЏ: {exam.violations.join(", ")}</div>}
            {exam.orderErrors.length > 0 && <div>РћС€РёР±РєРё РїРѕСЂСЏРґРєР°: {exam.orderErrors.join("; ")}</div>}
          </div>
        )}
      </aside>
    </div>
  );
}

export default ClassicRigSceneViewer;

