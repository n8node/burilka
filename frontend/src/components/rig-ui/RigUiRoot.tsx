"use client";
import "@/content/rig-ui.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { autoSeason, ClassicRigRuntime, sunPosition, type ClassicRigSnapshot, type ClassicRigOperationId } from "@rigintel/classic-rig-runtime";
import type { ClassicRigSceneRuntime, PickResult } from "@rigintel/classic-rig-runtime/renderer";
import { content, cardKey } from "./content";
import { dayPhase, fmtTime, localDate, utcLabel } from "./atmosphere";
import { RigAudio } from "./RigAudio";

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
  const cleanupSceneRef = useRef<(() => void) | null>(null);
  const environmentRef = useRef({ lat: 0, lon: 0, shift: 0 });
  const audioRef = useRef<RigAudio | null>(null);
  const soundEnabledRef = useRef(false);
  const hoveredRef = useRef<string | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number; button: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const runtime = useMemo(() => new ClassicRigRuntime(), []);
  const [snapshot, setSnapshot] = useState<ClassicRigSnapshot>(() => runtime.getSnapshot());
  const [selected, setSelected] = useState<PickResult>(null);
  const [hoverTip, setHoverTip] = useState<{ name: string; x: number; y: number } | null>(null);
  const [regionId, setRegionId] = useState<string>(content.defaultRegion);
  const [shift, setShift] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [panel, setPanel] = useState<"stats" | "exam" | null>(null);
  const [compactClock, setCompactClock] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(true);
  const [seasonAuto, setSeasonAuto] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundError, setSoundError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [undergroundVisible, setUndergroundVisible] = useState(true);
  const undergroundVisibleRef = useRef(true);
  const [toasts, setToasts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const solarElevation = sunPosition(Date.now() + shift * 3600000, region.lat, region.lon).elevation;
  const preset = content.weather[snapshot.weather.preset] as Weather & { cloud: number; rain: number; snow: number };
  const winterFactor = snapshot.weather.season === "winter" ? 1 : 0;
  const baseTemperature = winterFactor ? -13 - (region.lat - 55) * 0.9 : 16 - (region.lat - 55) * 0.45;
  const temperature = baseTemperature + (winterFactor ? 2.5 : 5) * Math.max(-1, Math.min(1, solarElevation / 25)) * (1 - 0.6 * preset.cloud) - 3 * preset.rain - 4 * preset.snow * (snapshot.weather.wind > 12 ? 1 : 0.4);
  const windDirection = content.windDirs[Math.round(((snapshot.weather.windDirDeg % 360) + 360) % 360 / 45) % 8];
  environmentRef.current = { lat: region.lat, lon: region.lon, shift };

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let previous = performance.now();
    cleanupSceneRef.current?.();
    cleanupSceneRef.current = null;
    sceneRef.current = null;
    const timer = window.setInterval(() => setSnapshot(runtime.getSnapshot()), 200);
    const init = async () => {
      try {
        const { ClassicRigSceneRuntime } = await import("@rigintel/classic-rig-runtime/renderer");
        if (!canvasRef.current) return;
        setLoadError(null);
        setLoading(true);
        const scene = new ClassicRigSceneRuntime({ canvas: canvasRef.current, basePath });
        const report = await scene.load();
        if (disposed) { scene.dispose(); return; }
        if (report.missingAssets.length > 0) {
          console.error("Classic rig assets failed to load", report.missingAssets);
          setLoadError(`Не удалось загрузить ${report.missingAssets.length} ассетов. Проверьте пути /app/rig-glb.`);
        }
        sceneRef.current = scene;
        scene.setUndergroundVisible(undergroundVisibleRef.current);
        const env = environmentRef.current;
        scene.setEnvironment({ lat: env.lat, lon: env.lon, clock: () => Date.now() + environmentRef.current.shift * 3600000 });
        runtime.attachRenderer(scene);
        setLoading(false);
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
        cleanupSceneRef.current = () => {
          cancelAnimationFrame(raf);
          observer.disconnect();
          window.removeEventListener("resize", resize);
          scene.dispose();
          if (sceneRef.current === scene) sceneRef.current = null;
        };
      } catch (error) {
        console.error("Classic rig scene initialization failed", error);
        if (!disposed) {
          setLoading(false);
          setLoadError(error instanceof Error ? error.message : "Не удалось загрузить сцену");
        }
      }
    };
    void init();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearInterval(timer);
      cleanupSceneRef.current?.();
      cleanupSceneRef.current = null;
      sceneRef.current = null;
      runtime.attachRenderer(null);
    };
  }, [basePath, runtime]);

  useEffect(() => {
    sceneRef.current?.setEnvironment({ lat: region.lat, lon: region.lon, clock: () => Date.now() + shift * 3600000 });
  }, [region, shift]);

  const autoSeasonValue = autoSeason(localNow.getUTCMonth(), region.lat);
  useEffect(() => {
    if (!seasonAuto) return;
    const current = runtime.getSnapshot().weather;
    if (current.season === autoSeasonValue) return;
    runtime.dispatch({ type: "set_weather", weather: { season: autoSeasonValue, windOverride: current.windOverride ?? current.wind } });
    setSnapshot(runtime.getSnapshot());
  }, [autoSeasonValue, seasonAuto, runtime]);

  useEffect(() => {
    const off = runtime.simulation.onSound((cue) => { if (soundEnabledRef.current) audioRef.current?.play(cue); });
    return () => { off(); soundEnabledRef.current = false; audioRef.current?.dispose(); audioRef.current = null; };
  }, [runtime]);

  useEffect(() => { if (soundEnabled) audioRef.current?.update(snapshot); }, [snapshot, soundEnabled]);

  const toggleSound = async () => {
    if (soundEnabledRef.current) {
      soundEnabledRef.current = false;
      audioRef.current?.disable();
      setSoundEnabled(false);
      return;
    }
    const audio = audioRef.current ?? new RigAudio();
    audioRef.current = audio;
    try {
      await audio.enable();
      if (audioRef.current !== audio) return;
      soundEnabledRef.current = true;
      audio.update(runtime.getSnapshot());
      setSoundEnabled(true);
      setSoundError(null);
    } catch (error) {
      audio.dispose();
      if (audioRef.current === audio) audioRef.current = null;
      setSoundError(error instanceof Error ? error.message : "Не удалось включить звук");
    }
  };

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
  const setWeatherKeepingWind = (weather: Partial<Pick<ClassicRigSnapshot["weather"], "preset" | "season">>) => {
    const current = runtime.getSnapshot().weather;
    runtime.dispatch({ type: "set_weather", weather: { ...weather, windOverride: current.windOverride ?? current.wind } });
    setSnapshot(runtime.getSnapshot());
  };
  const setCutVisible = (visible: boolean) => {
    undergroundVisibleRef.current = visible;
    setUndergroundVisible(visible);
    sceneRef.current?.setUndergroundVisible(visible);
  };
  const pickCanvas = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const target = sceneRef.current?.pick(event.clientX - rect.left, event.clientY - rect.top, hasCard) ?? null;
    if (target) select(target);
    else { setSelected(null); sceneRef.current?.highlight(null); }
  };
  const hasCard = (target: NonNullable<PickResult>) => {
    const key = cardKey(target.kind, target.id);
    return !!key && !!content.cards[key];
  };
  const clearCanvasHover = (canvas: HTMLCanvasElement) => {
    if (hoveredRef.current !== null) sceneRef.current?.hover(null);
    hoveredRef.current = null;
    setHoverTip(null);
    canvas.style.cursor = "";
  };
  const hoverCanvas = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const down = pointerDownRef.current;
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) >= 6) down.moved = true;
    if (event.buttons !== 0 || event.pointerType === "touch") { clearCanvasHover(event.currentTarget); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const target = sceneRef.current?.pick(event.clientX - rect.left, event.clientY - rect.top, hasCard) ?? null;
    const key = target ? `${target.kind}:${target.id}` : null;
    if (key !== hoveredRef.current) {
      sceneRef.current?.hover(target);
      hoveredRef.current = key;
    }
    const card = target ? content.cards[cardKey(target.kind, target.id) ?? ""] : null;
    setHoverTip(card ? { name: card.name, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
    event.currentTarget.style.cursor = target ? "pointer" : "";
  };
  return <div className="rig-ui">
    <canvas ref={canvasRef} className="rig-stage" onClick={pickCanvas} onPointerMove={hoverCanvas} onPointerLeave={(event) => { pointerDownRef.current = null; clearCanvasHover(event.currentTarget); }} onPointerDown={(event) => { pointerDownRef.current = { x: event.clientX, y: event.clientY, button: event.button, moved: false }; suppressClickRef.current = false; clearCanvasHover(event.currentTarget); }} onPointerUp={(event) => { const down = pointerDownRef.current; suppressClickRef.current = !!down && (down.moved || down.button !== 0 || Math.hypot(event.clientX - down.x, event.clientY - down.y) >= 6); pointerDownRef.current = null; }} onPointerCancel={(event) => { pointerDownRef.current = null; clearCanvasHover(event.currentTarget); }} />
    {hoverTip && <div className="rig-hover-tip glass" style={{ left: Math.max(8, Math.min(hoverTip.x + 16, (canvasRef.current?.clientWidth ?? 0) - 210)), top: Math.max(8, hoverTip.y - 55) }}>{hoverTip.name}<small>Клик — подробнее</small></div>}
    {loading && <div className="rig-loading">Загрузка сцены…</div>}
    {loadError && <div className="rig-load-error">{loadError}</div>}
    <div id="title" className="glass"><b>{content.meta.title}</b><span>{content.meta.subtitle}</span></div>
    <div id="hint" className="glass">{content.meta.hint}</div>

    <section id="clock" className={`glass ${compactClock ? "compact" : ""}`}>
      <select value={regionId} onChange={(event) => setRegionId(event.target.value)} aria-label="Часовой пояс">
        {regions.map((item) => <option key={item.id} value={item.id}>{utcLabel(item.off)} · {item.city} — {item.place}</option>)}
      </select>
      <button id="clockToggle" onClick={() => setCompactClock((value) => !value)} aria-label="Свернуть часы">⌃</button>
      <div className="cmain"><strong>{fmtTime(localNow)}</strong><span style={{ color: sunPhase.col }}>{sunPhase.icon} {sunPhase.name}</span></div>
      <div className="csub"><span>{localNow.toLocaleDateString("ru-RU", { timeZone: "UTC", day: "numeric", month: "long" })} · {utcLabel(region.off)}</span></div>
      {!compactClock && <>
        <div className="cctl"><span>Сдвиг</span><input type="range" min={-12} max={12} step={0.25} value={shift} onChange={(event) => setShift(Number(event.target.value))} /><b>{shift === 0 ? "сейчас" : `${shift > 0 ? "+" : ""}${shift} ч`}</b></div>
        <div className="cbtn"><button onClick={() => setShift(0)}>Сейчас</button><button onClick={() => setShift((value) => value + 1)}>⏩ Таймлапс суток</button></div>
        <div className="atmo"><div className="ainfo">{weather.icon} {weather.name} · {Math.round(temperature)} °C · ветер {windDirection} {snapshot.weather.wind.toFixed(0)} м/с{snapshot.weather.wind >= content.windLimit && <span className="warn">⚠ Ветер ≥ {content.windLimit} м/с: работы верхового запрещены</span>}</div><div className="abtns"><button className="atog" onClick={() => setWeatherOpen((value) => !value)}>Погода и сезон {weatherOpen ? "⌃" : "⌄"}</button><button className={`snd ${soundEnabled ? "on" : ""}`} aria-pressed={soundEnabled} onClick={() => void toggleSound()}>{soundEnabled ? "🔊" : "🔇"} Звук</button></div>{soundError && <div className="sound-error" role="alert">{soundError}</div>}{weatherOpen && <div className="abody"><div className="arow"><span>Сезон</span><div className="seg">{Object.entries(content.seasons).map(([id, label]) => <button key={id} className={id === "auto" ? (seasonAuto ? "on" : "") : (!seasonAuto && snapshot.weather.season === id ? "on" : "")} onClick={() => { if (id === "auto") { setSeasonAuto(true); return; } setSeasonAuto(false); setWeatherKeepingWind({ season: id as ClassicRigSnapshot["weather"]["season"] }); }}>{id === "auto" && seasonAuto ? `Авто · ${autoSeasonValue === "winter" ? "зима" : "лето"}` : label as string}</button>)}</div></div><div className="arow"><span>Погода</span><div className="seg wrap">{Object.entries(content.weather).filter(([, item]) => (item as Weather).seasons.includes(snapshot.weather.season)).map(([id, item]) => <button key={id} className={snapshot.weather.preset === id ? "on" : ""} onClick={() => setWeatherKeepingWind({ preset: id as ClassicRigSnapshot["weather"]["preset"] })}>{(item as Weather).icon} {(item as Weather).name}</button>)}</div></div><div className="arow"><span>Ветер</span><input type="range" min="0" max="25" value={snapshot.weather.windOverride ?? snapshot.weather.wind} onChange={(event) => { runtime.dispatch({ type: "set_weather", weather: { windOverride: Number(event.target.value) } }); setSnapshot(runtime.getSnapshot()); }} /><span className="wind-label">{(snapshot.weather.windOverride ?? snapshot.weather.wind).toFixed(0)} м/с</span></div></div>}</div>
      </>}
    </section>

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

    <button id="listBtn" className="glass" onClick={() => setListOpen((value) => !value)}>☰ Агрегаты</button>
    {listOpen && <section id="list" className="glass open">{(content.list as Section[]).map((section) => <div key={section.h}><h3>{section.h}</h3>{section.groups.map((group) => <div key={group.h ?? "all"}><h4>{group.h}</h4>{group.items.map((item) => { const key = cardKey(item.kind, item.id); const card = key ? content.cards[key] : null; const target = item as PickResult; return card ? <button key={item.id} className={selected?.id === item.id ? "on" : ""} onMouseEnter={() => sceneRef.current?.hover(target)} onMouseLeave={() => sceneRef.current?.hover(null)} onClick={() => select(target)}>{card.name}</button> : null; })}</div>)}</div>)}</section>}

    {selectedCard && selected && <aside id="panel" className="glass open" aria-label={`Информация: ${selectedCard.name}`}><button type="button" className="x" aria-label="Закрыть карточку" onClick={() => { setSelected(null); sceneRef.current?.highlight(null); }}>×</button><span className="rig">{kindTitle(selected.kind)}</span><span className="sys">{selectedCard.sys}</span><h2>{selectedCard.name}</h2>{selected.kind === "worker" && <div className="now on"><b>Сейчас:</b> {snapshot.workers[selected.id]?.activity}</div>}<p>{selectedCard.desc}</p><h3>Характеристики</h3><table><tbody>{selectedCard.specs.map((row: [string, string]) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td></tr>)}</tbody></table><h3>Датчики и данные</h3><ul>{selectedCard.data.map((item: string) => <li key={item}>{item}</li>)}</ul><div className="btns"><button type="button" onClick={() => sceneRef.current?.focus(selected)}>Приблизить</button></div></aside>}

    <nav id="bar" className="glass"><button onClick={() => runtime.dispatch({ type: snapshot.running ? "pause" : "start" })}>{snapshot.running ? "⏸ Пауза" : "▶ Пуск"}</button><button onClick={() => { const next = speed >= 4 ? 1 : speed * 2; setSpeed(next); runtime.dispatch({ type: "set_speed", value: next }); }}>Скорость ×{speed}</button><button type="button" className={undergroundVisible ? "on" : ""} aria-pressed={undergroundVisible} onClick={() => setCutVisible(!undergroundVisibleRef.current)}>Разрез: {undergroundVisible ? "вкл" : "выкл"}</button>{content.views.map((view: { id: string; label: string; cut?: boolean }) => <button key={view.id} onClick={() => { sceneRef.current?.setView(view.id as never); if (view.cut || view.id === "underground") setCutVisible(true); }}>{view.label}</button>)}<button onClick={() => setPanel("stats")}>📊 Статистика</button><button onClick={() => setPanel("exam")}>🎓 Экзамен</button></nav>

    {panel && <aside id="cmp" className="glass open"><button className="x" onClick={() => setPanel(null)}>×</button><h2>{panel === "stats" ? "Статистика буровой" : "Экзамен"}</h2>{panel === "stats" ? <><p>Телеметрия текущего запуска.</p><button onClick={() => { const blob = new Blob([JSON.stringify(runtime.telemetry.toJSON(), null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `rig-telemetry-${Date.now()}.json`; link.click(); }}>Выгрузить JSON</button></> : <p>Экзамены runtime доступны через пакет.</p>}</aside>}
    <div id="toast" className={toasts.length ? "on" : ""}>{toasts.map((toast, index) => <div key={`${toast}-${index}`}>{toast}</div>)}</div>
  </div>;
}
