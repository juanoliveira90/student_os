import { DAYS, productivityData } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, MiniStat, SecHdr } from "./ui.jsx";
import { useEffect, useState } from "react";
import { getAuthenticatedUser } from "../../fetchs/authFetchs";

export default function Dashboard({ tasks, setTasks, habits, t }) {
  const s = getStyles(t);
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toLowerCase();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const maxH = Math.max(...productivityData);
  const doneh = habits.filter((h) => h.done).length;
  const doneTasks = tasks.filter((task) => task.done).length;
  const habitChecks = habits.flatMap((habit) => habit.week);
  const habitConsistency = habitChecks.length ? Math.round((habitChecks.filter(Boolean).length / habitChecks.length) * 100) : 0;
  const taskCompletion = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const todayHabitCompletion = habits.length ? Math.round((doneh / habits.length) * 100) : 0;
  const score = Math.round((habitConsistency * 0.6) + (taskCompletion * 0.25) + (todayHabitCompletion * 0.15));

  const [user, setUser] = useState(null);

  useEffect(() => {
    getAuthenticatedUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
      <div style={{ ...s.card, gridColumn: "1 / -1", padding: "26px" }}>
        <div style={{ fontSize: 14, color: t.textMutedMore, marginBottom: 8 }}>{dateStr}</div>
        <div style={{ fontSize: 34, lineHeight: 1.1, color: t.text, fontWeight: 800, marginBottom: 8 }}>
          Good to see you{user?.name ? `, ${user.name}` : ""}.
        </div>
        <div style={{ fontSize: 15, color: t.textMuted, maxWidth: 560 }}>
          Choose a goal, check your schedule, or start a focus session. Everything important for today is right here.
        </div>
      </div>

      <div style={s.card}>
        <SecHdr icon={<Icon.check />} label="Today's Goals" t={t} />
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => setTasks((items) => items.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)))}
              style={{ display: "flex", alignItems: "center", gap: 12, background: t.hover, border: `1px solid ${task.done ? t.border : t.borderAlt}`, cursor: "pointer", padding: "12px", borderRadius: 8, textAlign: "left", color: task.done ? t.textMutedMore : t.text, fontSize: 14, textDecoration: task.done ? "line-through" : "none", transition: "background 0.1s", fontFamily: "inherit" }}
            >
              <span style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${task.done ? t.accent : t.borderLight}`, background: task.done ? t.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
                {task.done && <Icon.check />}
              </span>
              {task.text}
            </button>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <SecHdr icon={<Icon.clock />} label="Current Time & Score" t={t} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <MiniStat label="Current time" value={timeStr} accent t={t} />
          <MiniStat label="Your score" value={`${score}/100`} ok={score >= 70} t={t} />
          <MiniStat label="Habit consistency" value={`${habitConsistency}%`} t={t} />
          <MiniStat label="Today's habits" value={`${doneh}/${habits.length}`} t={t} />
        </div>
      </div>

      <div style={s.card}>
        <SecHdr icon={<Icon.grid />} label="Quick Overview" t={t} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <MiniStat label="Habits done" value={`${doneh}/${habits.length}`} t={t} />
          <MiniStat label="Focus" value="Ready" accent t={t} />
          <MiniStat label="Goals done" value={`${doneTasks}/${tasks.length}`} t={t} />
          <MiniStat label="Week streak" value="22d" ok t={t} />
        </div>
      </div>

      <div style={s.card}>
        <SecHdr icon={<Icon.trend />} label="Weekly Study Time" t={t} />
        <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
          {productivityData.map((v, i) => (
            <div key={DAYS[i]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", height: `${(v / maxH) * 88}px`, background: t.accent, opacity: 0.7 + (v / maxH) * 0.3, borderRadius: "2px 2px 0 0" }} />
              <span style={{ fontSize: 10, color: t.textMutedMore }}>{DAYS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <SecHdr icon={<Icon.target />} label="Habits" t={t} />
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {habits.map((habit) => (
            <div key={habit.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", border: `1px solid ${habit.done ? t.accent : t.borderLight}`, background: habit.done ? t.accent : "transparent", display: "inline-block" }} />
                <span style={{ fontSize: 14, color: habit.done ? t.text : t.textMutedMore }}>{habit.name}</span>
              </div>
              <span style={{ fontSize: 11, color: t.accent }}>{habit.streak}d</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
