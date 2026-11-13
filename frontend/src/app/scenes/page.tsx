import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ScenesCatalog } from "@/components/scenes/ScenesCatalog";

type MeResponse = { user?: { email: string; platform_role: string } };
async function getCurrentUser(){const h=await headers();const r=await fetch(`${process.env.INTERNAL_API_URL??"http://backend:8080"}/api/v1/auth/me`,{headers:{cookie:h.get("cookie")??""},cache:"no-store"}).catch(()=>null);if(!r?.ok)redirect("/auth/login");const p=(await r.json()) as MeResponse;if(!p.user)redirect("/auth/login");return p.user;}
export default async function ScenesPage(){const user=await getCurrentUser();return <DashboardShell user={user}><ScenesCatalog/></DashboardShell>}