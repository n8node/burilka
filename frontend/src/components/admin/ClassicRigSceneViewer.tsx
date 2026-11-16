"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
const classicAssets = [
  ["substructure", "Основание (вышечный блок)", "substructure"], ["mast", "Вышка (мачта А-типа)", "mast"], ["crown", "Кронблок", "crown"], ["travel", "Талевый блок и крюк", "travel"], ["topdrive", "Верхний привод (СВП)", "topdrive"], ["drawworks", "Буровая лебёдка", "drawworks"], ["deadline", "Неподвижный конец каната", "deadline"], ["rotary", "Ротор", "rotary"], ["roughneck", "Буровой ключ", "roughneck"], ["setback", "Подсвечник и балкон верхового", "setback"], ["doghouse", "Кабина бурильщика", "doghouse"], ["catwalk", "Приёмные мостки", "catwalk"], ["bop", "ПВО", "bop"], ["accumulator", "Станция гидроуправления ПВО", "accumulator"], ["choke", "Дроссельный манифольд", "choke"], ["mudpumps", "Буровые насосы", "mudpumps"], ["standpipe", "Стояк и буровой рукав", "standpipe"], ["tanks", "Ёмкости ЦСГО и блок приготовления", "tanks"], ["shakers", "Вибросита и жёлобная система", "shakers"], ["cuttings", "Шламовый бункер", "cuttings"], ["desander", "Пескоотделитель и илоотделитель", "desander"], ["degasser", "Дегазатор", "degasser"], ["centrifuge", "Центрифуга", "centrifuge"], ["gensets", "ДЭС и склад ГСМ", "gensets"], ["vfd", "Электроблок и ЧРП", "vfd"], ["compressor", "Компрессорная", "compressor"], ["boiler", "Котельная", "boiler"], ["gti", "Станция ГТИ", "gti"], ["piperack", "Стеллажи с трубами", "piperack"], ["rails", "Эшелонная система перемещения", "rails"], ["cluster", "Устья скважин куста", "cluster"], ["drillstring", "Бурильная колонна", "drillstring"], ["casing", "Обсадные колонны", "casing"], ["bha", "КНБК и долото", "bha"], ["trajectory", "Траектории скважин", "trajectory"], ["cementFleet", "Цементировочный флот", "cementFleet"],
] as const;
const campAssets = [["camp-living", "Жилые вагон-дома", "living"], ["camp-canteen", "Столовая", "canteen"], ["camp-banya", "Баня-сушилка", "banya"], ["camp-office", "Вагон мастера (диспетчерская)", "office"], ["camp-medic", "Медпункт", "medic"], ["camp-power", "Энергоснабжение и вода городка", "power"], ["camp-vehicles", "Вахтовый транспорт", "vehicles"]] as const;
const crewAssets = [["crew-driller", "Бурильщик", "driller_A"], ["crew-helper1", "Помощник бурильщика", "helper1_A"], ["crew-helper2", "Помощник бурильщика 2", "helper2_A"], ["crew-derrick", "Верховой рабочий", "derrick_A"], ["crew-mechanic", "Слесарь-дизелист", "mech_A"], ["crew-mud", "Помбур на ЦСГО", "mud_A"], ["crew-electric", "Электромонтёр", "electric_A"], ["crew-master", "Буровой мастер", "master"], ["crew-gti", "Оператор станции ГТИ", "gti"], ["crew-shift1", "Сменная вахта 1", "shift1"], ["crew-shift2", "Сменная вахта 2", "shift2"], ["crew-cook", "Повар", "cook"]] as const;
const manifest = [...classicAssets.map(([id, name, file]) => [id, name, `/app/rig-glb/01_classic_rig/${file}.glb`] as const), ...campAssets.map(([id, name, file]) => [id, name, `/app/rig-glb/03_camp/${file}.glb`] as const), ...crewAssets.map(([id, name, file]) => [id, name, `/app/rig-characters/${file}.glb`] as const)];
type State = "stopped" | "running" | "bop-closed";

