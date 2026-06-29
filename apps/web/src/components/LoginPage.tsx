import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { applyThemeVariables, getNextTheme, getResolvedTheme, getStoredAppearance, getSystemTheme, isDarkTheme, saveStoredTheme, themes } from "./data.js";
import { Icon as AppIcon } from "./icons";
import { getAuthenticatedUser, isEmailVerificationRequiredError, loginWithEmail, registerWithEmail } from "../fetchs/authFetchs";
import { saveLanguage } from "../i18n";

const Icon = {
  github: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
  google: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
  mail: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  lock: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  user: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>,
  arrow: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
};

type LoginPageProps = {
  mode?: "login" | "signup";
  onAuthenticated?: (authenticatedUser: unknown) => void;
  onNeedsEmailVerification?: () => void;
};

type FieldProps = {
  label: string;
  icon: ReactNode;
  children: ReactNode;
};

const inputClassName = "flex-1 bg-transparent border-0 text-[13px] px-2.5 py-2.5 outline-none font-[inherit] text-[var(--sos-text)]";
const disabledGhostButtonClassName = "w-full bg-[var(--sos-hover)] border border-[var(--sos-border-light)] rounded-lg text-[13px] px-3.5 py-3 cursor-not-allowed font-[inherit] font-[550] flex items-center justify-center gap-2.5 opacity-[0.72] transition-all duration-[120ms] text-[var(--sos-text)]";

export default function LoginPage({ mode = "login", onAuthenticated, onNeedsEmailVerification }: LoginPageProps) {
  const { t: tr, i18n } = useTranslation();
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [appearance, setAppearance] = useState(getStoredAppearance);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const theme = getResolvedTheme(appearance, systemTheme);
  const t = themes[theme];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    applyThemeVariables(t);
    saveStoredTheme(appearance);
  }, [appearance, t]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setServerError("");

    try {
      if (isSignup) {
        await registerWithEmail({ name, email, password });
        const authenticatedUser = await getAuthenticatedUser().catch(() => null);
        flushSync(() => {
          onAuthenticated?.(authenticatedUser);
          onNeedsEmailVerification?.();
        });
        navigate({ to: "/verify-email" });
        return;
      }

      await loginWithEmail({ email, password });
      const authenticatedUser = await getAuthenticatedUser();
      flushSync(() => {
        onAuthenticated?.(authenticatedUser);
      });
      navigate({ to: "/app" });
    } catch (err) {
      if (isEmailVerificationRequiredError(err)) {
        flushSync(() => {
          onNeedsEmailVerification?.();
        });
        navigate({ to: "/verify-email" });
        return;
      }

      console.error(err);
      setServerError(err instanceof Error ? err.message : tr("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sos-bg)] font-[var(--sos-font-ui)] text-[var(--sos-text)] transition-colors duration-200">
      <div className="w-full max-w-[420px] p-5">
        <div className="mb-[34px] text-center">
          <div className="sos-heading mb-2 text-[34px] font-semibold text-[var(--sos-text)]">Studium</div>
          <div className="text-sm text-[var(--sos-text-muted-more)]">
            {isSignup ? tr("auth.subtitleSignup") : tr("auth.subtitleLogin")}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--sos-card-border)] bg-[var(--sos-card)] p-7 shadow-[var(--sos-card-shadow)]">
          <form onSubmit={handleEmailSubmit} className={isSignup ? "mb-0" : "mb-6"}>
            {isSignup && (
              <Field label={tr("auth.name")} icon={<Icon.user />}>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("auth.namePlaceholder")} required className={inputClassName} />
              </Field>
            )}

            <Field label={tr("auth.email")} icon={<Icon.mail />}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr("auth.emailPlaceholder")} required className={inputClassName} />
            </Field>
            <Field label={tr("auth.password")} icon={<Icon.lock />}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tr("auth.passwordPlaceholder")} minLength={isSignup ? 8 : undefined} required className={inputClassName} />
            </Field>

            {serverError && (
              <div role="alert" className="mb-4 rounded-lg border border-[var(--sos-danger)] bg-[var(--sos-hover)] px-3 py-2.5 text-xs leading-[1.4] text-[var(--sos-danger)]">
                {serverError}
              </div>
            )}

            <button type="submit" disabled={loading} className={`w-full rounded-lg border-0 bg-[var(--sos-accent)] px-3.5 py-3 text-[13px] font-semibold text-white transition-all duration-[120ms] flex items-center justify-center gap-2 ${loading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
              {loading ? tr("auth.connecting") : <>{isSignup ? tr("auth.createAccount") : tr("auth.signIn")} <Icon.arrow /></>}
            </button>
          </form>

          {!isSignup && (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--sos-border)]" />
                <span className="text-[10px] text-[var(--sos-text-muted-most)]">{tr("auth.or")}</span>
                <div className="h-px flex-1 bg-[var(--sos-border)]" />
              </div>

              <div>
                <div className="flex flex-col gap-2.5">
                  <button type="button" disabled className={disabledGhostButtonClassName}><Icon.github /> {tr("auth.github")}</button>
                  <button type="button" disabled className={disabledGhostButtonClassName}><Icon.google /> {tr("auth.google")}</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-[11px] text-[var(--sos-text-muted-more)]">
          <div className="mb-2">
            {isSignup ? `${tr("auth.alreadyAccount")} ` : `${tr("auth.newHere")} `}
            <Link to={isSignup ? "/login" : "/signup"} className="text-[var(--sos-accent)] no-underline">
              {isSignup ? tr("auth.signIn") : tr("auth.createAccount")}
            </Link>
          </div>
        </div>
      </div>

      <button
        onClick={() => setAppearance(getNextTheme(theme))}
        className="fixed bottom-5 right-5 z-[9999] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--sos-accent)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all duration-200"
        aria-label={tr("common.cycleTheme")}
        title={`theme: ${appearance}`}
      >
        {isDarkTheme(theme) ? <AppIcon.sun /> : <AppIcon.moon />}
      </button>
      <button
        type="button"
        onClick={() => {
          const nextLanguage = i18n.language?.startsWith("pt") ? "en" : "pt-BR";
          void i18n.changeLanguage(nextLanguage);
          saveLanguage(nextLanguage);
        }}
        className="fixed bottom-5 left-1/2 z-[9999] h-8 -translate-x-1/2 cursor-pointer rounded-full border border-[var(--sos-border-light)] bg-[var(--sos-hover)] px-3 text-xs font-[550] text-[var(--sos-text-muted)]"
        aria-label={tr("language.switchTo", { language: i18n.language?.startsWith("pt") ? tr("language.english") : tr("language.portuguese") })}
        title={tr("language.switchTo", { language: i18n.language?.startsWith("pt") ? tr("language.english") : tr("language.portuguese") })}
      >
        {i18n.language?.startsWith("pt") ? "EN" : "PT-BR"}
      </button>
    </div>
  );
}

function Field({ label, icon, children }: FieldProps) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[11px] text-[var(--sos-text-muted-more)]">{label}</label>
      <div className="flex items-center rounded-lg border border-[var(--sos-border-alt)] bg-[var(--sos-select)] px-2.5 text-[var(--sos-text-muted)]">
        {icon}
        {children}
      </div>
    </div>
  );
}
