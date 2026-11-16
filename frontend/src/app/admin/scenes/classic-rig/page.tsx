import Link from "next/link";

export default function ClassicRigAdminScenePage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">Администрирование / 3D-сцены / Классическая буровая</p>
        <h1 className="mt-2 text-2xl font-semibold">Классическая буровая — референсный тренажёр</h1>
        <p className="mt-1 text-sm text-slate-500">Оригинальный runtime: бурение, работа агрегатов, маршруты бригад и управление операциями совпадают с референсной сценой.</p>
        <Link href="/admin/scenes/classic-rig/glb/" className="mt-2 inline-block text-sm text-blue-700 hover:underline">Открыть отдельную GLB-сборку →</Link>
      </div>
      <iframe title="Референсный тренажёр буровой" src="/app/drillai/index.html" allow="autoplay" className="h-[min(760px,75vh)] min-h-[520px] w-full rounded-xl border border-slate-300 bg-slate-950" />
    </div>
  );
}