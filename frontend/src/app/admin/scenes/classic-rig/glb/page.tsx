import Link from "next/link";
import { ClassicRigSceneViewer } from "@/components/admin/ClassicRigSceneViewer";

export default function ClassicRigGlbScenePage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">Администрирование / 3D-сцены / Классическая буровая</p>
        <h1 className="mt-2 text-2xl font-semibold">Модульная GLB-сборка</h1>
        <p className="mt-1 text-sm text-slate-500">Отдельный прототип из GLB-моделей; его анимации и сценарии не совпадают с референсным тренажёром.</p>
        <Link href="/admin/scenes/classic-rig/" className="mt-2 inline-block text-sm text-blue-700 hover:underline">← К референсной сцене</Link>
      </div>
      <ClassicRigSceneViewer />
    </div>
  );
}