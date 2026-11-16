"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const manifest = [
  ["substructure", "Основание", "/app/rig-glb/01_classic_rig/substructure.glb"],
  ["mast", "Мачта", "/app/rig-glb/01_classic_rig/mast.glb"],
  ["crown", "Кронблок", "/app/rig-glb/01_classic_rig/crown.glb"],
  ["travel", "Талевый блок и крюк", "/app/rig-glb/01_classic_rig/travel.glb"],
  ["topdrive", "Верхний привод", "/app/rig-glb/01_classic_rig/topdrive.glb"],
  ["drawworks", "Буровая лебёдка", "/app/rig-glb/01_classic_rig/drawworks.glb"],
  ["bop", "ПВО", "/app/rig-glb/01_classic_rig/bop.glb"],
  ["accumulator", "Станция гидроуправления ПВО", "/app/rig-glb/01_classic_rig/accumulator.glb"],
  ["choke", "Дроссельный манифольд", "/app/rig-glb/01_classic_rig/choke.glb"],
  ["mudpumps", "Буровые насосы", "/app/rig-glb/01_classic_rig/mudpumps.glb"],
  ["tanks", "Ёмкости ЦСГО", "/app/rig-glb/01_classic_rig/tanks.glb"],
  ["shakers", "Вибросита", "/app/rig-glb/01_classic_rig/shakers.glb"],
] as const;

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