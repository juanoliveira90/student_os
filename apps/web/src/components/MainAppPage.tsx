import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Dashboard from "./dashboard/Dashboard";
import Documents from "./documents/Documents";
import FocusTime from "./focus-time/FocusTime.jsx";
import Habits from "./habits/Habits.jsx";
import Schedule from "./schedule/Schedule";
import Settings from "./settings/Settings.jsx";
import Sidebar from "./Sidebar";
import StudyPlans from "./study-plans/StudyPlans";
import { Icon } from "./icons";
import { getNextTheme, getResolvedTheme, getStoredAppearance, getSystemTheme, isDarkTheme, NAV_ITEMS, saveStoredTheme, themes } from "./data.js";
import { scheduleQueryOptions } from "../fetchs/scheduleFetchs";
import { studyPlanQueryOptions } from "../fetchs/studyPlanFetchs";
import { notesQueryOptions } from "../fetchs/notesFetchs";

type Theme = Record<string, string>;

type StudiumProps = {
  user: {
    id: string | number;
  } | null;
  onLogout?: () => void;
};

type CreateAction = {
  page: string;
  type: string;
  id: number;
};

export default function Studium({ user, onLogout }: StudiumProps) {
  const { t: tr } = useTranslation();
  const [active, setActive] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [habits, setHabits] = useState([]);
  const [docs, setDocs] = useState(null);
  const [appearance, setAppearance] = useState(getStoredAppearance);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [createAction, setCreateAction] = useState<CreateAction | null>(null);
  const theme = getResolvedTheme(appearance, systemTheme);
  const t = themes[theme];
  const isDoc = active === "documents";
  const scheduleQuery = useQuery(scheduleQueryOptions(user?.id));
  const studyPlanQuery = useQuery(studyPlanQueryOptions(user?.id));
  const notesQuery = useQuery(notesQueryOptions(user?.id));
  const currentSchedule = schedule ?? scheduleQuery.data ?? {};
  const currentSubjects = subjects ?? studyPlanQuery.data ?? [];
  const currentDocs = docs ?? notesQuery.data ?? [];
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
      const item = NAV_ITEMS.find((n) => n.key === e.key && !["habits", "focustime"].includes(n.id));
      if (item) setActive(item.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const currentPage = NAV_ITEMS.find((n) => n.id === active);
  const navigateToCreate = (page: string, type: string) => {
    setCreateAction({ page, type, id: Date.now() });
    setActive(page);
  };

  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh", background: t.bg, fontFamily: "'Inter', 'SF Pro Text', 'Segoe UI', system-ui, sans-serif", color: t.text }}>
        <Sidebar active={active} setActive={setActive} t={t} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} onLogout={onLogout} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ minHeight: 72, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexShrink: 0, background: t.bgAlt, padding: "0 28px" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 750, color: t.text }}>{tr(`nav.${currentPage?.id}.label`)}</div>
              <div style={{ fontSize: 13, color: t.textMutedMore, marginTop: 3 }}>{tr(`nav.${currentPage?.id}.description`)}</div>
            </div>
            <button
              onClick={() => setAppearance(getNextTheme(theme))}
              style={{
                minWidth: 112,
                height: 38,
                borderRadius: 999,
                background: t.hover,
                border: `1px solid ${t.borderLight}`,
                color: t.text,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 650,
                fontFamily: "inherit",
              }}
              aria-label={tr("common.cycleTheme")}
              title={`theme: ${appearance}`}
            >
              {isDarkTheme(theme) ? <Icon.sun /> : <Icon.moon />}
              {isDarkTheme(theme) ? tr("common.lightMode") : tr("common.darkMode")}
            </button>
          </div>

          <div style={{ flex: 1, overflow: isDoc ? "hidden" : "auto", padding: isDoc ? 0 : "28px", background: t.bg }}>
            {active === "dashboard" && <Dashboard user={user} tasks={tasks} setTasks={setTasks} habits={habits} schedule={currentSchedule} subjects={currentSubjects} setActive={setActive} navigateToCreate={navigateToCreate} t={t} />}
            {active === "schedule" && (
              <Schedule
                schedule={currentSchedule}
                setSchedule={updateSchedule}
                subjects={currentSubjects}
                setSubjects={updateSubjects}
                isLoading={scheduleQuery.isLoading && schedule === null && !scheduleQuery.data}
                isError={scheduleQuery.isError}
                createAction={createAction?.page === "schedule" ? createAction : null}
                onCreateActionHandled={() => setCreateAction(null)}
                t={t}
              />
            )}
            {active === "studyplans" && <StudyPlans subjects={currentSubjects} setSubjects={updateSubjects} schedule={currentSchedule} setSchedule={updateSchedule} createAction={createAction?.page === "studyplans" ? createAction : null} onCreateActionHandled={() => setCreateAction(null)} t={t} />}
            {active === "habits" && <Habits habits={habits} setHabits={setHabits} t={t} />}
            {active === "focustime" && <FocusTime tasks={tasks} setTasks={setTasks} subjects={currentSubjects} schedule={currentSchedule} t={t} />}
            {active === "settings" && <Settings user={user} appearance={appearance} setAppearance={setAppearance} t={t} />}
            {active === "documents" && (
              <Documents
                docs={currentDocs}
                setDocs={updateDocs}
                isLoading={notesQuery.isLoading && docs === null && !notesQuery.data}
                isError={notesQuery.isError}
                createAction={createAction?.page === "documents" ? createAction : null}
                onCreateActionHandled={() => setCreateAction(null)}
                t={t}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
