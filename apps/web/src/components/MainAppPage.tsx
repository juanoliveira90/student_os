import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Dashboard from "./Dashboard";
import Documents from "./Documents";
import Schedule from "./Schedule";
import Settings from "./Settings";
import Sidebar from "./Sidebar";
import StudyPlans from "./StudyPlans";
import { Icon } from "./icons";
import { applyThemeVariables, getNextTheme, getResolvedTheme, getStoredAppearance, getStoredTimeFormat, getSystemTheme, isDarkTheme, NAV_ITEMS, saveStoredTheme, saveStoredTimeFormat, themes } from "./data.js";
import { scheduleQueryOptions } from "../fetchs/scheduleFetchs";
import { studyPlanQueryOptions } from "../fetchs/studyPlanFetchs";
import { notesQueryOptions } from "../fetchs/notesFetchs";
import { getAuthenticatedUser, logout } from "../fetchs/authFetchs";

type StudiumProps = {
  user: {
    id: string | number;
  } | null;
  onLogout?: () => void;
};

type UserProfile = {
  user?: UserProfile;
  name?: string;
  email?: string;
};

export default function Studium({ user, onLogout }: StudiumProps) {
  const { t: tr, i18n } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");
  const [schedule, setSchedule] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [docs, setDocs] = useState(null);
  const [appearance, setAppearance] = useState(getStoredAppearance);
  const [timeFormat, setTimeFormat] = useState(getStoredTimeFormat);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const theme = getResolvedTheme(appearance, systemTheme);
  const t = themes[theme];
  const isDoc = active === "documents";
  const scheduleQuery = useQuery(scheduleQueryOptions(user?.id));
  const studyPlanQuery = useQuery(studyPlanQueryOptions(user?.id));
  const notesQuery = useQuery(notesQueryOptions(user?.id));
  const currentSchedule = schedule ?? scheduleQuery.data ?? {};
  const currentSubjects = subjects ?? studyPlanQuery.data ?? [];
  const currentDocs = docs ?? notesQuery.data ?? [];
  const account = profile?.user ?? profile ?? {};
  const displayName = account.name || account.email || tr("common.student");
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";
  const updateSchedule = (nextValue) => {
    setSchedule((current) => (typeof nextValue === "function" ? nextValue(current ?? scheduleQuery.data ?? {}) : nextValue));
  };
  const updateSubjects = (nextValue) => {
    setSubjects((current) => (typeof nextValue === "function" ? nextValue(current ?? studyPlanQuery.data ?? []) : nextValue));
  };
  const updateDocs = (nextValue) => {
    setDocs((current) => (typeof nextValue === "function" ? nextValue(current ?? notesQuery.data ?? []) : nextValue));
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const item = NAV_ITEMS.find((n) => n.key === e.key);
      if (item) setActive(item.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    applyThemeVariables(t);
    saveStoredTheme(appearance);
  }, [appearance, t]);

  useEffect(() => {
    saveStoredTimeFormat(timeFormat);
  }, [timeFormat]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    getAuthenticatedUser()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (e.target instanceof Node && !profileRef.current?.contains(e.target)) setProfileMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (schedule !== null || !scheduleQuery.data) return;
    setSchedule(scheduleQuery.data);
  }, [schedule, scheduleQuery.data]);

  useEffect(() => {
    if (subjects !== null || !studyPlanQuery.data) return;
    setSubjects(studyPlanQuery.data);
  }, [subjects, studyPlanQuery.data]);

  useEffect(() => {
    if (docs !== null || !notesQuery.data) return;
    setDocs(notesQuery.data);
  }, [docs, notesQuery.data]);

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error("logout failed:", err);
    } finally {
      onLogout?.();
      navigate({ to: "/login" });
    }
  }

  const todaysDate = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric", year: "numeric" }).format(new Date());

  return (
    <div className="flex min-h-screen bg-[var(--sos-bg)] font-sos-ui text-[var(--sos-text)]">
      <Sidebar active={active} setActive={setActive} t={t} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[72px] shrink-0 items-center justify-end gap-2 border-b border-[var(--sos-border)] bg-[var(--sos-bg)] px-7">
          <button
            type="button"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-0 bg-transparent text-[var(--sos-text-muted)] transition-colors hover:bg-[var(--sos-hover)] hover:text-[var(--sos-text)]"
            aria-label={tr("common.notifications")}
          >
            <Icon.bell size={18} />
          </button>

          <div className="mr-1 flex items-center gap-2 text-[13px] font-semibold text-[var(--sos-text-muted)]">
            <Icon.calendar size={16} />
            <span>{todaysDate}</span>
          </div>

          <button
            onClick={() => setAppearance(getNextTheme(theme))}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-0 bg-transparent text-[var(--sos-text-muted)] transition-colors hover:bg-[var(--sos-hover)] hover:text-[var(--sos-text)]"
            aria-label={tr("common.cycleTheme")}
            title={isDarkTheme(theme) ? tr("common.lightMode") : tr("common.darkMode")}
          >
            {isDarkTheme(theme) ? <Icon.sun size={18} /> : <Icon.moon size={18} />}
          </button>

          <div ref={profileRef} className="relative ml-1">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              title={displayName}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--sos-accent)] text-sm font-semibold text-white"
            >
              {initial}
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[200px] rounded-lg border border-[var(--sos-border-light)] bg-[var(--sos-card)] p-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
                <div className="border-b border-[var(--sos-border)] px-2.5 pb-2 pt-1.5">
                  <div className="truncate text-[13px] font-semibold text-[var(--sos-text)]">{displayName}</div>
                  <div className="text-[11px] text-[var(--sos-text-muted-more)]">{tr("common.student")}</div>
                </div>
                <button type="button" className="mt-1 flex h-[34px] w-full cursor-pointer items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 text-left font-[inherit] text-[13px] text-[var(--sos-accent)] hover:bg-[var(--sos-hover)]" onClick={handleLogout}>
                  <Icon.logout size={15} />
                  <span>{tr("common.logout")}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className={`flex-1 bg-[var(--sos-bg)] ${isDoc ? "overflow-hidden p-0" : "overflow-auto p-7"}`}>
          {active === "dashboard" && <Dashboard user={user} schedule={currentSchedule} subjects={currentSubjects} setSubjects={updateSubjects} docs={currentDocs} setActive={setActive} timeFormat={timeFormat} t={t} />}
          {active === "schedule" && (
            <Schedule
              schedule={currentSchedule}
              setSchedule={updateSchedule}
              subjects={currentSubjects}
              setSubjects={updateSubjects}
              isLoading={scheduleQuery.isLoading && schedule === null && !scheduleQuery.data}
              isError={scheduleQuery.isError}
              timeFormat={timeFormat}
              t={t}
            />
          )}
          {active === "studyplans" && <StudyPlans subjects={currentSubjects} setSubjects={updateSubjects} schedule={currentSchedule} setSchedule={updateSchedule} timeFormat={timeFormat} t={t} />}
          {active === "settings" && <Settings user={user} appearance={appearance} setAppearance={setAppearance} timeFormat={timeFormat} setTimeFormat={setTimeFormat} t={t} />}
          {active === "documents" && (
            <Documents
              docs={currentDocs}
              setDocs={updateDocs}
              isLoading={notesQuery.isLoading && docs === null && !notesQuery.data}
              isError={notesQuery.isError}
              t={t}
            />
          )}
        </main>
      </div>
    </div>
  );
}
