"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";

type Scene = { id: string; slug: string; name: string; description: string; difficulty: string; available_modes: string[] };
type User = { email: string; platform_role: string };

const modeLabels: Record<string, { title: string; description: string }> = {
  anatomy: { title: "Экскурсия / Анатомия", description: "Изучение агрегатов и систем буровой установки." },
  demonstration: { title: "Демонстрация процессов", description: "Наблюдение за технологическими операциями." },
  guided: { title: "Пошаговая тренировка", description: "Выполнение операции по инструкции." },
  manual: { title: "Ручное управление", description: "Самостоятельное управление параметрами бурения." },
  complication: { title: "Сценарий осложнения", description: "Отработка нештатных ситуаций." },
  exam: { title: "Экзамен", description: "Проверка знаний без подсказок." },
};

export default function ScenePage({ params }: { params: Promise<{ slug: string }> }) {
  const [scene, setScene] = useState<Scene | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [lastLaunch, setLastLaunch] = useState<{ started_at: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { params.then(async ({ slug }) => { try { const [sceneResponse, meResponse, launchResponse] = await Promise.all([fetch(`/app/api/v1/scenes/${slug}`), fetch("/app/api/v1/auth/me", { credentials: "include" }), fetch("/app/api/v1/scenes/last-launch", { credentials: "include" })]); if (!sceneResponse.ok || !meResponse.ok) throw new Error("Сцена не найдена"); setScene(await sceneResponse.json()); setUser((await meResponse.json()).user); setLastLaunch((await launchResponse.json()).launch); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось загрузить сцену"); } }); }, [params]);
  if (error) return <main className="p-8 text-red-700">{error}</main>;
  if (!scene || !user) return <main className="p-8 text-slate-500">Загрузка…</main>;
  const difficulty = scene.difficulty === "basic" ? "Базовый уровень" : scene.difficulty === "advanced" ? "Продвинутый уровень" : "Экспертный уровень";
  return <DashboardShell user={user}><div className="w-full space-y-6"><Link href="/scenes/" className="text-sm text-slate-500 hover:text-blue-700">← Все сцены</Link><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-semibold uppercase tracking-wide text-blue-700">3D-тренажёр</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{difficulty}</span></div><h1 className="mt-3 text-3xl font-bold md:text-4xl">{scene.name}</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{scene.description}</p><div className="relative mt-8 flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700"><div className="relative text-center text-white"><div className="text-7xl">⛏</div><p className="mt-3 text-sm text-slate-300">Классическая буровая установка</p></div></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Ваш прогресс</p><p className="mt-1 text-2xl font-bold">0%</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Запусков</p><p className="mt-1 text-2xl font-bold">{lastLaunch ? "1+" : "0"}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Последний запуск</p><p className="mt-1 text-sm font-semibold">{lastLaunch ? new Date(lastLaunch.started_at).toLocaleDateString("ru-RU") : "Ещё не запускали"}</p></div></div><div className="mt-8"><h2 className="text-xl font-semibold">Что вы изучите</h2><ul className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><li>• Основные агрегаты и системы буровой</li><li>• Последовательность технологических операций</li><li>• Циркуляционную и талевую системы</li><li>• Безопасность и контроль параметров</li></ul></div></section><aside className="h-fit rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Режимы обучения</h2><div className="mt-4 space-y-2">{scene.available_modes.map((mode) => { const meta = modeLabels[mode] ?? { title: mode, description: "Учебный режим" }; return <div key={mode} className={`rounded-lg p-3 ${mode === "anatomy" ? "border border-blue-200 bg-blue-50" : "bg-slate-50"}`}><p className="text-sm font-semibold">{meta.title}</p><p className="mt-1 text-xs text-slate-500">{meta.description}</p></div>; })}</div><a href={`/app/scenes/${scene.slug}/run/`} className="mt-6 block rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700">Начать изучение</a></aside></div></div></DashboardShell>;
}