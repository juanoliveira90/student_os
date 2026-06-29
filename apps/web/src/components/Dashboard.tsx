import { type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.js";
import { ui } from "./ui.js";
import { saveStudyPlanChanges, studyPlanQueryKey } from "../fetchs/studyPlanFetchs.js";

type Theme = Record<string, string>;
type LooseRecord = Record<string, any>;

type DashboardProps = {
  user: LooseRecord | null;
  schedule: Record<string, LooseRecord[]>;
  subjects: LooseRecord[];
  setSubjects: (value: any) => void;
  docs: LooseRecord[];
  setActive: (active: string) => void;
  timeFormat: string;
  t: Theme;
};

const emptyChanges = {
  createStudyPlans: [],
  updateStudyPlans: [],
  deleteStudyPlans: [],
  createSubjects: [],
  updateSubjects: [],
  deleteSubjects: [],
  createSubtasks: [],
  updateSubtasks: [],
  deleteSubtasks: [],
};

function titleCase(value: unknown) {
  return String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getEventTime(event: LooseRecord) {
  if (event.start_time) return event.start_time;
  return String(event.time || "").split("-")[0]?.trim() || "09:00";
}

function formatTime(time: unknown, period?: unknown, timeFormat = "12h") {
  const raw = String(time || "");
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;

  const rawHour = Number(match[1]);
  const cleanPeriod = String(period || "").toUpperCase();
  const hasPeriod = cleanPeriod === "AM" || cleanPeriod === "PM";
  let hour24 = rawHour;

  if (hasPeriod && cleanPeriod === "PM" && rawHour !== 12) {
    hour24 = rawHour + 12;
  } else if (hasPeriod && cleanPeriod === "AM" && rawHour === 12) {
    hour24 = 0;
  }

  if (timeFormat === "24h") return `${String(hour24).padStart(2, "0")}:${match[2]}`;

  const hour12 = hour24 % 12 || 12;
  let displayPeriod = cleanPeriod;

  if (!hasPeriod) {
    displayPeriod = hour24 >= 12 ? "PM" : "AM";
  }

  return `${String(hour12).padStart(2, "0")}:${match[2]} ${displayPeriod}`;
}

function normalizeSubtask(subtask: LooseRecord) {
  const name = String(subtask.name || subtask.text || "").trim();

  return {
    id: subtask.id,
    name,
    text: name,
    done: Boolean(subtask.done),
  };
}

function getNoteTimestamp(note: LooseRecord) {
  const value = note.date || note.updatedAt || note.createdAt;
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

function formatRelativeDate(note: LooseRecord, locale: string) {
  const timestamp = getNoteTimestamp(note);
  if (!timestamp) return "";

  const diffMs = timestamp - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffDays) >= 7) {
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(timestamp);
  }
  if (Math.abs(diffDays) >= 1) return formatter.format(diffDays, "day");

  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) >= 1) return formatter.format(diffHours, "hour");

  const diffMinutes = Math.round(diffMs / 60_000);
  return formatter.format(diffMinutes, "minute");
}

