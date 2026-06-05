import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useAsyncRateLimiter } from "@tanstack/react-pacer";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getNextTheme, getResolvedTheme, getStoredAppearance, getSystemTheme, isDarkTheme, saveStoredTheme, themes } from "../student-os/data.js";
import { Icon as AppIcon } from "../student-os/icons.jsx";
import { getAuthenticatedUser, requestEmailVerificationCode, verifyEmailCode } from "../../fetchs/authFetchs";
import { saveLanguage } from "../../i18n";

const Icon = {
  mail: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
};

const RESEND_EMAIL_COOLDOWN_SECONDS = 15;
const RESEND_EMAIL_RATE_LIMIT = 1;
const VERIFY_EMAIL_RATE_LIMIT = 5;
const VERIFY_EMAIL_RATE_LIMIT_WINDOW_SECONDS = 60;
const EMAIL_VERIFICATION_REQUEST_SENT_KEY = "hasLoaded";

function getSecondsUntilNextWindow(rateLimiter) {
  return Math.ceil(rateLimiter.getMsUntilNextWindow() / 1000);
}

export default function VerifyEmailPage({ onVerified }) {
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
    if (sessionStorage.getItem(EMAIL_VERIFICATION_REQUEST_SENT_KEY)) return;

    sessionStorage.setItem(EMAIL_VERIFICATION_REQUEST_SENT_KEY, "true");

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
    const style = document.documentElement.style;
    style.background = t.bg;
    style.color = t.text;
    style.setProperty("--sos-accent", t.accent);
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

  async function handleSubmit(e) {
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
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', 'SF Pro Text', 'Segoe UI', system-ui, sans-serif", color: t.text, transition: "background 0.2s, color 0.2s" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "20px" }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 34, color: t.text, marginBottom: 8, fontWeight: 800 }}>Studium</div>
          <div style={{ fontSize: 14, color: t.textMutedMore }}>{tr("auth.verifyEmail.subtitle")}</div>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: 28, boxShadow: "0 18px 48px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, color: t.textMuted }}>
            <Icon.mail />
          </div>
          <h1 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 20, lineHeight: 1.2, fontWeight: 750, color: t.text }}>{tr("auth.verifyEmail.title")}</h1>
          <p style={{ margin: "0 0 22px", textAlign: "center", color: t.textMutedMore, fontSize: 13, lineHeight: 1.5 }}>{tr("auth.verifyEmail.body")}</p>

          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 11, color: t.textMutedMore, display: "block", marginBottom: 6 }}>{tr("auth.verifyEmail.codeLabel")}</label>
            <div style={{ display: "flex", alignItems: "center", background: t.select, border: `1px solid ${t.borderAlt}`, borderRadius: 8, padding: "0 10px", color: t.textMuted, marginBottom: 16 }}>
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
                style={inputStyle(t)}
              />
            </div>

            {serverError && (
              <div role="alert" style={{ background: t.hover, border: `1px solid ${t.danger || "#dc2626"}`, borderRadius: 8, color: t.danger || "#dc2626", fontSize: 12, lineHeight: 1.4, marginBottom: 16, padding: "10px 12px" }}>
                {serverError}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: "100%", background: t.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, padding: "12px 14px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 700, opacity: loading ? 0.7 : 1, transition: "all 0.12s" }}>
              {loading ? tr("auth.verifyEmail.verifying") : tr("auth.verifyEmail.verify")}
            </button>

            <button type="button" onClick={handleResendEmail} disabled={resendLoading || resendCooldown > 0} style={{ width: "100%", background: t.hover, border: `1px solid ${t.borderLight}`, borderRadius: 8, color: t.text, fontSize: 13, padding: "12px 14px", cursor: resendLoading || resendCooldown > 0 ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 650, opacity: resendLoading || resendCooldown > 0 ? 0.7 : 1, marginTop: 10, transition: "all 0.12s" }}>
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
        style={{ position: "fixed", bottom: 20, right: 20, width: 40, height: 40, borderRadius: "50%", background: t.accent, border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
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
        style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", height: 32, borderRadius: 999, background: t.hover, border: `1px solid ${t.borderLight}`, color: t.textMuted, cursor: "pointer", padding: "0 12px", fontSize: 12, fontFamily: "inherit", fontWeight: 650, zIndex: 9999 }}
        aria-label={tr("language.switchTo", { language: i18n.language?.startsWith("pt") ? tr("language.english") : tr("language.portuguese") })}
        title={tr("language.switchTo", { language: i18n.language?.startsWith("pt") ? tr("language.english") : tr("language.portuguese") })}
      >
        {i18n.language?.startsWith("pt") ? "EN" : "PT-BR"}
      </button>
    </div>
  );
}

const inputStyle = (t) => ({
  width: "100%",
  background: "transparent",
  border: "none",
  color: t.text,
  fontSize: 16,
  letterSpacing: 0,
  padding: "10px 0",
  outline: "none",
  fontFamily: "inherit",
  textAlign: "center",
  fontWeight: 700,
});
