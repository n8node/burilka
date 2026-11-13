"use client";

import { useCallback, useEffect, useState } from "react";

type University = { id: string; name: string; short_name?: string; is_active: boolean; created_at: string; students: number; instructors: number };

export default function UniversitiesPage() {
  const [items, setItems] = useState<University[]>([]);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [editing, setEditing] = useState<University | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/app/api/v1/admin/universities?q=${encodeURIComponent(query)}&sort=${sort}`, { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить список ВУЗов");
    const payload = await response.json();
    setItems(payload.universities ?? []);
  }, [query, sort]);

  useEffect(() => { load().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, [load]);

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

  async function update(event: React.FormEvent) { event.preventDefault(); if (!editing) return; setSaving(true); setError(""); try { const response = await fetch(`/app/api/v1/admin/universities/${editing.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editing.name, short_name: editing.short_name ?? "" }) }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.message ?? "Не удалось сохранить ВУЗ"); setEditing(null); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить ВУЗ"); } finally { setSaving(false); } }
  async function remove(item: University) { if (!window.confirm(`Удалить ВУЗ «${item.name}»? Он исчезнет из регистрации, связи пользователей сохранятся.`)) return; const response = await fetch(`/app/api/v1/admin/universities/${item.id}`, { method: "DELETE", credentials: "include" }); if (!response.ok) { const payload = await response.json().catch(() => null); setError(payload?.message ?? "Не удалось удалить ВУЗ"); return; } await load(); }

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
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-6 py-4"><span className="font-semibold">Добавленные ВУЗы</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск" className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm" /><select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="name">По алфавиту</option><option value="name_desc">По алфавиту (Я—А)</option><option value="date_desc">Сначала новые</option><option value="date_asc">Сначала старые</option><option value="students">Больше студентов</option><option value="instructors">Больше преподавателей</option></select></div>
        {loading ? <p className="p-6 text-slate-500">Загрузка…</p> : items.length === 0 ? <p className="p-6 text-slate-500">ВУЗы ещё не добавлены.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">ВУЗ</th><th className="px-6 py-3">Добавлен</th><th className="px-6 py-3">Студенты</th><th className="px-6 py-3">Преподаватели</th><th className="px-6 py-3">Действия</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.id}><td className="px-6 py-4"><div className="font-medium">{item.name}</div><div className="text-xs text-slate-500">{item.short_name || "Без сокращения"}</div></td><td className="px-6 py-4 text-slate-500">{new Date(item.created_at).toLocaleDateString("ru-RU")}</td><td className="px-6 py-4">{item.students}</td><td className="px-6 py-4">{item.instructors}</td><td className="px-6 py-4"><button onClick={() => setEditing(item)} className="mr-3 text-blue-700 hover:underline">Изменить</button><button onClick={() => remove(item)} className="text-red-700 hover:underline">Удалить</button></td></tr>)}</tbody></table></div>}
      </section>
      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={update} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"><h3 className="text-lg font-semibold">Редактировать ВУЗ</h3><label className="mt-4 block text-sm font-medium">Полное название<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="mt-4 block text-sm font-medium">Краткое название<input value={editing.short_name ?? ""} onChange={(e) => setEditing({ ...editing, short_name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2">Отмена</button><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Сохранить</button></div></form></div>}
  </div>;
}