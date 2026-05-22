import { useEffect, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import Documents from "./Documents.jsx";
import FocusTime from "./FocusTime.jsx";
import Habits from "./Habits.jsx";
import Schedule from "./Schedule.jsx";
import Sidebar from "./Sidebar.jsx";
import StudyPlans from "./StudyPlans.jsx";
import { Icon } from "./icons.jsx";
import { initDocs, initHabits, initSchedule, initSubjects, initTasks, NAV_ITEMS, themes } from "./data.js";

export default function StudentOS() {
  const [active, setActive] = useState("dashboard");
  const [tasks, setTasks] = useState(initTasks);
  const [schedule, setSchedule] = useState(initSchedule);
  const [subjects, setSubjects] = useState(initSubjects);
  const [habits, setHabits] = useState(initHabits);
  const [docs, setDocs] = useState(initDocs);
  const [theme, setTheme] = useState("dark");
  const t = themes[theme];
  const isDoc = active === "documents";

  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const item = NAV_ITEMS.find((n) => n.key === e.key);
      if (item) setActive(item.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const style = document.documentElement.style;
    if (theme === "light") {
      style.background = themes.light.bg;
      style.color = themes.light.text;
    } else {
      style.background = themes.dark.bg;
      style.color = themes.dark.text;
    }
  }, [theme]);

  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh", background: t.bg, fontFamily: "'JetBrains Mono', monospace", color: t.text }}>
        <Sidebar active={active} setActive={setActive} t={t} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ height: 40, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", background: t.bgAlt }}>
            <span style={{ fontSize: 13, letterSpacing: "0.18em", color: t.textMutedMore }}>student_os</span>
            <span style={{ position: "absolute", left: 16, fontSize: 10, color: t.textMutedMore }}>
              {NAV_ITEMS.find((n) => n.id === active)?.label}
            </span>
            <span style={{ position: "absolute", right: 16, fontSize: 10, color: t.textMutedMore }}>v2.1.0</span>
          </div>

          <div style={{ flex: 1, overflow: isDoc ? "hidden" : "auto", padding: isDoc ? 0 : "20px 24px", background: t.bg }}>
            {active === "dashboard" && <Dashboard tasks={tasks} setTasks={setTasks} habits={habits} t={t} />}
            {active === "schedule" && <Schedule schedule={schedule} setSchedule={setSchedule} t={t} />}
            {active === "studyplans" && <StudyPlans subjects={subjects} setSubjects={setSubjects} t={t} />}
            {active === "habits" && <Habits habits={habits} setHabits={setHabits} t={t} />}
            {active === "focustime" && <FocusTime tasks={tasks} setTasks={setTasks} t={t} />}
            {active === "documents" && <Documents docs={docs} setDocs={setDocs} t={t} />}
          </div>
        </div>
      </div>

      <button
        onClick={() => setTheme((curr) => (curr === "dark" ? "light" : "dark"))}
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
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        aria-label="toggle theme"
      >
        {theme === "dark" ? <Icon.sun /> : <Icon.moon />}
      </button>
    </>
  );
}
