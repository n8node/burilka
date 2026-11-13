import { SettingsShell } from "@/components/admin/SettingsShell";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}