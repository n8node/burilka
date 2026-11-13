export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Настройки / Общие настройки</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Общие настройки</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Основные параметры платформы Burilka. Специализированные настройки доступны в подразделах слева.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Настройки платформы</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Этот раздел будет содержать глобальные параметры тренажёра, режимы доступа,
          настройки локализации и системные параметры. Сейчас доступен раздел управления ВУЗами.
        </p>
        <a
          href="/app/admin/settings/universities/"
          className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Открыть список ВУЗов
        </a>
      </section>
    </div>
  );
}