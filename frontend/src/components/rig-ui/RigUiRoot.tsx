"use client";
import "@/content/rig-ui.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClassicRigRuntime, type ClassicRigSnapshot, type ClassicRigOperationId } from "@rigintel/classic-rig-runtime";
import type { ClassicRigSceneRuntime, PickResult } from "@rigintel/classic-rig-runtime/renderer";
import { content, cardKey } from "./content";
import { dayPhase, fmtTime, localDate, utcLabel } from "./atmosphere";

type Region = { id: string; off: number; city: string; place: string; lat: number; lon: number };
type Step = { key: string; name: string; text?: string };
type Weather = { name: string; icon: string; seasons: string[] };
type ListItem = { kind: "equipment" | "worker" | "camp"; id: string };
type Section = { h: string; groups: { h: string | null; items: ListItem[] }[] };

const operations = content.ops as [ClassicRigOperationId, string][];
const drillingPhases = ["drill", "slips", "breakTD", "tdUp", "latch", "lift", "stab", "makeup", "tdConnect", "release"];
const kindTitle = (kind: string) => kind === "worker" ? "Буровая бригада" : kind === "camp" ? "Жилой городок" : "Буровая установка";

export default function RigUiRoot({ basePath = "/app" }: { basePath?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ClassicRigSceneRuntime | null>(null);
  const runtime = useMemo(() => new ClassicRigRuntime(), []);
  const [snapshot, setSnapshot] = useState<ClassicRigSnapshot>(() => runtime.getSnapshot());
  const [selected, setSelected] = useState<PickResult>(null);
  const [regionId, setRegionId] = useState<string>(content.defaultRegion);
  const [shift, setShift] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [panel, setPanel] = useState<"stats" | "exam" | null>(null);
  const [compactClock, setCompactClock] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [toasts, setToasts] = useState<string[]>([]);

  const regions = content.regions as Region[];
  const region = regions.find((item) => item.id === regionId) ?? regions[0];
  const selectedKey = selected ? cardKey(selected.kind, selected.id) : undefined;
  const selectedCard = selectedKey ? content.cards[selectedKey] : null;
  const weather = content.weather[snapshot.weather.preset] as Weather;
  const phaseList: Step[] = snapshot.operation === "drilling"
    ? drillingPhases.map((key) => ({ key, name: content.phases[key] }))
    : (content.steps[snapshot.operation] ?? []).map((item: Step) => item);
  const currentStep = Math.max(0, phaseList.findIndex((item) => item.key === snapshot.phase));
  const localNow = localDate(Date.now() + shift * 3600000, region.off);
  const sunPhase = dayPhase(Date.now() + shift * 3600000, region.lat, region.lon, content.dayPhases);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let previous = performance.now();
    let cleanupScene: (() => void) | null = null;
    const timer = window.setInterval(() => setSnapshot(runtime.getSnapshot()), 200);
    const init = async () => {
      const { ClassicRigSceneRuntime } = await import("@rigintel/classic-rig-runtime/renderer");
      if (!canvasRef.current) return;
      const scene = new ClassicRigSceneRuntime({ canvas: canvasRef.current, basePath });
      await scene.load();
      if (disposed) { scene.dispose(); return; }
      sceneRef.current = scene;
      runtime.attachRenderer(scene);
      const resize = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width = Math.max(1, canvas.clientWidth || window.innerWidth);
        const height = Math.max(1, canvas.clientHeight || window.innerHeight);
        scene.resize(width, height);
      };
      window.addEventListener("resize", resize);
      const observer = new ResizeObserver(resize);
      observer.observe(canvasRef.current);
      resize();
      const frame = (now: number) => {
        runtime.update(Math.min(0.1, (now - previous) / 1000));
        previous = now;
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      cleanupScene = () => { observer.disconnect(); window.removeEventListener("resize", resize); scene.dispose(); };
    };
    void init();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearInterval(timer);
      cleanupScene?.();
      cleanupScene = null;
      sceneRef.current = null;
      runtime.attachRenderer(null);
    };
  }, [basePath, runtime]);

  useEffect(() => {
    sceneRef.current?.setEnvironment({ lat: region.lat, lon: region.lon, clock: () => Date.now() + shift * 3600000 });
  }, [region, shift]);

  useEffect(() => {
    const off = runtime.simulation.onNotification((notification) => {
      setToasts((items) => [...items.slice(-2), notification.text]);
      window.setTimeout(() => setToasts((items) => items.slice(1)), 4000);
    });
    return off;
  }, [runtime]);

  const select = (target: PickResult) => {
    setSelected(target);
    sceneRef.current?.highlight(target);
  };
  const pickCanvas = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const target = sceneRef.current?.pick(event.clientX - rect.left, event.clientY - rect.top) ?? null;
    if (target) select(target);
    else { setSelected(null); sceneRef.current?.highlight(null); }
  };
  const setWeather = (preset: string) => runtime.dispatch({ type: "set_weather", weather: { preset: preset as never } });

  return <div className="rig-ui">
    <canvas ref={canvasRef} className="rig-stage" onClick={pickCanvas} />
    <div id="title" className="glass"><b>{content.meta.title}</b><span>{content.meta.subtitle}</span></div>
    <div id="hint" className="glass">{content.meta.hint}</div>

    <section id="hud" className={`glass ${snapshot.kick.alarm ? "alarm" : ""}`}>
      <div className="ops">{operations.map(([id, label]) => { const available = runtime.simulation.canStartOperation(id); return <button key={id} className={`${snapshot.operation === id ? "on" : ""} ${id === "kick" ? "kick" : ""}`} disabled={!available.ok} title={available.reason} onClick={() => runtime.dispatch({ type: "select_operation", operation: id })}>{label}</button>; })}</div>
      <label className="auto"><input type="checkbox" checked={snapshot.auto} onChange={(event) => runtime.dispatch({ type: "set_auto", value: event.target.checked })} /> Полный цикл</label>
      <label className="auto"><input type="checkbox" checked={snapshot.kick.earlyDetection} onChange={(event) => runtime.dispatch({ type: "set_kick_detection", early: event.target.checked })} /> Система раннего обнаружения ГНВП</label>
      <div className="phase"><i className="dot" />{snapshot.phaseTitle}</div>
      <div className="wellname">Скважина № {snapshot.well.wellIndex + 1} · проект {snapshot.well.td} м</div>
      <div className="bhead"><span>Свеча № <b>{snapshot.drilling.connections + 1}</b></span><span>В подсвечнике: <b>{snapshot.drilling.standsInSetback}</b></span></div>
      <ul className="steps">{phaseList.map((step, index) => <li key={step.key} className={index < currentStep ? "done" : index === currentStep ? "cur" : ""}>{index < currentStep ? "✓" : index + 1} {step.name}{index === currentStep && <i className="pb" style={{ width: `${snapshot.phaseProgress * 100}%` }} />}</li>)}</ul>
      <div className="btext"><small>Шаг {currentStep + 1} из {phaseList.length}</small>{snapshot.phaseText || content.phaseNotes[snapshot.phase] || phaseList[currentStep]?.text}</div>
      <div className="bfoot"><span>Людей у устья: <b className={snapshot.safety.dangerZoneWorkers.length > 0 && snapshot.safety.rotating ? "warnv" : ""}>{snapshot.safety.dangerZoneWorkers.length}</b></span><span>Глубина: <b>{snapshot.well.md.toFixed(0)} м</b></span></div>
    </section>

    <section id="clock" className={`glass ${compactClock ? "compact" : ""}`}>
      <button id="clockToggle" onClick={() => setCompactClock((value) => !value)}>⌃</button>
      <select value={regionId} onChange={(event) => setRegionId(event.target.value)}>{regions.map((item) => <option key={item.id} value={item.id}>{utcLabel(item.off)} · {item.city} — {item.place}</option>)}</select>
      <div className="cmain"><strong id="cTime">{fmtTime(localNow)}</strong><span id="cPhase" style={{ color: sunPhase.col }}>{sunPhase.icon} {sunPhase.name}</span></div>
      <div className="csub"><span>{localNow.getUTCDate()} ноября · {utcLabel(region.off)}</span><span>{weather.icon} {weather.name} · ветер {snapshot.weather.wind.toFixed(0)} м/с</span></div>
      <div className="cctl">Сдвиг <input type="range" min={-12} max={12} step={0.25} value={shift} onChange={(event) => setShift(Number(event.target.value))} /><span>{shift.toFixed(2)} ч</span></div>
      <div className="cbtn"><button onClick={() => setShift(0)}>Сейчас</button><button onClick={() => setShift((value) => value + 1)}>⏩ Таймлапс суток</button></div>
      <div className="atmo"><p className="ainfo">{weather.icon} {weather.name} · ветер {content.windDirs[Math.round(snapshot.weather.windDirDeg / 45) % 8]} {snapshot.weather.wind.toFixed(0)} м/с{snapshot.safety.workAtHeightBanned && <span className="warn">≥{content.windLimit} м/с: работы верхового запрещены</span>}</p><button className="cbtn" onClick={() => setWeatherOpen((value) => !value)}>Погода и сезон {weatherOpen ? "▲" : "▼"}</button>{weatherOpen && <div className="abody"><div className="seg">{Object.entries(content.seasons).map(([id, label]) => <button key={id} className={snapshot.weather.season === id ? "on" : ""} onClick={() => runtime.dispatch({ type: "set_weather", weather: { season: id as never } })}>{label as string}</button>)}</div><div className="seg wrap">{Object.entries(content.weather).filter(([, item]) => (item as Weather).seasons.includes(snapshot.weather.season)).map(([id, item]) => <button key={id} className={snapshot.weather.preset === id ? "on" : ""} onClick={() => setWeather(id)}>{(item as Weather).icon} {(item as Weather).name}</button>)}</div><div className="arow">Ветер <input type="range" min="0" max="25" value={snapshot.weather.wind} onChange={(event) => runtime.dispatch({ type: "set_weather", weather: { windOverride: Number(event.target.value) } })} /></div></div>}</div>
    </section>

    <button id="listBtn" className="glass" onClick={() => setListOpen((value) => !value)}>☰ Агрегаты</button>
    {listOpen && <section id="list" className="glass open">{(content.list as Section[]).map((section) => <div key={section.h}><h3>{section.h}</h3>{section.groups.map((group) => <div key={group.h ?? "all"}><h4>{group.h}</h4>{group.items.map((item) => { const key = cardKey(item.kind, item.id); const target = item as PickResult; return key ? <button key={item.id} className={selected?.id === item.id ? "on" : ""} onMouseEnter={() => sceneRef.current?.hover(target)} onMouseLeave={() => sceneRef.current?.hover(null)} onClick={() => select(target)}>{content.cards[key].name}</button> : null; })}</div>)}</div>)}</section>}

    {selectedCard && selected && <aside id="panel" className="glass open"><button className="x" onClick={() => setSelected(null)}>×</button><span className="rig">{kindTitle(selected.kind)}</span><span className="sys">{selectedCard.sys}</span><h2>{selectedCard.name}</h2>{selected.kind === "worker" && <div className="now on"><b>Сейчас:</b> {snapshot.workers[selected.id]?.activity}</div>}<p>{selectedCard.desc}</p><h3>Характеристики</h3><table><tbody>{selectedCard.specs.map((row: [string, string]) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td></tr>)}</tbody></table><h3>Датчики и данные</h3><ul>{selectedCard.data.map((item: string) => <li key={item}>{item}</li>)}</ul><button className="btns" onClick={() => sceneRef.current?.focus(selected)}>Приблизить</button></aside>}

    <nav id="bar" className="glass"><button onClick={() => runtime.dispatch({ type: snapshot.running ? "pause" : "start" })}>{snapshot.running ? "⏸ Пауза" : "▶ Пуск"}</button><button onClick={() => { const next = speed >= 4 ? 1 : speed * 2; setSpeed(next); runtime.dispatch({ type: "set_speed", value: next }); }}>Скорость ×{speed}</button><button onClick={() => sceneRef.current?.setUndergroundVisible(true)}>Разрез: вкл</button>{content.views.map((view: { id: string; label: string; cut?: boolean }) => <button key={view.id} onClick={() => { sceneRef.current?.setView(view.id as never); if (view.cut) sceneRef.current?.setUndergroundVisible(true); }}>{view.label}</button>)}<button onClick={() => setPanel("stats")}>📊 Статистика</button><button onClick={() => setPanel("exam")}>🎓 Экзамен</button></nav>

    {panel && <aside id="cmp" className="glass open"><button className="x" onClick={() => setPanel(null)}>×</button><h2>{panel === "stats" ? "Статистика буровой" : "Экзамен"}</h2>{panel === "stats" ? <><p>Телеметрия текущего запуска.</p><button onClick={() => { const blob = new Blob([JSON.stringify(runtime.telemetry.toJSON(), null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `rig-telemetry-${Date.now()}.json`; link.click(); }}>Выгрузить JSON</button></> : <p>Экзамены runtime доступны через пакет.</p>}</aside>}
    <div id="toast" className={toasts.length ? "on" : ""}>{toasts.map((toast, index) => <div key={`${toast}-${index}`}>{toast}</div>)}</div>
  </div>;
}
