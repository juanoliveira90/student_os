import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Dashboard from "./Dashboard.jsx";
import Documents from "./Documents.jsx";
import FocusTime from "./FocusTime.jsx";
import Habits from "./Habits.jsx";
import Schedule from "./Schedule.jsx";
import Sidebar from "./Sidebar.jsx";
import StudyPlans from "./StudyPlans.jsx";
import { Icon } from "./icons.jsx";
import { getNextTheme, getStoredTheme, initDocs, initHabits, initSchedule, initSubjects, initTasks, isDarkTheme, NAV_ITEMS, saveStoredTheme, themes } from "./data.js";
import { scheduleQueryOptions } from "../../fetchs/scheduleFetchs";
import { studyPlanQueryOptions } from "../../fetchs/studyPlanFetchs";
import { notesQueryOptions } from "../../fetchs/notesFetchs";

export default function StudentOS({ user, onLogout }) {
  const [active, setActive] = useState("dashboard");
  const [tasks, setTasks] = useState(initTasks);
  const [schedule, setSchedule] = useState(initSchedule);
  const [hasLoadedSchedule, setHasLoadedSchedule] = useState(false);
  const [hasLoadedStudyPlan, setHasLoadedStudyPlan] = useState(false);
  const [hasLoadedDocs, setHasLoadedDocs] = useState(false);
  const [subjects, setSubjects] = useState(initSubjects);
  const [habits, setHabits] = useState(initHabits);
  const [docs, setDocs] = useState(initDocs);
  const [theme, setTheme] = useState(getStoredTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const t = themes[theme];
  const isDoc = active === "documents";
  const scheduleQuery = useQuery(scheduleQueryOptions(user?.id));
  const studyPlanQuery = useQuery(studyPlanQueryOptions(user?.id));
  const notesQuery = useQuery(notesQueryOptions(user?.id));

  useEffect(() => {
    function onKey(e) {
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
    saveStoredTheme(theme);
  }, [t, theme]);

  useEffect(() => {
    if (hasLoadedSchedule || !scheduleQuery.data) return;

    setSchedule(scheduleQuery.data);
    setHasLoadedSchedule(true);
  }, [hasLoadedSchedule, scheduleQuery.data]);

  useEffect(() => {
    if (hasLoadedStudyPlan || !studyPlanQuery.data) return;

    setSubjects(studyPlanQuery.data);
    setHasLoadedStudyPlan(true);
  }, [hasLoadedStudyPlan, studyPlanQuery.data]);

  useEffect(() => {
    if (hasLoadedDocs || !notesQuery.data) return;

    setDocs(notesQuery.data);
    setHasLoadedDocs(true);
  }, [hasLoadedDocs, notesQuery.data]);

  const currentPage = NAV_ITEMS.find((n) => n.id === active);

  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh", background: t.bg, fontFamily: "'Inter', 'SF Pro Text', 'Segoe UI', system-ui, sans-serif", color: t.text }}>
        <Sidebar active={active} setActive={setActive} t={t} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} onLogout={onLogout} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ minHeight: 72, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexShrink: 0, background: t.bgAlt, padding: "0 28px" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 750, color: t.text }}>{currentPage?.label}</div>
              <div style={{ fontSize: 13, color: t.textMutedMore, marginTop: 3 }}>{currentPage?.description}</div>
            </div>
            <button
              onClick={() => setTheme(getNextTheme)}
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
              aria-label="cycle theme"
              title={`theme: ${theme}`}
            >
              {isDarkTheme(theme) ? <Icon.sun /> : <Icon.moon />}
              {isDarkTheme(theme) ? "Light mode" : "Dark mode"}
            </button>
          </div>

          <div style={{ flex: 1, overflow: isDoc ? "hidden" : "auto", padding: isDoc ? 0 : "28px", background: t.bg }}>
            {active === "dashboard" && <Dashboard user={user} tasks={tasks} setTasks={setTasks} habits={habits} schedule={schedule} subjects={subjects} setActive={setActive} t={t} />}
            {active === "schedule" && (
              <Schedule
                schedule={schedule}
                setSchedule={setSchedule}
                subjects={subjects}
                setSubjects={setSubjects}
                isLoading={scheduleQuery.isLoading && !hasLoadedSchedule}
                isError={scheduleQuery.isError}
                t={t}
              />
            )}
            {active === "studyplans" && <StudyPlans subjects={subjects} setSubjects={setSubjects} schedule={schedule} setSchedule={setSchedule} t={t} />}
            {active === "habits" && <Habits habits={habits} setHabits={setHabits} t={t} />}
            {active === "focustime" && <FocusTime tasks={tasks} setTasks={setTasks} subjects={subjects} schedule={schedule} t={t} />}
            {active === "documents" && (
              <Documents
                docs={docs}
                setDocs={setDocs}
                isLoading={notesQuery.isLoading && !hasLoadedDocs}
                isError={notesQuery.isError}
                t={t}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