export default function Dashboard({ user, schedule, subjects, setSubjects, docs, setActive, timeFormat }: DashboardProps) {
  const { t: tr, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const profile = user?.user ?? user ?? {};
  const displayName = profile.name || profile.email?.split("@")[0];
  const today = DAY_LABELS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const todaySchedule = (schedule?.[today] || [])
    .slice()
    .sort((a, b) => getEventTime(a).localeCompare(getEventTime(b)));

  const todayTasks = (subjects || [])
    .filter((subject) => subject.studyPlanDay === today && !subject.isStudyPlanPlaceholder)
    .flatMap((subject) => (subject.subtasks || []).map((subtask) => ({ subtask, subject })));

  const recentNotes = (docs || [])
    .slice()
    .sort((a, b) => getNoteTimestamp(b) - getNoteTimestamp(a))
    .slice(0, 6);

  async function toggleTask(subjectId: string, subtask: LooseRecord) {
    const updatedSubtask = normalizeSubtask({ ...subtask, done: !subtask.done });

    setSubjects((items) =>
      items.map((item) => (item.id === subjectId ? { ...item, subtasks: (item.subtasks || []).map((task) => (task.id === updatedSubtask.id ? updatedSubtask : task)) } : item))
    );

    try {
      await saveStudyPlanChanges({ ...emptyChanges, updateSubtasks: [updatedSubtask] });
      queryClient.invalidateQueries({ queryKey: studyPlanQueryKey });
    } catch (error) {
      console.error("could not save task", error);
    }
  }

  const cardHeader = (icon: ReactNode, label: string, action?: ReactNode) => (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="sos-heading flex items-center gap-2 text-[17px] font-semibold text-[var(--sos-text)]">
        <span className="text-[var(--sos-accent)]">{icon}</span> {label}
      </div>
      {action}
    </div>
  );

  return (
    <div className="grid gap-5">
      <section>
        <h1 className="m-0 text-[34px] font-semibold leading-[1.1] text-[var(--sos-text)]">{tr("dashboard.greeting", { name: titleCase(displayName) })}</h1>
        <div className="mt-1.5 text-sm text-[var(--sos-text-muted-more)]">{tr("dashboard.todaySummary")}</div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className={`${ui.card} flex flex-col`}>
          {cardHeader(
            <Icon.calendar size={18} />,
            tr("dashboard.todaysSchedule"),
            <button type="button" onClick={() => setActive("schedule")} className="cursor-pointer border-0 bg-transparent text-[13px] font-medium text-[var(--sos-accent)]">{tr("dashboard.viewFullSchedule")}</button>
          )}
          <div className="flex flex-col gap-2.5">
            {todaySchedule.length ? (
              todaySchedule.map((event, index) => (
                <div key={event.id || `${event.title}-${index}`} className="flex items-center gap-3 rounded-lg border border-[var(--sos-card-border)] bg-[var(--sos-bg-alt)] px-3.5 py-3">
                  <span className="w-[64px] shrink-0 text-[13px] font-semibold text-[var(--sos-accent)]">{formatTime(getEventTime(event), event.start_period, timeFormat)}</span>
                  <span className="h-8 w-px shrink-0 bg-[var(--sos-border-alt)]" />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[var(--sos-text)]">{titleCase(event.title)}</span>
                    <span className="block truncate text-xs text-[var(--sos-text-muted-more)]">{event.description ? titleCase(event.description) : tr(`tags.${event.tag || "study block"}`)}</span>
                  </span>
                </div>
              ))
            ) : (
              <EmptyState label={tr("dashboard.noEventsToday")} />
            )}
          </div>
        </section>

        <section className={`${ui.card} flex flex-col`}>
          {cardHeader(
            <Icon.check size={18} />,
            tr("dashboard.upcomingTasks"),
            <button type="button" onClick={() => setActive("studyplans")} className="cursor-pointer border-0 bg-transparent text-[13px] font-medium text-[var(--sos-accent)]">{tr("dashboard.viewAll")}</button>
          )}
          <div className="flex flex-col gap-1.5">
            {todayTasks.length ? (
              todayTasks.map(({ subtask, subject }) => (
                <label key={subtask.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--sos-hover)]">
                  <input type="checkbox" checked={Boolean(subtask.done)} onChange={() => toggleTask(subject.id, subtask)} className="h-[16px] w-[16px] shrink-0 accent-[var(--sos-accent)]" />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[14px] ${subtask.done ? "text-[var(--sos-text-muted-more)] line-through" : "text-[var(--sos-text)]"}`}>{titleCase(subtask.text || subtask.name)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[var(--sos-bg-alt)] px-2.5 py-1 text-[11px] font-medium text-[var(--sos-text-muted)]">{titleCase(subject.tag || subject.name)}</span>
                </label>
              ))
            ) : (
              <EmptyState label={tr("dashboard.noTasksToday")} />
            )}
          </div>
        </section>

        <section className={`${ui.card} flex flex-col`}>
          {cardHeader(
            <Icon.fileText size={18} />,
            tr("dashboard.recentNotes"),
            <button type="button" onClick={() => setActive("documents")} className="cursor-pointer border-0 bg-transparent text-[13px] font-medium text-[var(--sos-accent)]">{tr("dashboard.viewAll")}</button>
          )}
          <div className="flex flex-col gap-1.5">
            {recentNotes.length ? (
              recentNotes.map((note) => (
                <button key={note.id} type="button" onClick={() => setActive("documents")} className="flex items-center justify-between gap-3 rounded-lg border-0 bg-transparent px-2 py-2.5 text-left transition-colors hover:bg-[var(--sos-hover)]">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--sos-text)]">{note.title || tr("documents.untitledTitle")}</span>
                  <span className="shrink-0 text-xs text-[var(--sos-text-muted-more)]">{formatRelativeDate(note, i18n.language)}</span>
                </button>
              ))
            ) : (
              <EmptyState label={tr("dashboard.noNotesYet")} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex min-h-[160px] items-center justify-center text-[13px] text-[var(--sos-text-muted-more)]">{label}</div>;
}
