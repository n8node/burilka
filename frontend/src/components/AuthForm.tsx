"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { getPasswordChecks, getPasswordStrength, isPasswordStrong } from "@/lib/password-policy";

type AuthFormProps = {
  mode: "login" | "register";
  labels: { email: string; password: string; submit: string; error: string; loading: string; confirmPassword: string; passwordMismatch: string; policy: string; policyLink: string; role: string; student: string; instructor: string; other: string; strength: string; university: string; universityOptional: string };
};

export function AuthForm({ mode, labels }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [requestedRole, setRequestedRole] = useState("other");
  const [universityID, setUniversityID] = useState("");
  const [universities, setUniversities] = useState<Array<{ id: string; name: string; short_name?: string }>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const strength = getPasswordStrength(password);
  const registrationReady = mode === "login" || (isPasswordStrong(password) && password === confirmPassword && policyAccepted);

  useEffect(() => {
    if (mode !== "register" || requestedRole === "other") { setUniversities([]); setUniversityID(""); return; }
    fetch("/app/api/v1/universities").then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => setUniversities(payload.universities ?? [])).catch(() => setUniversities([]));
  }, [mode, requestedRole]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/app/api/v1/auth/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, confirm_password: confirmPassword, policy_accepted: policyAccepted, requested_role: requestedRole, university_id: universityID, consent_version: "2026-11-12" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || labels.error);
      }
      // Next.js applies basePath (/app) automatically to client-side navigation.
      router.push(payload?.user?.platform_role === "superadmin" ? "/admin/" : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">{labels.email}
        <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      </label>
      <label className="block text-sm font-medium">{labels.password}
        <input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" required minLength={mode === "register" ? 8 : undefined} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
      </label>
      {mode === "register" && password.length > 0 && <div className="space-y-2">
        <div className="flex gap-1" role="meter" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={4}>{[1, 2, 3, 4].map((level) => <span key={level} className={`h-1 flex-1 rounded-full ${strength >= level ? (strength === 4 ? "bg-emerald-500" : strength === 3 ? "bg-blue-500" : strength === 2 ? "bg-amber-400" : "bg-red-400") : "bg-slate-200"}`} />)}</div>
        <ul className="space-y-1 text-xs">{checks.map((check) => <li key={check.key} className={check.valid ? "text-emerald-700" : "text-slate-500"}>{check.valid ? "✓" : "○"} {check.label}</li>)}</ul>
      </div>}
      {mode === "register" && <>
        <label className="block text-sm font-medium">{labels.confirmPassword}<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" type="password" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
        {confirmPassword && password !== confirmPassword && <p className="text-xs text-red-600">{labels.passwordMismatch}</p>}
        <label className="block text-sm font-medium">{labels.role}<select value={requestedRole} onChange={(event) => setRequestedRole(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="student">{labels.student}</option><option value="instructor">{labels.instructor}</option><option value="other">{labels.other}</option></select></label>
        {requestedRole !== "other" && <label className="block text-sm font-medium">{labels.university}<span className="ml-1 font-normal text-slate-500">({labels.universityOptional})</span><select value={universityID} onChange={(event) => setUniversityID(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">—</option>{universities.map((item) => <option key={item.id} value={item.id}>{item.short_name ? `${item.short_name} — ` : ""}{item.name}</option>)}</select></label>}
        <label className="flex items-start gap-2 text-sm text-slate-600"><input type="checkbox" checked={policyAccepted} onChange={(event) => setPolicyAccepted(event.target.checked)} className="mt-1 h-4 w-4" /><span>{labels.policy} <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{labels.policyLink}</a></span></label>
      </>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={loading || !registrationReady} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? labels.loading : labels.submit}</button>
    </form>
  );
}