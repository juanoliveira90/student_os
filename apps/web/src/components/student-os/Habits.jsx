import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DAYS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal, PageHdr } from "./ui.jsx";

export default function Habits({ habits, setHabits, t }) {
  const { t: tr } = useTranslation();
  const s = getStyles(t);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", category: "health" });

  function add() {
    if (!form.name) return;
    setHabits((items) => [...items, { id: Date.now(), name: form.name.toLowerCase(), category: form.category, streak: 0, done: false, week: [0, 0, 0, 0, 0, 0, 0] }]);
    setModal(false);
    setForm({ name: "", category: "health" });
  }

  return (
    <div>
      <PageHdr label={tr("habits.title")} description={tr("habits.description")} action={{ label: tr("habits.addHabit"), onClick: () => setModal(true) }} t={t} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {habits.map((habit) => (
          <div key={habit.id} style={{ ...s.card, borderLeft: habit.done ? `4px solid ${t.accent}` : `4px solid ${t.borderLight}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setHabits((items) => items.map((x) => (x.id === habit.id ? { ...x, done: !x.done } : x)))} style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${habit.done ? t.accent : t.borderLight}`, background: habit.done ? t.accent : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }} aria-label={`toggle ${habit.name}`}>
                  {habit.done && <Icon.check />}
                </button>
                <div>
                  <div style={{ fontSize: 15, color: t.text, fontWeight: 750 }}>{habit.name}</div>
                  <div style={{ fontSize: 12, color: t.textMutedMore, marginTop: 2 }}>{tr(`habits.categories.${habit.category}`, { defaultValue: habit.category })}</div>
                </div>
              </div>
              <button onClick={() => setHabits((items) => items.filter((x) => x.id !== habit.id))} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost }}><Icon.x /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.accent, marginBottom: 12, fontWeight: 700 }}><Icon.fire /> {tr("habits.dayStreak", { count: habit.streak })}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {DAYS.map((d, i) => (
                <div key={d} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: t.textMutedMost, marginBottom: 3 }}>{tr(`dayShort.${d}`)}</div>
                  <div style={{ height: 22, borderRadius: 3, background: habit.week[i] ? t.accent : t.hover }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal onClose={() => setModal(false)} title={tr("habits.addHabit")} t={t}>
          <label style={s.label}>{tr("habits.name")}</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={tr("habits.habitName")} style={s.input} autoFocus />
          <label style={s.label}>{tr("habits.category")}</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={s.input}>
            {["health", "learning", "skills", "mindfulness", "other"].map((c) => <option key={c} value={c}>{tr(`habits.categories.${c}`)}</option>)}
          </select>
          <button onClick={add} style={s.btn}>{tr("habits.addHabit")}</button>
        </Modal>
      )}
    </div>
  );
}
