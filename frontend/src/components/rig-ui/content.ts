import raw from "@/content/rig-ui-classic-content.json";
// Content is authored JSON; the UI deliberately keeps its schema data-driven.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const content = raw as any;
export type UnitKind = "equipment" | "worker" | "camp";
export const fmt = (value: string, vars: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
export const cardKey = (kind: UnitKind, id: string) => content.units[kind][id] as string | undefined;