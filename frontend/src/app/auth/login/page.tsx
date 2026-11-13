import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage() {
  const t = await getTranslations("app");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-blue-700">{t("name")}</Link>
        <h1 className="mt-6 text-2xl font-bold">{t("login")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("preparation")}</p>
        <AuthForm mode="login" labels={{ email: t("email"), password: t("password"), submit: t("submit"), error: t("authError"), loading: t("loading"), confirmPassword: t("confirmPassword"), passwordMismatch: t("passwordMismatch"), policy: t("policy"), policyLink: t("policyLink"), role: t("role"), student: t("student"), instructor: t("instructor"), other: t("other"), strength: t("strength") }} />
        <p className="mt-6 text-sm text-slate-600"><Link className="font-semibold text-blue-700" href="/auth/register">{t("register")}</Link></p>
      </section>
    </main>
  );
}