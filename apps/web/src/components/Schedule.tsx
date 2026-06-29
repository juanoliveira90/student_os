import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.js";
import { Modal, ui } from "./ui.js";
import { deleteScheduleEvents, saveScheduleEvents, scheduleQueryKey } from "../fetchs/scheduleFetchs.js";
import { normalizeTimeInput, readTime } from "./time.js";

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
const DAY_SHORT_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function startOfWeek(date: Date) {
  const result = new Date(date);
  const dayIndex = (result.getDay() + 6) % 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - dayIndex);
  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

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
};

function cssNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function formatTime(time: unknown, period: unknown, timeFormat: string) {
  const parsed = readTime(time, timeFormat === "24h" ? "" : String(period || "AM"), { prefer24Hour: timeFormat === "24h" });
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
  const prefer24Hour = timeFormat === "24h";
  const start = readTime(start_time, prefer24Hour ? "" : start_period || "AM", { prefer24Hour });
  const end = readTime(end_time, prefer24Hour ? "" : end_period || start?.period || "AM", { prefer24Hour });

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

function TimeField({ id, label, value, period, onChange, onPeriodChange, onEnter, timeFormat }: TimeFieldProps) {
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
      <label className={ui.label}>{label}</label>
      <div className={`mb-3 grid gap-2 ${is24Hour ? "grid-cols-1" : "grid-cols-[1fr_auto]"}`}>
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && onEnter()}
          placeholder={is24Hour ? "21:32" : "09:32"}
          list={`${id}-suggestions`}
          className={`${ui.input} mb-0`}
        />
        <datalist id={`${id}-suggestions`}>
          {(is24Hour ? TIME_SUGGESTIONS_24H : TIME_SUGGESTIONS_12H).map((time) => (
            <option key={time} value={time} />
          ))}
        </datalist>
        {!is24Hour && <div className="flex h-[42px] overflow-hidden rounded-lg border border-[var(--sos-border-alt)] bg-[var(--sos-select)]">
          {PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPeriodChange(item)}
              className={`min-w-11 cursor-pointer border-0 bg-transparent font-inherit text-xs font-semibold text-[var(--sos-text-muted)] ${item === "PM" ? "border-l border-[var(--sos-border-alt)]" : ""} ${period === item ? "bg-[var(--sos-accent)] text-white" : ""}`}
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
  const { t: tr, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const emptyForm = { day: "monday", title: "", description: "", tag: "study block", customTag: "", studyPlanId: "", start_time: "", start_period: "AM", end_time: "", end_period: "AM", id: null, originalDay: null };
  const [form, setForm] = useState(emptyForm);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [gridStartHour, setGridStartHour] = useState(DEFAULT_START_HOUR);
  const [gridEndHour, setGridEndHour] = useState(DEFAULT_END_HOUR);
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekStart = addDays(startOfWeek(today), weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = weekDates[6];
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekRangeLabel = `${new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" }).format(weekStart)} – ${new Intl.DateTimeFormat(i18n.language, sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(weekEnd)}`;
  const studyPlans = subjects
    .filter((subject) => subject.studyPlanId || subject.isStudyPlanPlaceholder)
    .filter((subject, index, items) => items.findIndex((item) => (item.studyPlanId || item.id) === (subject.studyPlanId || subject.id)) === index);

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
      study_plan_id: studyPlanId || null,
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
      study_plan_id: item.studyPlanId || item.study_plan_id || null,
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
        if (item.studyPlanId === studyPlanId || item.id === studyPlanId) return { ...item, studyPlanScheduleBlockId: blockId };
        if (item.studyPlanScheduleBlockId === blockId) return { ...item, studyPlanScheduleBlockId: "" };
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
    const studyPlanId = tag === "study block" ? form.studyPlanId || "" : "";
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
    const studyPlanId = tag === "study block" ? form.studyPlanId || "" : "";
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
    setSubjects((items) => items.map((item) => (item.studyPlanScheduleBlockId === eventId ? { ...item, studyPlanScheduleBlockId: "" } : item)));
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

  function getEventLayout(event: LooseRecord) {
    const range = getEventMinuteRange(event, timeFormat);
    if (!range || range.endMinutes <= gridStartMinutes || range.startMinutes >= gridEndMinutes) return null;

    const visibleStart = Math.max(range.startMinutes, gridStartMinutes);
    const inclusiveEndMinutes = (Math.floor(range.endMinutes / 60) + 1) * 60;
    const visibleEnd = Math.min(inclusiveEndMinutes, gridEndMinutes);
    const top = ((visibleStart - gridStartMinutes) / 60) * HOUR_HEIGHT;
    const height = Math.max(((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT, 34);

    return { top: cssNumber(top + 4), height: cssNumber(Math.max(height - 8, 30)) };
  }

  function eventClassName(day: string, eventId: unknown) {
    return `schedule-event-${day}-${String(eventId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  const scheduleGridCss = [
    `.schedule-grid-height{height:${cssNumber(gridHeight)}px}`,
    ...DAY_LABELS.flatMap((day) => (schedule[day] || []).map((event) => {
      const layout = getEventLayout(event);
      if (!layout) return "";

      return `.${eventClassName(day, event.id)}{top:${layout.top}px;height:${layout.height}px}`;
    })),
  ].filter(Boolean).join("\n");

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
        <style>{scheduleGridCss}</style>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="m-0 text-[34px] font-semibold leading-[1.1] text-[var(--sos-text)]">{tr("schedule.title")}</h1>
            <div className="mt-1.5 text-sm text-[var(--sos-text-muted-more)]">{tr("schedule.description")}</div>
            {saveMessage && <div className={`mt-2 text-[13px] ${saveMessage === "saved" ? "text-[var(--sos-accent)]" : "text-[var(--sos-text-muted-more)]"}`}>{tr(saveMessage === "saved" ? "common.saved" : "common.couldNotSave")}</div>}
            {isError && <div className="mt-2 text-[13px] text-[var(--sos-text-muted-more)]">{tr("schedule.loadError")}</div>}
          </div>
          <div className="flex flex-wrap justify-end gap-2.5">
            <button onClick={saveSchedule} disabled={!hasChanges || saving} className={ui.ghost}>
              {saving ? tr("common.saving") : tr("common.save")}
            </button>
            <button onClick={() => openAddModal()} className={`${ui.btn} flex items-center gap-2`}><Icon.plus size={15} /> {tr("schedule.newBlock")}</button>
          </div>
        </div>
        {isLoading && <div className="mb-3 text-[13px] text-[var(--sos-text-muted-more)]">{tr("schedule.loading")}</div>}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setWeekOffset(0)} className={`${ui.ghost} px-3.5 py-2 text-[13px]`}>{tr("schedule.today")}</button>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset((value) => value - 1)} aria-label={tr("schedule.previousWeek")} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--sos-card-border)] bg-[var(--sos-card)] text-[var(--sos-text-muted)] hover:text-[var(--sos-text)]"><Icon.chevronLeft size={16} /></button>
              <button onClick={() => setWeekOffset((value) => value + 1)} aria-label={tr("schedule.nextWeek")} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--sos-card-border)] bg-[var(--sos-card)] text-[var(--sos-text-muted)] hover:text-[var(--sos-text)]"><Icon.chevronRight size={16} /></button>
            </div>
            <span className="font-sos-display text-[17px] font-medium text-[var(--sos-text)]">{weekRangeLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[13px] font-medium text-[var(--sos-text-muted-more)]">{tr("schedule.timeRange")}</span>
            <label className="flex items-center gap-1.5 text-[13px] text-[var(--sos-text-muted)]">
              {tr("schedule.starts")}
              <input type="number" min={0} max={gridEndHour - 1} value={gridStartHour} onChange={(e) => updateGridStart(e.target.value)} className={`${ui.input} mb-0 w-[68px] px-[9px] py-2`} />
            </label>
            <label className="flex items-center gap-1.5 text-[13px] text-[var(--sos-text-muted)]">
              {tr("schedule.ends")}
              <input type="number" min={gridStartHour + 1} max={23} value={gridEndHour} onChange={(e) => updateGridEnd(e.target.value)} className={`${ui.input} mb-0 w-[68px] px-[9px] py-2`} />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-[var(--sos-card-border)] bg-[var(--sos-card)] shadow-[var(--sos-card-shadow)]">
          <div className="grid min-w-[920px] grid-cols-[64px_repeat(7,minmax(112px,1fr))]">
            <div className="flex min-h-11 items-center justify-center border-b border-r border-[var(--sos-border)] text-[13px] font-semibold uppercase text-[var(--sos-text-muted-more)]">
              {tr("schedule.time")}
            </div>
            {DAY_LABELS.map((day, dayIndex) => {
              const date = weekDates[dayIndex];
              const isToday = isSameDay(date, today);
              return (
                <div key={day} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 border-b border-[var(--sos-border)] py-1.5 text-[12px] font-semibold uppercase ${isToday ? "text-[var(--sos-accent)]" : "text-[var(--sos-text)]"} ${day === DAY_LABELS[DAY_LABELS.length - 1] ? "" : "border-r"}`}>
                  <span>{tr(`dayShort.${DAY_SHORT_KEYS[dayIndex]}`)}</span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] ${isToday ? "bg-[var(--sos-accent)] text-white" : "text-[var(--sos-text-muted)]"}`}>{date.getDate()}</span>
                </div>
              );
            })}

            <div className="schedule-grid-height border-r border-[var(--sos-border)]">
              {visibleHours.map((hour) => (
                <div key={hour} className={`box-border flex h-16 items-start justify-center pt-2 text-sm text-[var(--sos-text-muted-more)] ${hour === visibleHours[visibleHours.length - 1] ? "" : "border-b border-[var(--sos-border)]"}`}>
                  {formatHourLabel(hour, timeFormat)}
                </div>
              ))}
            </div>

            {DAY_LABELS.map((day, dayIndex) => (
              <div key={day} className={`schedule-grid-height relative ${dayIndex === DAY_LABELS.length - 1 ? "" : "border-r border-[var(--sos-border)]"}`}>
                {visibleHours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => openAddModal(day, hour)}
                    aria-label={`${tr("schedule.addEvent")} ${tr(`days.${day}`)} ${formatHourLabel(hour, timeFormat)}`}
                    className={`block h-16 w-full cursor-pointer border-0 bg-transparent p-0 hover:bg-[var(--sos-hover)] ${hour === visibleHours[visibleHours.length - 1] ? "" : "border-b border-[var(--sos-border)]"}`}
                  />
                ))}
                {(schedule[day] || []).map((ev) => {
                  const layout = getEventLayout(ev);
                  if (!layout) return null;

                  return (
                    <div
                      key={ev.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openEditModal(day, ev)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") openEditModal(day, ev);
                      }}
                      className={`${eventClassName(day, ev.id)} absolute left-1.5 right-1.5 z-[2] box-border cursor-pointer overflow-hidden rounded-lg border-l-[3px] p-2.5 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.05)] ${ev.tag === "study block" ? "border-l-[var(--sos-accent)] bg-[color-mix(in_srgb,var(--sos-accent)_14%,var(--sos-card))]" : "border-l-[var(--sos-accent-light)] bg-[var(--sos-bg-alt)]"}`}
                    >
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          remove(day, ev.id);
                        }}
                        className="absolute right-1 top-1 cursor-pointer border-0 bg-transparent p-0.5 text-[var(--sos-text-muted-more)]"
                        aria-label={tr("common.delete")}
                      >
                        <Icon.x />
                      </button>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap pr-[18px] text-[15px] font-medium text-[var(--sos-text)]">{ev.title}</div>
                      <div className="mt-1 flex items-center gap-[5px] text-sm text-[var(--sos-text-muted-more)]">
                        <Icon.clock /> {formatEventTime(ev)}
                      </div>
                      {ev.description && <div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--sos-text-muted-more)]">{ev.description}</div>}
                      {ev.studyPlanId && <div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--sos-accent)]">{subjects.find((subject) => subject.studyPlanId === ev.studyPlanId || subject.id === ev.studyPlanId)?.studyPlanName || subjects.find((subject) => subject.id === ev.studyPlanId)?.name || tr("schedule.linkedStudyPlan")}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <MiniCalendar weekDates={weekDates} today={today} locale={i18n.language} />
        </div>
        {modal && (
          <Modal onClose={() => setModal(false)} title={form.id ? tr("schedule.editEvent") : tr("schedule.addEvent")} t={t}>
            <label className={ui.label}>{tr("schedule.day")}</label>
            <select value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} className={ui.input}>
              {DAY_LABELS.map((d) => <option key={d} value={d}>{tr(`days.${d}`)}</option>)}
            </select>
            <label className={ui.label}>{tr("schedule.eventTitle")}</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (form.id ? update() : add())} placeholder={tr("schedule.eventName")} className={ui.input} autoFocus />
            <label className={ui.label}>{tr("schedule.eventDescription")}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={tr("schedule.optionalNotes")}
              rows={3}
              className={`${ui.input} min-h-[82px] resize-y leading-[1.4]`}
            />
            <label className={ui.label}>{tr("schedule.tag")}</label>
            <select value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value, studyPlanId: e.target.value === "study block" ? f.studyPlanId : "" }))} className={ui.input}>
              {DEFAULT_TAGS.map((tag) => <option key={tag} value={tag}>{tr(`tags.${tag}`)}</option>)}
              <option value="custom">{tr("tags.custom tag")}</option>
            </select>
            {form.tag === "custom" && (
              <>
                <label className={ui.label}>{tr("schedule.customTag")}</label>
                <input value={form.customTag} onChange={(e) => setForm((f) => ({ ...f, customTag: e.target.value }))} placeholder={tr("schedule.customTagPlaceholder")} className={ui.input} />
              </>
            )}
            {form.tag === "study block" && (
              <>
                <label className={ui.label}>{tr("schedule.studyPlan")}</label>
                <select value={form.studyPlanId} onChange={(e) => setForm((f) => ({ ...f, studyPlanId: e.target.value }))} className={ui.input}>
                  <option value="">{tr("schedule.noLinkedStudyPlan")}</option>
                  {studyPlans.map((subject) => <option key={subject.studyPlanId || subject.id} value={subject.studyPlanId || subject.id}>{subject.studyPlanName || subject.name}</option>)}
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
            />
            <button onClick={form.id ? update : add} className={ui.btn}>{form.id ? tr("schedule.saveChanges") : tr("schedule.addEvent")}</button>
          </Modal>
        )}
      </div>
    );
  }

type MiniCalendarProps = {
  weekDates: Date[];
  today: Date;
  locale: string;
};

function MiniCalendar({ weekDates, today, locale }: MiniCalendarProps) {
  const reference = weekDates[0];
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(reference);
  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekKeys = new Set(weekDates.map((date) => date.toDateString()));
  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  return (
    <aside className="w-full shrink-0 rounded-lg border border-[var(--sos-card-border)] bg-[var(--sos-card)] p-4 shadow-[var(--sos-card-shadow)] xl:w-[260px]">
      <div className="mb-3 text-center font-sos-display text-[16px] font-medium capitalize text-[var(--sos-text)]">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-[var(--sos-text-muted-more)]">
        {DAY_SHORT_KEYS.map((key) => (
          <span key={key} className="py-1">{key.charAt(0).toUpperCase()}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const date = new Date(year, month, day);
          const inWeek = weekKeys.has(date.toDateString());
          const isToday = isSameDay(date, today);
          return (
            <span
              key={day}
              className={`flex h-7 items-center justify-center rounded-full text-[12px] ${isToday ? "bg-[var(--sos-accent)] font-semibold text-white" : inWeek ? "bg-[color-mix(in_srgb,var(--sos-accent)_16%,var(--sos-card))] text-[var(--sos-text)]" : "text-[var(--sos-text-muted)]"}`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </aside>
  );
}
