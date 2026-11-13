"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type User = { email: string; platform_role: string };

const commonLinks = [
  { href: "/", label: "Обзор", icon: "▦" },
  { href: "/scenes/", label: "3D-сцены", icon: "◈" },
  { href: "/courses/", label: "Мои курсы", icon: "▤" },
  { href: "/assignments/", label: "Задания", icon: "✓" },
  { href: "/results/", label: "Результаты", icon: "◒" },
];

const instructorLinks = [
  { href: "/teaching/courses/", label: "Преподавание", icon: "▣" },
  { href: "/teaching/groups/", label: "Группы", icon: "◎" },
  { href: "/teaching/gradebook/", label: "Ведомость", icon: "▥" },
];

type Props = { user: User; children: React.ReactNode };

export function DashboardShell({ user, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isInstructor = user.platform_role === "instructor";

  async function logout() {
    await fetch("/app/api/v1/auth/logout", { method: "POST", credentials: "include" });
    router.push("/auth/login");
    router.refresh();
  }

  function active(href: string) {
    if (href === "/") return pathname === "/" || pathname === "/app" || pathname === "/app/";
    return pathname.startsWith(href);
  }

  const nav = isInstructor ? [...commonLinks, ...instructorLinks] : commonLinks;

  return <div className="min-h-screen bg-slate-100 text-slate-900 lg:pl-[236px]">
    <div className={`fixed inset-y-0 left-0 z-40 w-[236px] transform bg-white shadow-sm transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <aside className="flex h-full flex-col border-r border-slate-200">
        <div className="flex h-16 items-center border-b border-slate-200 px-5"><Link href="/" className="text-lg font-bold tracking-wide text-slate-900">BURILKA <span className="text-[10px] font-semibold text-blue-600">RIGSIM EDU</span></Link></div>
        <div className="mx-3 mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Профиль</p><p className="mt-2 truncate text-sm font-semibold">{user.email}</p><p className="mt-1 text-xs text-slate-500">{isInstructor ? "Преподаватель" : "Студент"}</p></div>
        <nav className="mt-5 flex-1 overflow-y-auto px-3"><p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Кабинет</p><ul className="space-y-1">{nav.map((item) => <li key={item.href}><Link href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active(item.href) ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><span className="w-5 text-center text-base text-slate-500">{item.icon}</span>{item.label}</Link></li>)}</ul><p className="mb-2 mt-7 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Профиль</p><ul className="space-y-1"><li><Link href="/profile/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><span className="w-5 text-center">◉</span>Мой профиль</Link></li><li><Link href="/settings/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><span className="w-5 text-center">⚙</span>Настройки</Link></li></ul></nav>
        <div className="border-t border-slate-200 p-4"><button type="button" onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900">Выйти</button></div>
      </aside>
    </div>
    {open && <button aria-label="Закрыть меню" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" />}
    <div className="min-w-0"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6"><button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:hidden">Меню</button><div className="hidden text-sm text-slate-500 lg:block">Личный кабинет <span className="mx-2 text-slate-300">/</span> {isInstructor ? "Преподавание" : "Обучение"}</div><div className="flex items-center gap-3"><Link href="/scenes/" className="hidden rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:inline-flex">Открыть тренажёры</Link><span className="max-w-[180px] truncate text-sm text-slate-600">{user.email}</span></div></header><main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8">{children}</main></div>
  </div>;
}