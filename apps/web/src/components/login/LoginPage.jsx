import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getNextTheme, getResolvedTheme, getStoredAppearance, getSystemTheme, isDarkTheme, saveStoredTheme, themes } from "../student-os/data.js";
import { Icon as AppIcon } from "../student-os/icons.jsx";
import { getAuthenticatedUser, isEmailVerificationRequiredError, loginWithEmail, registerWithEmail } from "../../fetchs/authFetchs";
import { saveLanguage } from "../../i18n";

const Icon = {
  github: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
  google: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
  mail: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  lock: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  user: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>,
  arrow: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
};

const ghostButton = (loading, t) => ({
  width: "100%",
  background: t.hover,
  border: `1px solid ${t.borderLight}`,
  borderRadius: 8,
  color: t.text,
  fontSize: 13,
  padding: "12px 14px",
  cursor: loading ? "not-allowed" : "pointer",
  fontFamily: "inherit",
  fontWeight: 650,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  transition: "all 0.12s",
  opacity: loading ? 0.7 : 1,
});

const soonButton = (t) => ({
  ...ghostButton(true, t),
  opacity: 0.72,
});

export default function LoginPage({ mode = "login", onAuthenticated, onNeedsEmailVerification }) {
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

  async function handleEmailSubmit(e) {
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
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', 'SF Pro Text', 'Segoe UI', system-ui, sans-serif", color: t.text, transition: "background 0.2s, color 0.2s" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "20px" }}>
        <div style={{ marginBottom: 34, textAlign: "center" }}>
          <div style={{ fontSize: 34, color: t.text, marginBottom: 8, fontWeight: 800 }}>Studium</div>
          <div style={{ fontSize: 14, color: t.textMutedMore }}>
            {isSignup ? tr("auth.subtitleSignup") : tr("auth.subtitleLogin")}
          </div>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: 28, boxShadow: "0 18px 48px rgba(0,0,0,0.08)" }}>
          <form onSubmit={handleEmailSubmit} style={{ marginBottom: isSignup ? 0 : 24 }}>
            {isSignup && (
              <Field label={tr("auth.name")} icon={<Icon.user />} t={t}>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("auth.namePlaceholder")} required style={inputStyle(t)} />
              </Field>
            )}

            <Field label={tr("auth.email")} icon={<Icon.mail />} t={t}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr("auth.emailPlaceholder")} required style={inputStyle(t)} />
            </Field>
            <Field label={tr("auth.password")} icon={<Icon.lock />} t={t}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tr("auth.passwordPlaceholder")} minLength={isSignup ? 8 : undefined} required style={inputStyle(t)} />
            </Field>

            {serverError && (
              <div role="alert" style={{ background: t.hover, border: `1px solid ${t.danger || "#dc2626"}`, borderRadius: 8, color: t.danger || "#dc2626", fontSize: 12, lineHeight: 1.4, marginBottom: 16, padding: "10px 12px" }}>
                {serverError}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: "100%", background: t.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, padding: "12px 14px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1, transition: "all 0.12s" }}>
              {loading ? tr("auth.connecting") : <>{isSignup ? tr("auth.createAccount") : tr("auth.signIn")} <Icon.arrow /></>}
            </button>
          </form>

          {!isSignup && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: t.border }} />
                <span style={{ fontSize: 10, color: t.textMutedMost }}>{tr("auth.or")}</span>
                <div style={{ flex: 1, height: 1, background: t.border }} />
              </div>

              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button type="button" disabled style={soonButton(t)}><Icon.github /> {tr("auth.github")}</button>
                  <button type="button" disabled style={soonButton(t)}><Icon.google /> {tr("auth.google")}</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: t.textMutedMore }}>
          <div style={{ marginBottom: 8 }}>
            {isSignup ? `${tr("auth.alreadyAccount")} ` : `${tr("auth.newHere")} `}
            <Link to={isSignup ? "/login" : "/signup"} style={{ color: t.accent, textDecoration: "none" }}>
              {isSignup ? tr("auth.signIn") : tr("auth.createAccount")}
            </Link>
          </div>
          {/*!isSignup && <div><a href="#" style={{ color: t.accent, textDecoration: "none" }}>Forgot password?</a></div>*/}
        </div>
      </div>

      <button
        onClick={() => setAppearance(getNextTheme(theme))}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: t.accent,
          border: "none",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          transition: "all 0.2s",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
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
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          height: 32,
          borderRadius: 999,
          background: t.hover,
          border: `1px solid ${t.borderLight}`,
          color: t.textMuted,
          cursor: "pointer",
          padding: "0 12px",
          fontSize: 12,
          fontFamily: "inherit",
          fontWeight: 650,
          zIndex: 9999,
        }}
        aria-label={tr("language.switchTo", { language: i18n.language?.startsWith("pt") ? tr("language.english") : tr("language.portuguese") })}
        title={tr("language.switchTo", { language: i18n.language?.startsWith("pt") ? tr("language.english") : tr("language.portuguese") })}
      >
        {i18n.language?.startsWith("pt") ? "EN" : "PT-BR"}
      </button>
    </div>
  );
}

function Field({ label, icon, children, t }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, color: t.textMutedMore, display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", background: t.select, border: `1px solid ${t.borderAlt}`, borderRadius: 8, padding: "0 10px", color: t.textMuted }}>
        {icon}
        {children}
      </div>
    </div>
  );
}

const inputStyle = (t) => ({
  flex: 1,
  background: "transparent",
  border: "none",
  color: t.text,
  fontSize: 13,
  padding: "10px 10px",
  outline: "none",
  fontFamily: "inherit",
});
