import { useState } from "react";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal, PageHdr } from "./ui.jsx";

export default function Schedule({ schedule, setSchedule, t }) {
  const s = getStyles(t);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ day: "monday", title: "", time: "" });

  function add() {
    if (!form.title || !form.time) return;
    setSchedule((sch) => ({ ...sch, [form.day]: [...(sch[form.day] || []), { id: Date.now(), title: form.title.toLowerCase(), time: form.time }] }));
    setModal(false);
    setForm({ day: "monday", title: "", time: "" });
  }

  return (
    <div>
      <PageHdr label="schedule" action={{ label: "+ add event", onClick: () => setModal(true) }} t={t} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {DAY_LABELS.map((day) => (
          <div key={day} style={s.card}>
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 10 }}>{day}</div>
            {!schedule[day]?.length ? (
              <span style={{ fontSize: 11, color: t.textMutedMost }}>// no events</span>
            ) : schedule[day].map((ev) => (
              <div key={ev.id} style={{ background: t.hover, border: `1px solid ${t.borderAlt}`, borderLeft: `3px solid ${t.accent}`, borderRadius: 4, padding: "8px 10px", marginBottom: 6, position: "relative" }}>
                <button onClick={() => setSchedule((sch) => ({ ...sch, [day]: sch[day].filter((e) => e.id !== ev.id) }))} style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: t.textMutedMore, padding: 2 }}><Icon.x /></button>
                <div style={{ fontSize: 12, color: t.text }}>{ev.title}</div>
                <div style={{ fontSize: 11, color: t.textMutedMore, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><Icon.clock /> {ev.time}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {modal && (
        <Modal onClose={() => setModal(false)} title="add event" t={t}>
          <label style={s.label}>day</label>
          <select value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} style={s.input}>
            {DAY_LABELS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label style={s.label}>title</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="event name" style={s.input} autoFocus />
          <label style={s.label}>time</label>
          <input value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="09:00 - 10:30" style={s.input} />
          <button onClick={add} style={s.btn}>add event</button>
        </Modal>
      )}
    </div>
  );
}
