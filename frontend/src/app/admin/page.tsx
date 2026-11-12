export default function AdminHomePage() {
  return (
    <main className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="flex w-60 flex-col bg-slate-950 px-4 py-5 text-slate-200">
        <div className="border-b border-white/10 pb-5 text-lg font-bold tracking-wide text-white">BURILKA <span className="text-xs text-blue-300">SUPERADMIN</span></div>
        <nav className="mt-6 space-y-2 text-sm">
          <p className="px-2 py-2 text-xs uppercase tracking-wider text-slate-500">Платформа</p>
          <div className="rounded-md bg-blue-600 px-3 py-2 text-white">Обзор</div>
          <div className="rounded-md px-3 py-2 text-slate-300">Организации и пользователи</div>
          <div className="rounded-md px-3 py-2 text-slate-300">Учебный контент и сцены</div>
          <div className="rounded-md px-3 py-2 text-slate-300">Сценарии и оценивание</div>
          <div className="rounded-md px-3 py-2 text-slate-300">Настройки платформы</div>
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4 text-xs text-slate-400">Доступ суперадмина будет включён после подключения авторизации.</div>
      </aside>
      <section className="flex-1">
        <header className="border-b border-slate-200 bg-white px-6 py-4 text-sm text-slate-500">Администрирование / Обзор</header>
        <div className="p-8"><h1 className="text-3xl font-bold">Админ-панель Burilka</h1><p className="mt-3 text-slate-600">Начальная визуальная оболочка. Защищённые разделы и API подключаются следующим этапом.</p></div>
      </section>
    </main>
  );
}