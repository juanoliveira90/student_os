import { type FormEvent, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useAsyncRateLimiter } from "@tanstack/react-pacer";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { applyThemeVariables, getNextTheme, getResolvedTheme, getStoredAppearance, getSystemTheme, isDarkTheme, saveStoredTheme, themes } from "./data.js";
import { Icon as AppIcon } from "./icons.js";
import { getAuthenticatedUser, requestEmailVerificationCode, verifyEmailCode } from "../fetchs/authFetchs.js";
import { saveLanguage } from "../i18n/index.js";

const Icon = {
  mail: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
};

const RESEND_EMAIL_COOLDOWN_SECONDS = 60;
const RESEND_EMAIL_RATE_LIMIT = 1;
const VERIFY_EMAIL_RATE_LIMIT = 5;
const VERIFY_EMAIL_RATE_LIMIT_WINDOW_SECONDS = 60;
const EMAIL_VERIFICATION_REQUEST_SENT_KEY = "emailVerificationRequestSentAt";
const codeInputClassName = "w-full bg-transparent border-0 py-2.5 text-center text-base font-semibold tracking-normal outline-none font-[inherit] text-[var(--sos-text)]";

type VerifyEmailPageProps = {
  onVerified?: (authenticatedUser: unknown) => void;
};

type RateLimiterWindow = {
  getMsUntilNextWindow: () => number;
};

function getSecondsUntilNextWindow(rateLimiter: RateLimiterWindow) {
  return Math.ceil(rateLimiter.getMsUntilNextWindow() / 1000);
}

