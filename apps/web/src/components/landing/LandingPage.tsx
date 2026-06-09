import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import webPackage from "../../../package.json";
import { saveLanguage } from "../../i18n";
import { getNextTheme, getResolvedTheme, getStoredAppearance, getSystemTheme, isDarkTheme, saveStoredTheme, themes } from "../data.js";
import { Icon } from "../icons";
import "./LandingPage.css";

type LandingPageProps = {
    isAuthenticated?: boolean;
};

type StudiumWordmarkProps = {
    children: ReactNode;
};

type MethodItem = {
    title: string;
    body: string;
};

type LandingStyle = CSSProperties & {
    "--landing-bg": string;
    "--landing-bg-alt": string;
    "--landing-card": string;
    "--landing-border": string;
    "--landing-border-strong": string;
    "--landing-text": string;
    "--landing-muted": string;
    "--landing-muted-more": string;
    "--landing-hover": string;
    "--landing-accent": string;
    "--landing-accent-dark": string;
    "--landing-soft": string;
};

const methodIcons = [Icon.target, Icon.cal, Icon.timer];
const repositoryUrl = normalizeRepositoryUrl(webPackage.repository?.url);

function normalizeRepositoryUrl(url = "") {
    return url.replace(/^git\+/, "").replace(/\.git$/, "");
}

function StudiumWordmark({ children }: StudiumWordmarkProps) {
    return (
        <span className="studium-wordmark">
            <span className="studium-wordmark-text">{children}</span>
            <svg className="studium-wordmark-feather" viewBox="0 0 92 56" aria-hidden="true" focusable="false">
                <path className="studium-feather-fill" d="M31 47c15-34 35-45 58-42-3 20-19 35-52 43 19-4 32-11 43-25-12 12-27 18-49 24Z" />
                <path className="studium-feather-spine" d="M8 52c25-7 51-21 77-45" />
                <path className="studium-feather-barb" d="M38 40c5-7 8-14 9-23M49 35c6-7 10-15 12-26M59 29c7-7 12-13 16-21M31 44c0-6-1-11-4-15M43 39c-1-6-3-12-7-17M54 33c-2-6-5-12-9-17M66 26c-2-5-5-10-9-14" />
                <path className="studium-feather-shadow" d="M3 53c19 0 30 0 45-3" />
            </svg>
        </span>
    );
}

export default function LandingPage({ isAuthenticated = false }: LandingPageProps) {
    const { t: tr, i18n } = useTranslation();
    const [appearance, setAppearance] = useState(getStoredAppearance);
    const [systemTheme, setSystemTheme] = useState(getSystemTheme);
    const theme = getResolvedTheme(appearance, systemTheme);
    const t = themes[theme];
    const methodItems = tr("landing.method.items", { returnObjects: true }) as MethodItem[];
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

    const setLanguage = (language: string) => {
        void i18n.changeLanguage(language);
        saveLanguage(language);
    };

    const landingStyle: LandingStyle = {
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
    };

    return (
        <main className="landing" style={landingStyle}>
            <header className="landing-header">
                <Link to="/" className="landing-brand" aria-label={tr("landing.brand")}>
                    <StudiumWordmark>{tr("landing.brand")}</StudiumWordmark>
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

            <footer className="landing-footer">
                <div className="landing-footer-brand">
                    <Link to="/" className="landing-footer-name" aria-label={tr("landing.brand")}>
                        {tr("landing.brand")}
                    </Link>
                    <p>{tr("landing.footer.tagline")}</p>
                    <a className="landing-repo-link" href={repositoryUrl} target="_blank" rel="noreferrer">
                        <Icon.github />
                        {tr("landing.footer.repository")}
                    </a>
                </div>

                <div className="landing-footer-columns">
                    <div className="landing-footer-column">
                        <h2>{tr("landing.footer.product")}</h2>
                        <a href="#method">{tr("landing.nav.method")}</a>
                        <a href="#open-source">{tr("landing.nav.openSource")}</a>
                        <Link to={targetPath}>{isAuthenticated ? tr("landing.hero.openApp") : tr("landing.hero.primaryCta")}</Link>
                    </div>
                    <div className="landing-footer-column">
                        <h2>{tr("landing.footer.project")}</h2>
                        <a href={repositoryUrl} target="_blank" rel="noreferrer">
                            {tr("landing.footer.github")}
                        </a>
                    </div>
                </div>
            </footer>
        </main>
    );
}
