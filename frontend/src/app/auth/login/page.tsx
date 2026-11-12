import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function LoginPage() {
  const t = await getTranslations("app");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-blue-700">{t("name")}</Link>
        <h1 className="mt-6 text-2xl font-bold">{t("login")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("preparation")}</p>
        <form className="mt-6 space-y-4">
          <label className="block text-sm font-medium">{t("email")}<input autoComplete="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="block text-sm font-medium">{t("password")}<input autoComplete="current-password" type="password" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
          <button type="button" disabled className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white opacity-60">{t("submit")}</button>
        </form>
        <p className="mt-6 text-sm text-slate-600"><Link className="font-semibold text-blue-700" href="/auth/register">{t("register")}</Link></p>
      </section>
    </main>
  );
}