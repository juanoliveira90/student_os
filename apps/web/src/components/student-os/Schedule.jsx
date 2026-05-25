import { useState } from "react";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal } from "./ui.jsx";

const PERIODS = ["AM", "PM"];
const TIME_SUGGESTIONS = Array.from({ length: 24 * 12 }, (_, index) => {
  const hour = Math.floor(index / 12) % 12 || 12;
  const minute = (index % 12) * 5;
  const period = index < 12 * 12 ? "AM" : "PM";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
});

function normalizeTimeInput(value, fallbackPeriod = "AM") {
  const rawValue = String(value || "").trim();
  const periodMatch = rawValue.match(/\s*(am|pm)\s*$/i);
  const period = periodMatch?.[1]?.toUpperCase() || fallbackPeriod;
  const rawTime = rawValue.replace(/\s*(am|pm)\s*$/i, "").trim();
  const hasColon = rawTime.includes(":");
  const digits = rawTime.replace(/\D/g, "");
  const match = rawTime.match(/^(\d{1,2})(?::(\d{1,2}))?$/);

  if (!digits) return { time: rawValue, period };

  const hourValue = hasColon || digits.length <= 2 ? match?.[1] : digits.slice(0, -2);
  const minuteValue = hasColon ? match?.[2] ?? "0" : digits.length <= 2 ? "0" : digits.slice(-2);
  const hour = Math.min(Math.max(Number(hourValue), 1), 12);
  const minute = Math.min(Math.max(Number(minuteValue), 0), 59);

  return {
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    period,
  };
}

function TimeField({ id, label, value, period, onChange, onPeriodChange, onEnter, s, t }) {
  function handleChange(nextValue) {
    const parsed = normalizeTimeInput(nextValue, period);
    const nextPeriod = /(?:am|pm)\s*$/i.test(nextValue) ? parsed.period : period;

    onChange(nextValue.replace(/\s*(am|pm)\s*$/i, ""));
    if (nextPeriod !== period) onPeriodChange(nextPeriod);
  }

  function handleBlur() {
    const parsed = normalizeTimeInput(value, period);

    onChange(parsed.time);
    onPeriodChange(parsed.period);
  }

  return (
    <>
      <label style={s.label}>{label}</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 12 }}>
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && onEnter()}
          placeholder="09:32"
          list={`${id}-suggestions`}
          style={{ ...s.input, marginBottom: 0 }}
        />
        <datalist id={`${id}-suggestions`}>
          {TIME_SUGGESTIONS.map((time) => (
            <option key={time} value={time} />
          ))}
        </datalist>
        <div style={{ display: "flex", background: t.select, border: `1px solid ${t.borderAlt}`, borderRadius: 8, overflow: "hidden", height: 42 }}>
          {PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPeriodChange(item)}
              style={{
                minWidth: 44,
                border: "none",
                borderLeft: item === "PM" ? `1px solid ${t.borderAlt}` : "none",
                background: period === item ? t.accent : "transparent",
                color: period === item ? "#fff" : t.textMuted,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 750,
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function Schedule({ schedule, setSchedule, t }) {
  const s = getStyles(t);
  const [modal, setModal] = useState(false);
  const emptyForm = { day: "monday", title: "", start_time: "", start_period: "AM", end_time: "", end_period: "AM", id: null, originalDay: null };
  const [form, setForm] = useState(emptyForm);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  function getEventTimes(event) {
    if (event.start_time || event.end_time) {
      const start = normalizeTimeInput(event.start_time || "", event.start_period || "AM");
      const end = normalizeTimeInput(event.end_time || "", event.end_period || "AM");

      return { start_time: start.time, start_period: start.period, end_time: end.time, end_period: end.period };
    }

    const [start_time = "", end_time = ""] = (event.time || "").split(/\s*-\s*/);
    const start = normalizeTimeInput(start_time, "AM");
    const end = normalizeTimeInput(end_time, start.period);

    return { start_time: start.time, start_period: start.period, end_time: end.time, end_period: end.period };
  }

  function formatEventTime(event) {
    const { start_time, start_period, end_time, end_period } = getEventTimes(event);
    const start = start_time ? `${start_time} ${start_period}` : "";
    const end = end_time ? `${end_time} ${end_period}` : "";

    return [start, end].filter(Boolean).join(" - ");
  }

  function formatScheduleEvents() {
    return Object.entries(schedule).flatMap(([day, events]) =>
      (events || []).map((event) => {
        const { start_time, start_period, end_time, end_period } = getEventTimes(event);

        return {
          id: event.id,
          day_of_week: day,
          title: event.title,
          start_time,
          start_period,
          end_time,
          end_period,
        };
      })
    );
  }

  function openAddModal() {
    setForm(emptyForm);
    setModal(true);
  }

  function openEditModal(day, event) {
    const { start_time, start_period, end_time, end_period } = getEventTimes(event);
    setForm({ day, title: event.title, start_time, start_period, end_time, end_period, id: event.id, originalDay: day });
    setModal(true);
  }

  function markChanged() {
    setHasChanges(true);
    setSaveMessage("");
  }

  function add() {
    const start = normalizeTimeInput(form.start_time, form.start_period);
    const end = normalizeTimeInput(form.end_time, form.end_period);

    if (!form.title || !start.time || !end.time) return;
    setSchedule((sch) => ({
      ...sch,
      [form.day]: [
        ...(sch[form.day] || []),
        { id: Date.now(), title: form.title.toLowerCase(), start_time: start.time, start_period: start.period, end_time: end.time, end_period: end.period },
      ],
    }));
    markChanged();
    setModal(false);
    setForm(emptyForm);
  }

  function update() {
    const start = normalizeTimeInput(form.start_time, form.start_period);
    const end = normalizeTimeInput(form.end_time, form.end_period);

    if (!form.title || !start.time || !end.time) return;
    setSchedule((sch) => {
      const next = { ...sch };
      next[form.originalDay] = (next[form.originalDay] || []).filter((event) => event.id !== form.id);
      next[form.day] = [
        ...(next[form.day] || []),
        { id: form.id, title: form.title.toLowerCase(), start_time: start.time, start_period: start.period, end_time: end.time, end_period: end.period },
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
          <TimeField
            id="start-time"
            label="Start time"
            value={form.start_time}
            period={form.start_period}
            onChange={(start_time) => setForm((f) => ({ ...f, start_time }))}
            onPeriodChange={(start_period) => setForm((f) => ({ ...f, start_period }))}
            onEnter={form.id ? update : add}
            s={s}
            t={t}
          />
          <TimeField
            id="end-time"
            label="End time"
            value={form.end_time}
            period={form.end_period}
            onChange={(end_time) => setForm((f) => ({ ...f, end_time }))}
            onPeriodChange={(end_period) => setForm((f) => ({ ...f, end_period }))}
            onEnter={form.id ? update : add}
            s={s}
            t={t}
          />
          <button onClick={form.id ? update : add} style={s.btn}>{form.id ? "Save changes" : "Add event"}</button>
        </Modal>
      )}
    </div>
  );
}
