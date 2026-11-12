import Link from "next/link";

export default function AppHomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Burilka · RigSim Edu</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Виртуальный тренажёр буровой</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Подготовительная версия платформы. Кабинет, роли, учебные курсы и 3D-тренажёр будут подключаться поэтапно.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700" href="/auth/login">Войти</Link>
        <Link className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50" href="/auth/register">Создать аккаунт</Link>
      </div>
      <p className="mt-12 text-sm text-slate-500">Интерфейс подготовлен к русскому, английскому, китайскому, немецкому и арабскому языкам.</p>
    </main>
  );
}