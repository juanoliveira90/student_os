import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { saveLanguage } from "../../i18n";
import { getNextTheme, getResolvedTheme, getStoredAppearance, getSystemTheme, isDarkTheme, saveStoredTheme, themes } from "../student-os/data.js";
import { Icon } from "../student-os/icons.jsx";
import "./LandingPage.css";

const methodIcons = [Icon.target, Icon.cal, Icon.timer];

export default function LandingPage({ isAuthenticated = false }) {
  const { t: tr, i18n } = useTranslation();
  const [appearance, setAppearance] = useState(getStoredAppearance);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const theme = getResolvedTheme(appearance, systemTheme);
  const t = themes[theme];
  const methodItems = tr("landing.method.items", { returnObjects: true });
  const targetPath = isAuthenticated ? "/app" : "/login";

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

  const setLanguage = (language) => {
    void i18n.changeLanguage(language);
    saveLanguage(language);
  };

  return (
    <main
      className="landing"
      style={{
        "--landing-bg": t.bg,
        "--landing-bg-alt": t.bgAlt,
        "--landing-card": t.card,
        "--landing-border": t.border,
        "--landing-border-strong": t.borderAlt,
        "--landing-text": t.text,
        "--landing-muted": t.textMuted,
        "--landing-muted-more": t.textMutedMore,
        "--landing-hover": t.hover,
        "--landing-accent": t.accent,
        "--landing-accent-dark": t.accentDark,
        "--landing-soft": isDarkTheme(theme) ? "#151311" : "#fffaf3",
      }}
    >
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label={tr("landing.brand")}>
          <span className="landing-brand-mark">OS</span>
          <span>{tr("landing.brand")}</span>
        </Link>

        <nav className="landing-nav" aria-label={tr("landing.nav.label")}>
          <a href="#method">{tr("landing.nav.method")}</a>
          <a href="#open-source">{tr("landing.nav.openSource")}</a>
        </nav>

        <div className="landing-actions">
          <div className="landing-segment" aria-label={tr("settings.language")}>
            <button type="button" className={!i18n.language?.startsWith("pt") ? "active" : ""} onClick={() => setLanguage("en")}>
              EN
            </button>
            <button type="button" className={i18n.language?.startsWith("pt") ? "active" : ""} onClick={() => setLanguage("pt-BR")}>
              PT
            </button>
          </div>
          <button type="button" className="landing-icon-btn" onClick={() => setAppearance(getNextTheme(theme))} aria-label={tr("common.cycleTheme")} title={tr("common.cycleTheme")}>
            {isDarkTheme(theme) ? <Icon.sun /> : <Icon.moon />}
          </button>
          <Link to="/login" className="landing-login">
            {tr("landing.nav.signIn")}
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-kicker">{tr("landing.hero.kicker")}</span>
          <h1>{tr("landing.hero.headline")}</h1>
          <p>{tr("landing.hero.body")}</p>
          <div className="landing-hero-actions">
            <Link to={targetPath} className="landing-primary">
              {isAuthenticated ? tr("landing.hero.openApp") : tr("landing.hero.primaryCta")}
              <Icon.chevronRight />
            </Link>
            <a href="#method" className="landing-secondary">
              {tr("landing.hero.secondaryCta")}
            </a>
          </div>
        </div>
      </section>

      <section id="method" className="landing-method">
        <div className="landing-section-head">
          <span className="landing-kicker">{tr("landing.method.eyebrow")}</span>
          <h2>{tr("landing.method.title")}</h2>
        </div>

        <div className="landing-method-grid">
          {methodItems.map((item, index) => {
            const MethodIcon = methodIcons[index] ?? Icon.check;
            return (
              <article className="landing-method-card" key={item.title}>
                <div className="landing-method-icon">
                  <MethodIcon />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="open-source" className="landing-final">
        <span className="landing-kicker">{tr("landing.openSource.eyebrow")}</span>
        <h2>{tr("landing.openSource.title")}</h2>
        <p>{tr("landing.openSource.body")}</p>
        <Link to={targetPath} className="landing-primary">
          {isAuthenticated ? tr("landing.hero.openApp") : tr("landing.openSource.cta")}
          <Icon.chevronRight />
        </Link>
      </section>
    </main>
  );
}