export default function VerifyEmailPage({ onVerified }: VerifyEmailPageProps) {
  const { t: tr, i18n } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_EMAIL_COOLDOWN_SECONDS);
  const [serverError, setServerError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [appearance, setAppearance] = useState(getStoredAppearance);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const theme = getResolvedTheme(appearance, systemTheme);
  const t = themes[theme];
  const verifyEmailLimiter = useAsyncRateLimiter(
    verifyEmailCode,
    {
      key: "verify-email-code",
      limit: VERIFY_EMAIL_RATE_LIMIT,
      window: VERIFY_EMAIL_RATE_LIMIT_WINDOW_SECONDS * 1000,
      onReject: (_args, rateLimiter) => {
        setServerError(tr("auth.verifyEmail.rateLimit", { count: getSecondsUntilNextWindow(rateLimiter) }));
      },
    },
    (state) => ({ rejectionCount: state.rejectionCount })
  );
  const requestEmailVerificationLimiter = useAsyncRateLimiter(
    requestEmailVerificationCode,
    {
      key: "request-email-verification-code",
      limit: RESEND_EMAIL_RATE_LIMIT,
      window: RESEND_EMAIL_COOLDOWN_SECONDS * 1000,
      onReject: (_args, rateLimiter) => {
        setResendCooldown(getSecondsUntilNextWindow(rateLimiter));
      },
    },
    (state) => ({ rejectionCount: state.rejectionCount })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lastRequestSentAt = Number(sessionStorage.getItem(EMAIL_VERIFICATION_REQUEST_SENT_KEY) ?? 0);
    if (Date.now() - lastRequestSentAt < RESEND_EMAIL_COOLDOWN_SECONDS * 1000) return;

    sessionStorage.setItem(EMAIL_VERIFICATION_REQUEST_SENT_KEY, Date.now().toString());

    requestEmailVerificationLimiter.maybeExecute().catch((err) => {
      console.error(err);
      setServerError(err instanceof Error ? err.message : tr("auth.genericError"));
    });
  }, [requestEmailVerificationLimiter, tr]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setResendCooldown((currentCooldown) => Math.max(0, currentCooldown - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [resendCooldown]);

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalizedCode = code.trim();

    if (!/^\d{5}$/.test(normalizedCode)) {
      setServerError(tr("auth.verifyEmail.codeFormat"));
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      if (verifyEmailLimiter.getRemainingInWindow() <= 0) {
        setServerError(tr("auth.verifyEmail.rateLimit", { count: getSecondsUntilNextWindow(verifyEmailLimiter) }));
        return;
      }

      await verifyEmailLimiter.maybeExecute(Number(normalizedCode));
      const authenticatedUser = await getAuthenticatedUser();
      sessionStorage.removeItem(EMAIL_VERIFICATION_REQUEST_SENT_KEY);
      flushSync(() => {
        onVerified?.(authenticatedUser);
      });
      navigate({ to: "/app" });
    } catch (err) {
      console.error(err);
      setServerError(err instanceof Error ? err.message : tr("auth.genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    setResendLoading(true);
    setServerError("");

    try {
      if (requestEmailVerificationLimiter.getRemainingInWindow() <= 0) {
        setResendCooldown(getSecondsUntilNextWindow(requestEmailVerificationLimiter));
        return;
      }

      await requestEmailVerificationLimiter.maybeExecute();
      setResendCooldown(RESEND_EMAIL_COOLDOWN_SECONDS);
    } catch (err) {
      console.error(err);
      setServerError(err instanceof Error ? err.message : tr("auth.genericError"));
    } finally {
      setResendLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sos-bg)] font-[var(--sos-font-ui)] text-[var(--sos-text)] transition-colors duration-200">
      <div className="w-full max-w-[420px] p-5">
        <div className="mb-7 text-center">
          <div className="sos-heading mb-2 text-[34px] font-semibold text-[var(--sos-text)]">Studium</div>
          <div className="text-sm text-[var(--sos-text-muted-more)]">{tr("auth.verifyEmail.subtitle")}</div>
        </div>

        <div className="rounded-xl border border-[var(--sos-card-border)] bg-[var(--sos-card)] p-7 shadow-[var(--sos-card-shadow)]">
          <div className="mb-3.5 flex justify-center text-[var(--sos-text-muted)]">
            <Icon.mail />
          </div>
          <h1 className="mb-2 mt-0 text-center text-xl font-semibold leading-[1.2] text-[var(--sos-text)]">{tr("auth.verifyEmail.title")}</h1>
          <p className="mb-[22px] mt-0 text-center text-[13px] leading-normal text-[var(--sos-text-muted-more)]">{tr("auth.verifyEmail.body")}</p>

          <form onSubmit={handleSubmit}>
            <label className="mb-1.5 block text-[11px] text-[var(--sos-text-muted-more)]">{tr("auth.verifyEmail.codeLabel")}</label>
            <div className="mb-4 flex items-center rounded-lg border border-[var(--sos-border-alt)] bg-[var(--sos-select)] px-2.5 text-[var(--sos-text-muted)]">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder={tr("auth.verifyEmail.codePlaceholder")}
                pattern="\d{5}"
                maxLength={5}
                required
                className={codeInputClassName}
              />
            </div>

            {serverError && (
              <div role="alert" className="mb-4 rounded-lg border border-[var(--sos-danger)] bg-[var(--sos-hover)] px-3 py-2.5 text-xs leading-[1.4] text-[var(--sos-danger)]">
                {serverError}
              </div>
            )}

            <button type="submit" disabled={loading} className={`w-full rounded-lg border-0 bg-[var(--sos-accent)] px-3.5 py-3 text-[13px] font-semibold text-white transition-all duration-[120ms] ${loading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
              {loading ? tr("auth.verifyEmail.verifying") : tr("auth.verifyEmail.verify")}
            </button>

            <button type="button" onClick={handleResendEmail} disabled={resendLoading || resendCooldown > 0} className={`mt-2.5 w-full rounded-lg border border-[var(--sos-border-light)] bg-[var(--sos-hover)] px-3.5 py-3 text-[13px] font-[550] text-[var(--sos-text)] transition-all duration-[120ms] ${resendLoading || resendCooldown > 0 ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
              {resendLoading
                ? tr("auth.verifyEmail.resending")
                : resendCooldown > 0
                  ? tr("auth.verifyEmail.resendIn", { count: resendCooldown })
                  : tr("auth.verifyEmail.resend")}
            </button>
          </form>
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
