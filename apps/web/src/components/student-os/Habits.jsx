import { useState } from "react";
import { DAYS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal, PageHdr } from "./ui.jsx";

export default function Habits({ habits, setHabits, t }) {
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
      <PageHdr label="habits tracker" action={{ label: "+ add habit", onClick: () => setModal(true) }} t={t} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {habits.map((habit) => (
          <div key={habit.id} style={{ ...s.card, borderLeft: habit.done ? `3px solid ${t.accent}` : `3px solid ${t.borderLight}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setHabits((items) => items.map((x) => (x.id === habit.id ? { ...x, done: !x.done } : x)))} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${habit.done ? t.accent : t.borderLight}`, background: habit.done ? t.accent : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {habit.done && <Icon.check />}
                </button>
                <div>
                  <div style={{ fontSize: 13, color: t.text }}>{habit.name}</div>
                  <div style={{ fontSize: 11, color: t.textMutedMore }}>{habit.category}</div>
                </div>
              </div>
              <button onClick={() => setHabits((items) => items.filter((x) => x.id !== habit.id))} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost }}><Icon.x /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.accent, marginBottom: 12 }}><Icon.fire /> {habit.streak} day streak</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {DAYS.map((d, i) => (
                <div key={d} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: t.textMutedMost, marginBottom: 3 }}>{d[0]}</div>
                  <div style={{ height: 22, borderRadius: 3, background: habit.week[i] ? t.accent : t.hover }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal onClose={() => setModal(false)} title="add habit" t={t}>
          <label style={s.label}>name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="habit name" style={s.input} autoFocus />
          <label style={s.label}>category</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={s.input}>
            {["health", "learning", "skills", "mindfulness", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={add} style={s.btn}>add habit</button>
        </Modal>
      )}
    </div>
  );
}
