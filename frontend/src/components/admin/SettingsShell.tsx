"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsItems = [
  { href: "/admin/settings/", label: "Общие настройки", description: "Параметры платформы" },
  { href: "/admin/settings/universities/", label: "Список ВУЗов", description: "Университеты для регистрации" },
  { href: "/admin/settings/", label: "Локализация", description: "Языки и язык по умолчанию" },
  { href: "/admin/settings/", label: "Безопасность", description: "Сессии и политики доступа" },
];

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="space-y-4">
    <div><p className="text-sm text-slate-500">Главная / Настройки</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Настройки платформы</h1><p className="mt-1 text-sm text-slate-500">Глобальные параметры Burilka, сгруппированные по темам.</p></div>
    <div className="flex min-h-[620px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50"><div className="border-b border-slate-200 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Разделы</p></div><nav className="flex-1 overflow-y-auto p-2"><ul className="space-y-0.5">{settingsItems.map((item, index) => { const active = item.href.includes("universities") ? pathname.startsWith("/admin/settings/universities") : pathname === "/admin/settings" || pathname === "/admin/settings/"; return <li key={`${item.label}-${index}`}><Link href={item.href} className={`block rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"}`}><span>{item.label}</span><span className="mt-0.5 block text-xs text-slate-400">{item.description}</span></Link></li>; })}</ul></nav></aside>
      <div className="min-w-0 flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  </div>;
}