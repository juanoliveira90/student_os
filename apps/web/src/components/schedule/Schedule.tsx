import { type CSSProperties, type KeyboardEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DAY_LABELS } from "../data.js";
import { Icon } from "../icons";
import { getStyles, Modal } from "../ui";
import { deleteScheduleEvents, saveScheduleEvents, scheduleQueryKey } from "../../fetchs/scheduleFetchs";

const PERIODS = ["AM", "PM"];
const DEFAULT_TAGS = ["study block", "task", "hobby"];
const TIME_SUGGESTIONS_12H = Array.from({ length: 24 * 12 }, (_, index) => {
  const hour = Math.floor(index / 12) % 12 || 12;
  const minute = (index % 12) * 5;
  const period = index < 12 * 12 ? "AM" : "PM";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
});
const TIME_SUGGESTIONS_24H = Array.from({ length: 24 * 12 }, (_, index) => {
  const hour = Math.floor(index / 12);
  const minute = (index % 12) * 5;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});
const HOUR_HEIGHT = 64;
const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 21;

type Theme = Record<string, string>;
type LooseRecord = Record<string, any>;

type ScheduleProps = {
  schedule: Record<string, LooseRecord[]>;
  setSchedule: (value: any) => void;
  subjects: LooseRecord[];
  setSubjects: (value: any) => void;
  isLoading: boolean;
  isError: boolean;
  createAction?: { id: number; type: string } | null;
  onCreateActionHandled?: () => void;
  timeFormat: string;
  t: Theme;
};

type TimeFieldProps = {
  id: string;
  label: string;
  value: string;
  period: string;
  onChange: (value: string) => void;
  onPeriodChange: (period: string) => void;
  onEnter: () => void;
  timeFormat: string;
  s: Record<string, CSSProperties>;
  t: Theme;
};

function readTime(value: unknown, fallbackPeriod = "") {
  const rawValue = String(value || "").trim();
  const periodMatch = rawValue.match(/\s*(am|pm)\s*$/i);
  const period = periodMatch?.[1]?.toUpperCase() || fallbackPeriod;
  const rawTime = rawValue.replace(/\s*(am|pm)\s*$/i, "").trim();
  const hasColon = rawTime.includes(":");
  const digits = rawTime.replace(/\D/g, "");
  const match = rawTime.match(/^(\d{1,2})(?::(\d{1,2}))?$/);

  if (!digits) return null;

  const hourValue = hasColon || digits.length <= 2 ? match?.[1] : digits.slice(0, -2);
  const minuteValue = hasColon ? match?.[2] ?? "0" : digits.length <= 2 ? "0" : digits.slice(-2);
  const rawHour = Math.max(Number(hourValue), 0);
  const minute = Math.min(Math.max(Number(minuteValue), 0), 59);
  const hasExplicitPeriod = Boolean(periodMatch);
  const hasPeriodContext = hasExplicitPeriod || (PERIODS.includes(period) && rawHour > 0 && rawHour <= 12);
  const hour12 = Math.min(Math.max(rawHour || 12, 1), 12);
  const isPm = period === "PM";
  let hour24 = Math.min(rawHour, 23);

  if (hasPeriodContext) {
    hour24 = hour12;

    if (isPm && hour12 !== 12) {
      hour24 = hour12 + 12;
    } else if (!isPm && hour12 === 12) {
      hour24 = 0;
    }
  }

  const displayHour12 = hour24 % 12 || 12;

  return {
    time12: `${String(displayHour12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    time24: `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    period: hasPeriodContext ? period : hour24 >= 12 ? "PM" : "AM",
  };
}

function normalizeTimeInput(value: unknown, fallbackPeriod = "AM", timeFormat = "12h") {
  const parsed = readTime(value, timeFormat === "24h" ? "" : fallbackPeriod);
  if (!parsed) return { time: String(value || "").trim(), period: fallbackPeriod };

  return {
    time: timeFormat === "24h" ? parsed.time24 : parsed.time12,
    period: timeFormat === "24h" ? "" : parsed.period,
  };
}

function formatTime(time: unknown, period: unknown, timeFormat: string) {
  const parsed = readTime(time, String(period || "AM"));
  if (!parsed) return String(time || "");

  if (timeFormat === "24h") return parsed.time24;
  return `${parsed.time12} ${String(period || parsed.period).toUpperCase()}`;
}

function formatHourLabel(hour: number, timeFormat: string) {
  if (timeFormat === "24h") return `${String(hour).padStart(2, "0")}:00`;

  const hour12 = hour % 12 || 12;
  return `${hour12} ${hour < 12 ? "AM" : "PM"}`;
}

