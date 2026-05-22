import { DAYS, productivityData } from "./data.js";
import { Icon } from "./icons.jsx";
import { Divider, getStyles, MiniStat, SecHdr, Stat } from "./ui.jsx";

export default function Dashboard({ tasks, setTasks, habits, t }) {
  const s = getStyles(t);
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toLowerCase();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const maxH = Math.max(...productivityData);
  const doneh = habits.filter((h) => h.done).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
      <div style={s.card}>
        <div style={{ fontSize: 11, color: t.accent, marginBottom: 14, letterSpacing: "0.1em" }}>// user_005</div>
        <div style={{ fontSize: 12, color: t.textMutedMore, marginBottom: 2 }}>student os user</div>
        <Divider t={t} />
        <Stat label="hours this week" value="7h" accent t={t} />
        <Stat label="tasks completed" value="12" accent t={t} />
        <Stat label="uptime" value="99.7%" t={t} />
        <Stat label="streak" value="22d" t={t} />
      </div>

      <div style={s.card}>
        <SecHdr icon={<Icon.terminal />} label="today's tasks" t={t} />
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => setTasks((items) => items.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)))}
              style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: "7px 10px", borderRadius: 4, textAlign: "left", color: task.done ? t.textMutedMore : t.text, fontSize: 13, textDecoration: task.done ? "line-through" : "none", transition: "background 0.1s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${task.done ? t.accent : t.borderLight}`, background: task.done ? t.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {task.done && <Icon.check />}
              </span>
              {task.text}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: t.accent }}>$ ls -la ./tasks -&gt;</div>
      </div>

      <div style={s.card}>
        <div style={{ fontSize: 12, color: t.textMutedMore, marginBottom: 4 }}>{dateStr}</div>
        <div style={{ fontSize: 22, color: t.accent, fontWeight: 400, marginBottom: 16 }}>{timeStr}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <MiniStat label="habits" value={`${doneh}/${habits.length}`} t={t} />
          <MiniStat label="focus" value="high" accent t={t} />
          <MiniStat label="tasks done" value={`${tasks.filter((task) => task.done).length}/${tasks.length}`} t={t} />
          <MiniStat label="status" value="active" ok t={t} />
        </div>
      </div>

      <div style={{ ...s.card, gridColumn: "span 2" }}>
        <SecHdr icon={<Icon.trend />} label="weekly productivity" t={t} />
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
        <SecHdr icon={<Icon.target />} label="habits tracker" t={t} />
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {habits.map((habit) => (
            <div key={habit.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", border: `1px solid ${habit.done ? t.accent : t.borderLight}`, background: habit.done ? t.accent : "transparent", display: "inline-block" }} />
                <span style={{ fontSize: 12, color: habit.done ? t.text : t.textMutedMore }}>{habit.name}</span>
              </div>
              <span style={{ fontSize: 11, color: t.accent }}>{habit.streak}d</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
