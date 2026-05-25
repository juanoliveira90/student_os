import { useState } from "react";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal } from "./ui.jsx";

export default function Schedule({ schedule, setSchedule, t }) {
  const s = getStyles(t);
  const [modal, setModal] = useState(false);
  const emptyForm = { day: "monday", title: "", start_time: "", end_time: "", id: null, originalDay: null };
  const [form, setForm] = useState(emptyForm);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  function getEventTimes(event) {
    if (event.start_time || event.end_time) {
      return { start_time: event.start_time || "", end_time: event.end_time || "" };
    }

    const [start_time = "", end_time = ""] = (event.time || "").split(/\s*-\s*/);
    return { start_time, end_time };
  }

  function formatEventTime(event) {
    const { start_time, end_time } = getEventTimes(event);
    return [start_time, end_time].filter(Boolean).join(" - ");
  }

  function formatScheduleEvents() {
    return Object.entries(schedule).flatMap(([day, events]) =>
      (events || []).map((event) => {
        const { start_time, end_time } = getEventTimes(event);

        return {
          id: event.id,
          day_of_week: day,
          title: event.title,
          start_time,
          end_time,
        };
      })
    );
  }

  function openAddModal() {
    setForm(emptyForm);
    setModal(true);
  }

  function openEditModal(day, event) {
    const { start_time, end_time } = getEventTimes(event);
    setForm({ day, title: event.title, start_time, end_time, id: event.id, originalDay: day });
    setModal(true);
  }

  function markChanged() {
    setHasChanges(true);
    setSaveMessage("");
  }

  function add() {
    if (!form.title || !form.start_time || !form.end_time) return;
    setSchedule((sch) => ({
      ...sch,
      [form.day]: [
        ...(sch[form.day] || []),
        { id: Date.now(), title: form.title.toLowerCase(), start_time: form.start_time, end_time: form.end_time },
      ],
    }));
    markChanged();
    setModal(false);
    setForm(emptyForm);
  }

  function update() {
    if (!form.title || !form.start_time || !form.end_time) return;
    setSchedule((sch) => {
      const next = { ...sch };
      next[form.originalDay] = (next[form.originalDay] || []).filter((event) => event.id !== form.id);
      next[form.day] = [
        ...(next[form.day] || []),
        { id: form.id, title: form.title.toLowerCase(), start_time: form.start_time, end_time: form.end_time },
      ];
      return next;
    });
    markChanged();
    setModal(false);
    setForm(emptyForm);
  }

  function remove(day, eventId) {
    setSchedule((sch) => ({ ...sch, [day]: sch[day].filter((event) => event.id !== eventId) }));
    markChanged();
  }

  async function saveSchedule() {
    setSaving(true);
    setSaveMessage("");

    const events = formatScheduleEvents();

    console.log(JSON.stringify({ events }))
    //console.log(schedule)

    try {
      const response = await fetch("/schedule/add", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) throw new Error("Schedule save failed");

      setHasChanges(false);
      setSaveMessage("Saved.");
    } catch {
      setSaveMessage("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 750, color: t.text, margin: 0 }}>Schedule</h1>
          <div style={{ fontSize: 14, color: t.textMutedMore, marginTop: 6 }}>Add classes, deadlines, and study blocks for each day.</div>
          {saveMessage && <div style={{ fontSize: 12, color: saveMessage === "Saved." ? t.accent : t.textMutedMore, marginTop: 8 }}>{saveMessage}</div>}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={saveSchedule}
            disabled={!hasChanges || saving}
            style={{ ...s.btn, opacity: !hasChanges || saving ? 0.55 : 1, cursor: !hasChanges || saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={openAddModal} style={s.btn}>Add event</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {DAY_LABELS.map((day) => (
          <div key={day} style={s.card}>
            <div style={{ fontSize: 16, color: t.text, marginBottom: 12, fontWeight: 750, textTransform: "capitalize" }}>{day}</div>
            {!schedule[day]?.length ? (
              <span style={{ fontSize: 13, color: t.textMutedMore }}>No events planned</span>
            ) : schedule[day].map((ev) => (
              <div key={ev.id} style={{ background: t.hover, border: `1px solid ${t.borderAlt}`, borderLeft: `4px solid ${t.accent}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8, position: "relative" }}>
                <button onClick={() => remove(day, ev.id)} style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: t.textMutedMore, padding: 2 }}><Icon.x /></button>
                <div style={{ fontSize: 14, color: t.text, fontWeight: 650 }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: t.textMutedMore, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}><Icon.clock /> {formatEventTime(ev)}</div>
                <button onClick={() => openEditModal(day, ev)} style={{ ...s.ghost, padding: "6px 9px", fontSize: 11, marginTop: 10 }}>Edit</button>
              </div>
            ))}
          </div>
        ))}
      </div>
      {modal && (
        <Modal onClose={() => setModal(false)} title={form.id ? "Edit event" : "Add event"} t={t}>
          <label style={s.label}>Day</label>
          <select value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} style={s.input}>
            {DAY_LABELS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label style={s.label}>Title</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (form.id ? update() : add())} placeholder="event name" style={s.input} autoFocus />
          <label style={s.label}>Start time</label>
          <input value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (form.id ? update() : add())} placeholder="09:00" style={s.input} />
          <label style={s.label}>End time</label>
          <input value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (form.id ? update() : add())} placeholder="10:30" style={s.input} />
          <button onClick={form.id ? update : add} style={s.btn}>{form.id ? "Save changes" : "Add event"}</button>
        </Modal>
      )}
    </div>
  );
}
