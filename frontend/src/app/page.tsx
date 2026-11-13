import Link from "next/link";

export default function AppHomePage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900 md:px-10">
      <div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Burilka · RigSim Edu</p><h1 className="mt-2 text-3xl font-bold">Обзор обучения</h1><p className="mt-1 text-slate-600">Ваш личный кабинет и доступные тренажёры бурения.</p></div><div className="flex gap-3"><Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold" href="/scenes/">3D-сцены</Link><Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold" href="/auth/login">Войти</Link></div></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Прогресс обучения","0%"],["Пройдено модулей","0"],["Средний результат","—"],["Время в тренажёре","0 ч"]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">Продолжить обучение</p><h2 className="mt-2 text-xl font-semibold">Выберите 3D-тренажёр</h2><p className="mt-2 max-w-2xl text-slate-600">Изучайте устройство буровой, процессы бурения и сценарии осложнений в интерактивных сценах.</p><Link href="/scenes/" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white">Открыть каталог сцен</Link></section>
      </div>
    </main>
  );
}