function minutesToFormTime(totalMinutes: number, timeFormat: string) {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  if (timeFormat === "24h") {
    return {
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      period: "",
    };
  }

  return {
    time: `${String(hour % 12 || 12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    period: hour < 12 ? "AM" : "PM",
  };
}

function getEventMinuteRange(event: LooseRecord, timeFormat: string) {
  const { start_time, start_period, end_time, end_period } = getEventTimesFromRecord(event, timeFormat);
  const start = readTime(start_time, start_period || "AM");
  const end = readTime(end_time, end_period || start?.period || "AM");

  if (!start || !end) return null;

  const startMinutes = Number(start.time24.slice(0, 2)) * 60 + Number(start.time24.slice(3, 5));
  let endMinutes = Number(end.time24.slice(0, 2)) * 60 + Number(end.time24.slice(3, 5));
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;

  return { startMinutes, endMinutes };
}

function getEventTimesFromRecord(event: LooseRecord, timeFormat: string) {
  if (event.start_time || event.end_time) {
    const startValue = timeFormat === "24h" && event.start_period ? `${event.start_time} ${event.start_period}` : event.start_time || "";
    const endValue = timeFormat === "24h" && event.end_period ? `${event.end_time} ${event.end_period}` : event.end_time || "";
    const start = normalizeTimeInput(startValue, event.start_period || "AM", timeFormat);
    const end = normalizeTimeInput(endValue, event.end_period || "AM", timeFormat);

    return { start_time: start.time, start_period: start.period, end_time: end.time, end_period: end.period };
  }

  const [start_time = "", end_time = ""] = (event.time || "").split(/\s*-\s*/);
  const start = normalizeTimeInput(start_time, "AM", timeFormat);
  const end = normalizeTimeInput(end_time, start.period || "AM", timeFormat);

  return { start_time: start.time, start_period: start.period, end_time: end.time, end_period: end.period };
}

function TimeField({ id, label, value, period, onChange, onPeriodChange, onEnter, timeFormat, s, t }: TimeFieldProps) {
  const is24Hour = timeFormat === "24h";

  function handleChange(nextValue: string) {
    const parsed = normalizeTimeInput(nextValue, period, timeFormat);
    const nextPeriod = /(?:am|pm)\s*$/i.test(nextValue) ? parsed.period : period;

    onChange(nextValue.replace(/\s*(am|pm)\s*$/i, ""));
    if (!is24Hour && nextPeriod !== period) onPeriodChange(nextPeriod);
  }

  function handleBlur() {
    const parsed = normalizeTimeInput(value, period, timeFormat);

    onChange(parsed.time);
    onPeriodChange(parsed.period);
  }

  return (
    <>
      <label style={s.label}>{label}</label>
      <div style={{ display: "grid", gridTemplateColumns: is24Hour ? "1fr" : "1fr auto", gap: 8, marginBottom: 12 }}>
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && onEnter()}
          placeholder={is24Hour ? "21:32" : "09:32"}
          list={`${id}-suggestions`}
          style={{ ...s.input, marginBottom: 0 }}
        />
        <datalist id={`${id}-suggestions`}>
          {(is24Hour ? TIME_SUGGESTIONS_24H : TIME_SUGGESTIONS_12H).map((time) => (
            <option key={time} value={time} />
          ))}
        </datalist>
        {!is24Hour && <div style={{ display: "flex", background: t.select, border: `1px solid ${t.borderAlt}`, borderRadius: 8, overflow: "hidden", height: 42 }}>
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
        </div>}
      </div>
    </>
  );
}

export default function Schedule({ schedule, setSchedule, subjects, setSubjects, isLoading, isError, createAction, onCreateActionHandled, timeFormat, t }: ScheduleProps) {
  const { t: tr } = useTranslation();
  const s = getStyles(t);
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const emptyForm = { day: "monday", title: "", description: "", tag: "study block", customTag: "", studyPlanId: "", start_time: "", start_period: "AM", end_time: "", end_period: "AM", id: null, originalDay: null };
  const [form, setForm] = useState(emptyForm);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [gridStartHour, setGridStartHour] = useState(DEFAULT_START_HOUR);
  const [gridEndHour, setGridEndHour] = useState(DEFAULT_END_HOUR);

  const [pendingChanges, setPendingChanges] = useState({
    createOrUpdate: [],
    delete: [],
  })
  function getEventTimes(event: LooseRecord) {
    return getEventTimesFromRecord(event, timeFormat);
  }

  function formatEventTime(event: LooseRecord) {
    const { start_time, start_period, end_time, end_period } = getEventTimes(event);
    const start = start_time ? formatTime(start_time, start_period, timeFormat) : "";
    const end = end_time ? formatTime(end_time, end_period, timeFormat) : "";

    return [start, end].filter(Boolean).join(" - ");
  }

  function toScheduleItem({ id, day, title, description, tag, studyPlanId, start, end }: LooseRecord) {
    return {
      id,
      day_of_week: day,
      title: title.trim(),
      description: description.trim() || null,
      tag,
      studyPlanId,
      start_time: start.time,
      end_time: end.time,
      ...(timeFormat === "12h" ? { start_period: start.period, end_period: end.period } : {}),
    };
  }

  function toPersistedItem(item: LooseRecord) {
    return {
      id: item.id,
      day_of_week: item.day_of_week,
      title: item.title,
      tag: item.tag,
      description: item.description,
      start_time: item.start_time,
      end_time: item.end_time,
      ...(timeFormat === "12h" ? { start_period: item.start_period, end_period: item.end_period } : {}),
    };
  }

  function openAddModal(day = "monday", startHour = DEFAULT_START_HOUR) {
    const start = minutesToFormTime(startHour * 60, timeFormat);
    const end = minutesToFormTime((startHour + 1) * 60, timeFormat);

    setForm({ ...emptyForm, day, start_time: start.time, start_period: start.period || "AM", end_time: end.time, end_period: end.period || "AM" });
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

  function openEditModal(day: string, event: LooseRecord) {
    const { start_time, start_period, end_time, end_period } = getEventTimes(event);
    const tag = event.tag || "";
    setForm({ day, title: event.title, description: event.description || "", tag: DEFAULT_TAGS.includes(tag) ? tag : "custom", customTag: DEFAULT_TAGS.includes(tag) ? "" : tag, studyPlanId: event.studyPlanId || "", start_time, start_period, end_time, end_period, id: event.id, originalDay: day });
    setModal(true);
  }

  function syncLinkedSubject(blockId: string, studyPlanId: string | number) {
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
    const start = normalizeTimeInput(form.start_time, form.start_period, timeFormat);
    const end = normalizeTimeInput(form.end_time, form.end_period, timeFormat);

    if (!form.title || !start.time || !end.time) return;
    const tag = form.tag === "custom" ? form.customTag.trim() : form.tag;
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
          end_time: newItem.end_time,
          ...(timeFormat === "12h" ? { start_period: newItem.start_period, end_period: newItem.end_period } : {}),
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
    const start = normalizeTimeInput(form.start_time, form.start_period, timeFormat);
    const end = normalizeTimeInput(form.end_time, form.end_period, timeFormat);

    if (!form.title || !start.time || !end.time) return;
    const tag = form.tag === "custom" ? form.customTag.trim() : form.tag;
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
          end_time: updatedItem.end_time,
          ...(timeFormat === "12h" ? { start_period: updatedItem.start_period, end_period: updatedItem.end_period } : {}),
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

  function remove(day: string, eventId: string) {
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

  const visibleHours = Array.from({ length: gridEndHour - gridStartHour + 1 }, (_, index) => gridStartHour + index);
  const gridStartMinutes = gridStartHour * 60;
  const gridEndMinutes = (gridEndHour + 1) * 60;
  const gridHeight = visibleHours.length * HOUR_HEIGHT;

  function updateGridStart(value: string) {
    const nextHour = Math.max(0, Math.min(Number(value), gridEndHour - 1));
    if (!Number.isNaN(nextHour)) setGridStartHour(nextHour);
  }

  function updateGridEnd(value: string) {
    const nextHour = Math.min(23, Math.max(Number(value), gridStartHour + 1));
    if (!Number.isNaN(nextHour)) setGridEndHour(nextHour);
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
            <button onClick={() => openAddModal()} style={s.btn}>{tr("schedule.addEvent")}</button>
          </div>
        </div>
        {isLoading && <div style={{ fontSize: 13, color: t.textMutedMore, marginBottom: 12 }}>{tr("schedule.loading")}</div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: t.textMutedMore, fontWeight: 650 }}>{tr("schedule.timeRange")}</span>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
            {tr("schedule.starts")}
            <input type="number" min={0} max={gridEndHour - 1} value={gridStartHour} onChange={(e) => updateGridStart(e.target.value)} style={{ ...s.input, width: 68, marginBottom: 0, padding: "8px 9px" }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
            {tr("schedule.ends")}
            <input type="number" min={gridStartHour + 1} max={23} value={gridEndHour} onChange={(e) => updateGridEnd(e.target.value)} style={{ ...s.input, width: 68, marginBottom: 0, padding: "8px 9px" }} />
          </label>
        </div>
        <div style={{ overflowX: "auto", border: `1px solid ${t.border}`, borderRadius: 8, background: t.bgAlt }}>
          <div style={{ minWidth: 920, display: "grid", gridTemplateColumns: "64px repeat(7, minmax(112px, 1fr))" }}>
            <div style={{ minHeight: 44, borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMutedMore, fontSize: 11, fontWeight: 750, textTransform: "uppercase" }}>
              {tr("schedule.time")}
            </div>
            {DAY_LABELS.map((day) => (
              <div key={day} style={{ minHeight: 44, borderRight: day === DAY_LABELS[DAY_LABELS.length - 1] ? "none" : `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.text, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
                {tr(`days.${day}`)}
              </div>
            ))}

            <div style={{ borderRight: `1px solid ${t.border}`, height: gridHeight }}>
              {visibleHours.map((hour) => (
                <div key={hour} style={{ height: HOUR_HEIGHT, borderBottom: hour === visibleHours[visibleHours.length - 1] ? "none" : `1px solid ${t.border}`, color: t.textMutedMore, fontSize: 12, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8, boxSizing: "border-box" }}>
                  {formatHourLabel(hour, timeFormat)}
                </div>
              ))}
            </div>

            {DAY_LABELS.map((day, dayIndex) => (
              <div key={day} style={{ position: "relative", height: gridHeight, borderRight: dayIndex === DAY_LABELS.length - 1 ? "none" : `1px solid ${t.border}` }}>
                {visibleHours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => openAddModal(day, hour)}
                    aria-label={`${tr("schedule.addEvent")} ${tr(`days.${day}`)} ${formatHourLabel(hour, timeFormat)}`}
                    style={{
                      width: "100%",
                      height: HOUR_HEIGHT,
                      border: "none",
                      borderBottom: hour === visibleHours[visibleHours.length - 1] ? "none" : `1px solid ${t.border}`,
                      background: "transparent",
                      cursor: "pointer",
                      display: "block",
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = t.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  />
                ))}
                {(schedule[day] || []).map((ev) => {
                  const range = getEventMinuteRange(ev, timeFormat);
                  if (!range || range.endMinutes <= gridStartMinutes || range.startMinutes >= gridEndMinutes) return null;

                  const visibleStart = Math.max(range.startMinutes, gridStartMinutes);
                  const visibleEnd = Math.min(range.endMinutes, gridEndMinutes);
                  const top = ((visibleStart - gridStartMinutes) / 60) * HOUR_HEIGHT;
                  const height = Math.max(((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT, 34);

                  return (
                    <div
                      key={ev.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openEditModal(day, ev)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") openEditModal(day, ev);
                      }}
                      style={{
                        position: "absolute",
                        zIndex: 2,
                        top: top + 4,
                        left: 8,
                        right: 8,
                        height: Math.max(height - 8, 30),
                        overflow: "hidden",
                        background: ev.tag === "study block" ? t.hover : t.select,
                        border: `1px solid ${t.borderAlt}`,
                        borderLeft: `4px solid ${ev.tag === "study block" ? t.accent : t.accentLight}`,
                        borderRadius: 7,
                        padding: "8px 10px",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        boxShadow: "0 8px 22px rgba(0,0,0,0.05)",
                      }}
                    >
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          remove(day, ev.id);
                        }}
                        style={{ position: "absolute", top: 4, right: 4, background: "none", border: "none", cursor: "pointer", color: t.textMutedMore, padding: 2 }}
                        aria-label={tr("common.delete")}
                      >
                        <Icon.x />
                      </button>
                      <div style={{ color: t.text, fontSize: 12, fontWeight: 750, paddingRight: 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                      <div style={{ color: t.textMutedMore, fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon.clock /> {formatEventTime(ev)}
                      </div>
                      {ev.description && <div style={{ color: t.textMutedMore, fontSize: 11, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.description}</div>}
                      {ev.studyPlanId && <div style={{ color: t.accent, fontSize: 11, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subjects.find((subject) => subject.id === ev.studyPlanId)?.name || tr("schedule.linkedStudyPlan")}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
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
              timeFormat={timeFormat}
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
              timeFormat={timeFormat}
              s={s}
              t={t}
            />
            <button onClick={form.id ? update : add} style={s.btn}>{form.id ? tr("schedule.saveChanges") : tr("schedule.addEvent")}</button>
          </Modal>
        )}
      </div>
    );
  }
