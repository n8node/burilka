"use client";

import { useEffect, useState } from "react";

type University = { id: string; name: string; short_name?: string; is_active: boolean };

export default function UniversitiesPage() {
  const [items, setItems] = useState<University[]>([]);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/app/api/v1/admin/universities", { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить список ВУЗов");
    const payload = await response.json();
    setItems(payload.universities ?? []);
  }

  useEffect(() => { load().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const response = await fetch("/app/api/v1/admin/universities", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, short_name: shortName }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message ?? "Не удалось добавить ВУЗ");
      setItems((current) => [...current, payload].sort((a, b) => a.name.localeCompare(b.name, "ru")));
      setName(""); setShortName("");
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось добавить ВУЗ"); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6">
      <div><p className="text-sm text-slate-500">Настройки / Список ВУЗов</p><h2 className="mt-2 text-2xl font-semibold">Список ВУЗов</h2><p className="mt-1 text-sm text-slate-500">ВУЗы отображаются студентам и преподавателям при регистрации. Выбор при регистрации необязателен.</p></div>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Добавить ВУЗ</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-[1fr_240px_auto] md:items-end">
          <label className="text-sm font-medium">Полное название<input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="Московский государственный университет" /></label>
          <label className="text-sm font-medium">Краткое название<input value={shortName} onChange={(e) => setShortName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" placeholder="МГУ" /></label>
          <button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "Сохраняем…" : "Добавить"}</button>
        </form>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4 font-semibold">Добавленные ВУЗы</div>
        {loading ? <p className="p-6 text-slate-500">Загрузка…</p> : items.length === 0 ? <p className="p-6 text-slate-500">ВУЗы ещё не добавлены.</p> : <ul className="divide-y divide-slate-100">{items.map((item) => <li key={item.id} className="flex items-center justify-between px-6 py-4"><span>{item.name}</span><span className="text-sm text-slate-500">{item.short_name || "—"}</span></li>)}</ul>}
      </section>
  </div>;
}