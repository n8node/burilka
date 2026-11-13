import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

type MeResponse = { user?: { email: string; platform_role: string } };

async function getCurrentUser() {
  const requestHeaders = await headers();
  const response = await fetch(`${process.env.INTERNAL_API_URL ?? "http://backend:8080"}/api/v1/auth/me`, { headers: { cookie: requestHeaders.get("cookie") ?? "" }, cache: "no-store" }).catch(() => null);
  if (!response?.ok) redirect("/auth/login");
  const payload = (await response.json()) as MeResponse;
  if (!payload.user) redirect("/auth/login");
  return payload.user;
}

export default async function AppHomePage() {
  const user = await getCurrentUser();
  const isInstructor = user.platform_role === "instructor";
  return <DashboardShell user={user}><div className="w-full space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Burilka · RigSim Edu</p><h1 className="mt-2 text-3xl font-bold">Обзор обучения</h1><p className="mt-1 text-slate-600">{isInstructor ? "Управляйте обучением групп и контролируйте результаты студентов." : "Продолжайте обучение и изучайте устройство буровой."}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Прогресс обучения","0%"],["Пройдено модулей","0"],["Средний результат","—"],[isInstructor ? "Студенты" : "Время в тренажёре",isInstructor ? "0" : "0 ч"]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{isInstructor ? "Рабочее пространство преподавателя" : "Продолжить обучение"}</p><h2 className="mt-2 text-xl font-semibold">{isInstructor ? "Начните с управления курсами" : "Выберите 3D-тренажёр"}</h2><p className="mt-2 max-w-2xl text-slate-600">{isInstructor ? "Создавайте задания, работайте с группами и просматривайте результаты студентов." : "Изучайте устройство буровой, процессы бурения и сценарии осложнений в интерактивных сценах."}</p><Link href={isInstructor ? "/teaching/courses/" : "/scenes/"} className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white">{isInstructor ? "Открыть курсы" : "Открыть каталог сцен"}</Link></section></div></DashboardShell>;
}