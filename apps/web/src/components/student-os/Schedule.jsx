import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal } from "./ui.jsx";
import { deleteScheduleEvents, saveScheduleEvents, scheduleQueryKey } from "../../fetchs/scheduleFetchs";

const PERIODS = ["AM", "PM"];
const DEFAULT_TAGS = ["study block", "task", "hobby"];
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

export default function Schedule({ schedule, setSchedule, subjects, setSubjects, isLoading, isError, createAction, onCreateActionHandled, t }) {
  const { t: tr } = useTranslation();
  const s = getStyles(t);
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const emptyForm = { day: "monday", title: "", description: "", tag: "study block", customTag: "", studyPlanId: "", start_time: "", start_period: "AM", end_time: "", end_period: "AM", id: null, originalDay: null };
  const [form, setForm] = useState(emptyForm);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [pendingChanges, setPendingChanges] = useState({
    createOrUpdate: [],
    delete: [],
  })
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

  function toScheduleItem({ id, day, title, description, tag, studyPlanId, start, end }) {
    return {
      id,
      day_of_week: day,
      title: title.toLowerCase(),
      description: description.trim() || null,
      tag,
      studyPlanId,
      start_time: start.time,
      start_period: start.period,
      end_time: end.time,
      end_period: end.period,
    };
  }

  function toPersistedItem(item) {
    return {
      id: item.id,
      day_of_week: item.day_of_week,
      title: item.title,
      tag: item.tag,
      description: item.description,
      start_time: item.start_time,
      start_period: item.start_period,
      end_time: item.end_time,
      end_period: item.end_period,
    };
  }

  function openAddModal() {
    setForm(emptyForm);
    setModal(true);
  }

  function openStudyBlockModal() {
    setForm({ ...emptyForm, tag: "study block", title: "study block" });
    setModal(true);
  }

  useEffect(() => {
    if (!createAction) return;

    if (createAction.type === "study-block") {
      openStudyBlockModal();
    } else {
      openAddModal();
    }
    onCreateActionHandled?.();
  }, [createAction?.id]);

  function openEditModal(day, event) {
    const { start_time, start_period, end_time, end_period } = getEventTimes(event);
    const tag = event.tag || "";
    setForm({ day, title: event.title, description: event.description || "", tag: DEFAULT_TAGS.includes(tag) ? tag : "custom", customTag: DEFAULT_TAGS.includes(tag) ? "" : tag, studyPlanId: event.studyPlanId || "", start_time, start_period, end_time, end_period, id: event.id, originalDay: day });
    setModal(true);
  }

  function syncLinkedSubject(blockId, studyPlanId) {
    setSubjects((items) =>
      items.map((item) => {
        if (item.id === studyPlanId) return { ...item, scheduleBlockId: blockId };
        if (item.scheduleBlockId === blockId) return { ...item, scheduleBlockId: "" };
        return item;
      })
    );
  }

  function markChanged() {
    setHasChanges(true);
    setSaveMessage("");
  }

  function add() {
    const start = normalizeTimeInput(form.start_time, form.start_period);
    const end = normalizeTimeInput(form.end_time, form.end_period);

    if (!form.title || !start.time || !end.time) return;
    const tag = form.tag === "custom" ? form.customTag.trim().toLowerCase() : form.tag;
    const studyPlanId = tag === "study block" ? Number(form.studyPlanId) || "" : "";
    const newItem = toScheduleItem({ id: crypto.randomUUID(), day: form.day, title: form.title, description: form.description, tag, studyPlanId, start, end });

    setSchedule((sch) => ({
      ...sch,
      [form.day]: [
        ...(sch[form.day] || []),
        {
          id: newItem.id,
          title: newItem.title,
          description: newItem.description,
          start_time: newItem.start_time,
          start_period: newItem.start_period,
          end_time: newItem.end_time,
          end_period: newItem.end_period,
          tag: newItem.tag,
          studyPlanId: newItem.studyPlanId,
        },
      ],
    }));
    if (studyPlanId) syncLinkedSubject(newItem.id, studyPlanId);
    markChanged();
    setModal(false);
    setForm(emptyForm);
    setPendingChanges(prev => ({
      ...prev,
      createOrUpdate: [...prev.createOrUpdate, toPersistedItem(newItem)]
    }))
  }

  function update() {
    const start = normalizeTimeInput(form.start_time, form.start_period);
    const end = normalizeTimeInput(form.end_time, form.end_period);

    if (!form.title || !start.time || !end.time) return;
    const tag = form.tag === "custom" ? form.customTag.trim().toLowerCase() : form.tag;
    const studyPlanId = tag === "study block" ? Number(form.studyPlanId) || "" : "";
    const updatedItem = toScheduleItem({ id: form.id, day: form.day, title: form.title, description: form.description, tag, studyPlanId, start, end });

    setSchedule((sch) => {
      const next = { ...sch };
      next[form.originalDay] = (next[form.originalDay] || []).filter((event) => event.id !== form.id);
      next[form.day] = [
        ...(next[form.day] || []),
        {
          id: updatedItem.id,
          title: updatedItem.title,
          description: updatedItem.description,
          start_time: updatedItem.start_time,
          start_period: updatedItem.start_period,
          end_time: updatedItem.end_time,
          end_period: updatedItem.end_period,
          tag: updatedItem.tag,
          studyPlanId: updatedItem.studyPlanId,
        },
      ];
      return next;
    });
    syncLinkedSubject(updatedItem.id, studyPlanId);
    markChanged();
    setModal(false);
    setForm(emptyForm);

    setPendingChanges(prev => ({
      ...prev,
      createOrUpdate: [...prev.createOrUpdate.filter((item) => item.id !== updatedItem.id), toPersistedItem(updatedItem)]
    }))
  }

  function remove(day, eventId) {
    const eventToRemove = schedule[day]?.find((event) => event.id === eventId);
    const removedItem = eventToRemove
      ? {
          id: eventToRemove.id,
        }
      : { id: eventId, day_of_week: day };

    setSchedule((sch) => ({ ...sch, [day]: sch[day].filter((event) => event.id !== eventId) }));
    setSubjects((items) => items.map((item) => (item.scheduleBlockId === eventId ? { ...item, scheduleBlockId: "" } : item)));
    markChanged();
    setPendingChanges(prev => ({
      ...prev,
      createOrUpdate: prev.createOrUpdate.filter((item) => item.id !== eventId),
      delete: [...prev.delete.filter((item) => item.id !== eventId), removedItem]
    }))
  }

  async function saveSchedule() {
    setSaving(true);
    setSaveMessage("");

    try {
      if (pendingChanges.createOrUpdate.length > 0) {
        await saveScheduleEvents(pendingChanges.createOrUpdate);
      }

      if (pendingChanges.delete.length > 0) {
        await deleteScheduleEvents(pendingChanges.delete);
      }

      setPendingChanges({ createOrUpdate: [], delete: [] });
      setHasChanges(false);
      setSaveMessage("saved");
      queryClient.invalidateQueries({ queryKey: scheduleQueryKey });
    } catch {
      setSaveMessage("error");
    } finally {
      setSaving(false);
    }
  }

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 750, color: t.text, margin: 0 }}>{tr("schedule.title")}</h1>
            <div style={{ fontSize: 14, color: t.textMutedMore, marginTop: 6 }}>{tr("schedule.description")}</div>
            {saveMessage && <div style={{ fontSize: 12, color: saveMessage === "saved" ? t.accent : t.textMutedMore, marginTop: 8 }}>{tr(saveMessage === "saved" ? "common.saved" : "common.couldNotSave")}</div>}
            {isError && <div style={{ fontSize: 12, color: t.textMutedMore, marginTop: 8 }}>{tr("schedule.loadError")}</div>}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              onClick={saveSchedule}
              disabled={!hasChanges || saving}
              style={{ ...s.btn, opacity: !hasChanges || saving ? 0.55 : 1, cursor: !hasChanges || saving ? "not-allowed" : "pointer" }}
            >
              {saving ? tr("common.saving") : tr("common.save")}
            </button>
            <button onClick={openAddModal} style={s.btn}>{tr("schedule.addEvent")}</button>
          </div>
        </div>
        {isLoading && <div style={{ fontSize: 13, color: t.textMutedMore, marginBottom: 12 }}>{tr("schedule.loading")}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {DAY_LABELS.map((day) => (
            <div key={day} style={s.card}>
              <div style={{ fontSize: 16, color: t.text, marginBottom: 12, fontWeight: 750, textTransform: "capitalize" }}>{tr(`days.${day}`)}</div>
              {!schedule[day]?.length ? (
                <span style={{ fontSize: 13, color: t.textMutedMore }}>{tr("schedule.noEventsPlanned")}</span>
              ) : schedule[day].map((ev) => (
                <div key={ev.id} style={{ background: t.hover, border: `1px solid ${t.borderAlt}`, borderLeft: `4px solid ${t.accent}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8, position: "relative" }}>
                  <button onClick={() => remove(day, ev.id)} style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: t.textMutedMore, padding: 2 }}><Icon.x /></button>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 16, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 14, color: t.text, fontWeight: 650 }}>{ev.title}</div>
                    <span style={{ border: `1px solid ${t.borderLight}`, background: ev.tag === "study block" ? t.accent : t.select, color: ev.tag === "study block" ? "#fff" : t.textMuted, borderRadius: 999, padding: "2px 7px", fontSize: 10, fontWeight: 750 }}>
                      {tr(`tags.${ev.tag || "event"}`, { defaultValue: ev.tag || tr("tags.event") })}
                    </span>
                  </div>
                  {ev.description && (
                    <div
                      title={ev.description}
                      style={{
                        fontSize: 12,
                        color: t.textMutedMore,
                        marginTop: 6,
                        paddingRight: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ev.description}
                    </div>
                  )}
                  {ev.studyPlanId && (
                    <div style={{ fontSize: 12, color: t.accent, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}><Icon.book /> {subjects.find((subject) => subject.id === ev.studyPlanId)?.name || tr("schedule.linkedStudyPlan")}</div>
                  )}
                  <div style={{ fontSize: 12, color: t.textMutedMore, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}><Icon.clock /> {formatEventTime(ev)}</div>
                  <button onClick={() => openEditModal(day, ev)} style={{ ...s.ghost, padding: "6px 9px", fontSize: 11, marginTop: 10 }}>{tr("common.edit")}</button>
                </div>
              ))}
            </div>
          ))}
        </div>
        {modal && (
          <Modal onClose={() => setModal(false)} title={form.id ? tr("schedule.editEvent") : tr("schedule.addEvent")} t={t}>
            <label style={s.label}>{tr("schedule.day")}</label>
            <select value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} style={s.input}>
              {DAY_LABELS.map((d) => <option key={d} value={d}>{tr(`days.${d}`)}</option>)}
            </select>
            <label style={s.label}>{tr("schedule.eventTitle")}</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (form.id ? update() : add())} placeholder={tr("schedule.eventName")} style={s.input} autoFocus />
            <label style={s.label}>{tr("schedule.eventDescription")}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={tr("schedule.optionalNotes")}
              rows={3}
              style={{ ...s.input, minHeight: 82, resize: "vertical", lineHeight: 1.4 }}
            />
            <label style={s.label}>{tr("schedule.tag")}</label>
            <select value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value, studyPlanId: e.target.value === "study block" ? f.studyPlanId : "" }))} style={s.input}>
              {DEFAULT_TAGS.map((tag) => <option key={tag} value={tag}>{tr(`tags.${tag}`)}</option>)}
              <option value="custom">{tr("tags.custom tag")}</option>
            </select>
            {form.tag === "custom" && (
              <>
                <label style={s.label}>{tr("schedule.customTag")}</label>
                <input value={form.customTag} onChange={(e) => setForm((f) => ({ ...f, customTag: e.target.value }))} placeholder={tr("schedule.customTagPlaceholder")} style={s.input} />
              </>
            )}
            {form.tag === "study block" && (
              <>
                <label style={s.label}>{tr("schedule.studyPlan")}</label>
                <select value={form.studyPlanId} onChange={(e) => setForm((f) => ({ ...f, studyPlanId: e.target.value }))} style={s.input}>
                  <option value="">{tr("schedule.noLinkedStudyPlan")}</option>
                  {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </>
            )}
            <TimeField
              id="start-time"
              label={tr("schedule.startTime")}
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
              label={tr("schedule.endTime")}
              value={form.end_time}
              period={form.end_period}
              onChange={(end_time) => setForm((f) => ({ ...f, end_time }))}
              onPeriodChange={(end_period) => setForm((f) => ({ ...f, end_period }))}
              onEnter={form.id ? update : add}
              s={s}
              t={t}
            />
            <button onClick={form.id ? update : add} style={s.btn}>{form.id ? tr("schedule.saveChanges") : tr("schedule.addEvent")}</button>
          </Modal>
        )}
      </div>
    );
  }