export function ClassicRigSceneViewer() {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("stopped");
  const [loading, setLoading] = useState("Загрузка manifest…");
  const [loaded, setLoaded] = useState(0);
  const [build, setBuild] = useState(1);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dbe4ef");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(85, 55, 105);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 18, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x526274, 2.5));
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(80, 120, 60);
    scene.add(sun);
    scene.add(new THREE.GridHelper(220, 44, 0x9aaabd, 0xcbd5e1));
    const roots = new Map<string, THREE.Object3D>();
    let frame = 0;
    let time = 0;
    let disposed = false;
    const resize = () => { const width = element.clientWidth || 1; const height = element.clientHeight || 1; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
    const loader = new GLTFLoader();
    const fit = () => { const box = new THREE.Box3().setFromObject(scene); const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3()); const max = Math.max(size.x, size.y, size.z); camera.position.copy(center).add(new THREE.Vector3(max * 0.75, max * 0.5, max * 0.85)); controls.target.copy(center); controls.update(); };
    let loadedCount = 0;
    Promise.all(manifest.map(([id, , url]) => new Promise<void>((resolve) => loader.load(url, (gltf) => { roots.set(id, gltf.scene); scene.add(gltf.scene); loadedCount += 1; setLoaded(loadedCount); resolve(); }, undefined, () => resolve())))).then(() => { if (!disposed) { fit(); setLoading(`Собрано агрегатов: ${loadedCount} из ${manifest.length}`); } });
    const animate = () => { frame = requestAnimationFrame(animate); time += 0.016; if (state === "running") { const travel = roots.get("travel"); if (travel) travel.position.y += Math.sin(time * 1.2) * 0.025; const topdrive = roots.get("topdrive"); if (topdrive) topdrive.rotation.y += 0.012; const pumps = roots.get("mudpumps"); if (pumps) pumps.rotation.x += 0.004; } controls.update(); renderer.render(scene, camera); };
    animate(); resize(); window.addEventListener("resize", resize);
    return () => { disposed = true; cancelAnimationFrame(frame); window.removeEventListener("resize", resize); controls.dispose(); renderer.dispose(); roots.forEach((root) => root.traverse((object) => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); const material = mesh.material; if (Array.isArray(material)) material.forEach((item) => item.dispose()); else material?.dispose(); })); renderer.domElement.remove(); };
  }, [build, state]);

  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-500">Сцена classic-rig · сборка {build}</p><p className="mt-1 text-sm text-slate-600">{loading} · {loaded}/{manifest.length}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setState("running")} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Запустить</button><button type="button" onClick={() => setState("stopped")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">Пауза</button><button type="button" onClick={() => setState("bop-closed")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Проверить ПВО</button><button type="button" onClick={() => setBuild((value) => value + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">Пересобрать</button></div></div><div ref={host} className="h-[min(680px,70vh)] min-h-[420px] overflow-hidden rounded-xl border border-slate-300 bg-slate-200 shadow-inner" /><div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-white p-3 text-sm"><span className="text-slate-500">Состояние runtime</span><p className="mt-1 font-semibold">{state === "running" ? "Работает" : state === "bop-closed" ? "ПВО закрыто (тест)" : "Остановлен"}</p></div><div className="rounded-lg bg-white p-3 text-sm"><span className="text-slate-500">Анимационный слой</span><p className="mt-1 font-semibold">Согласованный orchestrator</p></div><div className="rounded-lg bg-white p-3 text-sm"><span className="text-slate-500">Версия manifest</span><p className="mt-1 font-semibold">classic-rig / {build}</p></div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">Подключённые агрегаты</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{manifest.map(([id, name]) => <div key={id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-medium">{name}</span><span className="ml-2 text-xs text-slate-400">{id}</span></div>)}</div></div></div>;
}