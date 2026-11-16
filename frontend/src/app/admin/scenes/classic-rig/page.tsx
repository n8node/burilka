import { ClassicRigSceneViewer } from "@/components/admin/ClassicRigSceneViewer";

export default function ClassicRigAdminScenePage() {
  return <div className="space-y-5"><div><p className="text-sm text-slate-500">Администрирование / 3D-сцены / Классическая буровая</p><h1 className="mt-2 text-2xl font-semibold">Классическая буровая — модульная GLB-сцена</h1><p className="mt-1 text-sm text-slate-500">Управляемый сценарий бурения: этапы, параметры оборудования и задачи бригады задаются отдельно от 3D-сцены.</p></div><ClassicRigSceneViewer /></div>;
}