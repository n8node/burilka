"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type AdminShellProps = { email: string; children: React.ReactNode };

const sections = [
  { title: "Обзор", items: [{ href: "/admin/", label: "Сводка" }] },
  {
    title: "Платформа",
    items: [
      { href: "/admin/users/", label: "Пользователи" },
      { href: "/admin/", label: "Организации и пользователи" },
      { href: "/admin/", label: "Учебный контент и сцены" },
      { href: "/admin/", label: "Сценарии и оценивание" },
      { href: "/admin/settings/", label: "Настройки" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin/") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(href);
}

export function AdminShell({ email, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/app/api/v1/auth/logout", { method: "POST", credentials: "include" });
    router.push("/auth/login");
    router.refresh();
  }

  const current = pathname.startsWith("/admin/settings") ? "Настройки" : pathname.startsWith("/admin") ? "Сводка" : "Администрирование";

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-950 px-4 py-5 text-slate-200">
        <div className="border-b border-white/10 pb-5 text-lg font-bold tracking-wide text-white">BURILKA <span className="text-xs text-blue-300">SUPERADMIN</span></div>
        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto text-sm">
          {sections.map((section) => <div key={section.title}>
            <p className="px-2 py-2 text-xs uppercase tracking-wider text-slate-500">{section.title}</p>
            <ul className="space-y-0.5">{section.items.map((item, index) => <li key={`${item.href}-${item.label}-${index}`}>
              <Link href={item.href} className={`block rounded-md px-3 py-2 transition-colors ${isActive(pathname, item.href) && !(item.href === "/admin/" && item.label !== "Сводка") ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>{item.label}</Link>
            </li>)}</ul>
          </div>)}
        </nav>
        <div className="border-t border-white/10 pt-4">
          <p className="truncate text-sm font-medium text-white">{email}</p>
          <p className="mt-0.5 text-xs text-slate-500">Superadmin</p>
          <div className="mt-3 flex gap-3 text-xs"><Link href="/" className="text-blue-300 hover:underline">В приложение</Link><button type="button" onClick={logout} className="text-slate-400 hover:text-white">Выйти</button></div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur"><p className="text-sm text-slate-500">Admin <span className="text-slate-300">/</span> <span className="text-slate-800">{current}</span></p></header>
        <main className="min-w-0 flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}