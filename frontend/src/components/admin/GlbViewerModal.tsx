"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function GlbViewerModal({ name, url, onClose }: { name: string; url: string; onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState("Загрузка модели…");
  useEffect(() => {
    const element = host.current; if (!element) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#eef2f7");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000); camera.position.set(3, 2, 4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.target.set(0, 1, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 2)); const key = new THREE.DirectionalLight(0xffffff, 2.5); key.position.set(4, 8, 5); scene.add(key);
    const grid = new THREE.GridHelper(10, 20, 0xcbd5e1, 0xe2e8f0); scene.add(grid);
    let root: THREE.Object3D | null = null; let frame = 0;
    const resize = () => { const width = element.clientWidth || 1; const height = element.clientHeight || 1; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
    const fit = (object: THREE.Object3D) => { const box = new THREE.Box3().setFromObject(object); const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3()); const max = Math.max(size.x, size.y, size.z); camera.position.copy(center).add(new THREE.Vector3(max * 1.4, max * 0.9, max * 1.4)); controls.target.copy(center); controls.update(); };
    const loader = new GLTFLoader(); loader.load(url, (gltf) => { root = gltf.scene; scene.add(root); fit(root); setState("Готово"); }, undefined, () => setState("Не удалось загрузить GLB-модель"));
    const animate = () => { frame = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }; animate(); resize(); window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); controls.dispose(); renderer.dispose(); if (root) { root.traverse((object) => { const mesh = object as THREE.Mesh; if (mesh.geometry) mesh.geometry.dispose(); const material = mesh.material; if (Array.isArray(material)) material.forEach((item) => item.dispose()); else material?.dispose(); }); } renderer.domElement.remove(); };
  }, [url]);
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label={name} onClick={onClose}><div className="flex h-[min(780px,90vh)] w-[min(1100px,96vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold">{name}</h2><p className="text-xs text-slate-500">GLB · preview/standard · {state}</p></div><button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">Закрыть</button></div><div ref={host} className="min-h-0 flex-1" /></div></div>;
}