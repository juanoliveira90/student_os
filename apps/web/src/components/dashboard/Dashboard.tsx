import { type CSSProperties, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { DAY_LABELS } from "../data.js";
import { Icon } from "../icons";
import { getStyles } from "../ui";

type Theme = Record<string, string>;
type LooseRecord = Record<string, any>;

type DashboardProps = {
  user: LooseRecord | null;
  tasks: LooseRecord[];
  schedule: Record<string, LooseRecord[]>;
  subjects: LooseRecord[];
  setActive: (active: string) => void;
  navigateToCreate: (page: string, type: string) => void;
  timeFormat: string;
  t: Theme;
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

function getSubjectStats(subject: LooseRecord) {
  const subtasks = subject.subtasks || [];
  const total = subtasks.length || 0;
  const done = subtasks.filter((task) => task.done).length;
  const progress = Math.max(0, Math.min(100, Math.round((done / total) * 100)));

  return { done, total, progress };
}

export default function Dashboard({ user, tasks, schedule, subjects, setActive, navigateToCreate, timeFormat, t }: DashboardProps) {
  const { t: tr } = useTranslation();
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isStudyPlanExpanded, setIsStudyPlanExpanded] = useState(false);
  const s = getStyles(t);
  const profile = user?.user ?? user ?? {};
  const displayName = profile.name || profile.email?.split("@")[0];
  const today = DAY_LABELS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const allTodaySchedule = schedule?.[today] || [];
  const hasMoreScheduleItems = allTodaySchedule.length > 4;
  const scheduleItems = isScheduleExpanded ? allTodaySchedule : allTodaySchedule.slice(0, 3);
  const allSubjects = subjects || [];
  const hasMoreSubjectItems = allSubjects.length > 3;
  const subjectItems = isStudyPlanExpanded ? allSubjects : allSubjects.slice(0, 3);
  const pendingTasks = allSubjects.reduce((sum, subject) => sum + (subject.subtasks || []).filter((task) => !task.done).length, 0);
  const continueSubject = allSubjects.find((subject) => (subject.subtasks || []).some((task) => !task.done)) || allSubjects[0];
  const continuePending = continueSubject ? (continueSubject.subtasks || []).filter((task) => !task.done).length : tasks.filter((task) => !task.done).length;
  let continueTitle = tr("dashboard.noActiveStudyPlan");

  if (continueSubject) {
    continueTitle = titleCase(continueSubject.name);
    if (continueSubject.tag) continueTitle += ` - ${titleCase(continueSubject.tag)}`;
  }

  const card: CSSProperties = { ...s.card };
  const metricCard: CSSProperties = { ...card, display: "flex", flexDirection: "column" };
  const metricList: CSSProperties = { border: `1px solid ${t.cardBorder}`, borderRadius: 8, overflow: "hidden", background: t.card, flex: 1 };
  const scheduleList = {
    flex: "initial",
    maxHeight: scheduleItems.length ? scheduleItems.length * 78 : 174,
    overflow: "hidden",
    transition: "max-height 220ms ease",
  };
  const subjectList = {
    flex: "initial",
    maxHeight: subjectItems.length ? subjectItems.length * 74 : 174,
    overflow: "hidden",
    transition: "max-height 220ms ease",
  };
  const pillButton = { ...s.ghost, borderRadius: 999, padding: "7px 14px", background: t.card };
  const expandButton = { ...s.ghost, width: "100%", marginTop: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
  const actionButton = {
    ...s.ghost,
    minHeight: 54,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontSize: 15,
    color: t.text,
    background: t.card,
  };
  const dashboardHeader = (icon: ReactNode, label: string) => (
    <div className="sos-heading" style={{ display: "flex", alignItems: "center", gap: 8, color: t.text, fontSize: 15, fontWeight: 600 }}>
      {icon} {label}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 4 }}>
        <div>
          <h1 style={{ fontSize: 40, lineHeight: 1.1, fontWeight: 600, color: t.text, margin: 0 }}>{tr("dashboard.greeting", { name: titleCase(displayName) })}</h1>
          <div style={{ fontSize: 14, color: t.textMutedMore, marginTop: 6 }}>{tr("dashboard.todaySummary")}</div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <section style={metricCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
            {dashboardHeader(<Icon.cal />, tr("dashboard.todaysSchedule"))}
            <button type="button" onClick={() => setActive("schedule")} style={pillButton}>{tr("dashboard.viewFullSchedule")}</button>
          </div>

          <div style={scheduleList}>
            {scheduleItems.length ? (
              scheduleItems.map((event, index) => (
                <div key={event.id || `${event.title}-${index}`} style={{ display: "grid", gridTemplateColumns: "72px 24px 1fr", minHeight: 58 }}>
                  <div style={{ color: t.accent, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{formatTime(getEventTime(event), event.start_period, timeFormat)}</div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ position: "absolute", top: index === 0 ? "50%" : 0, bottom: index === scheduleItems.length - 1 ? "50%" : 0, width: 1, background: t.borderLight }} />
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: index === 0 ? t.accent : t.accentLight, position: "relative" }} />
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ color: t.text, fontSize: 15, fontWeight: 550 }}>{titleCase(event.title)}</div>
                    <div style={{ color: t.textMutedMore, fontSize: 12, marginTop: 3 }}>{event.description ? titleCase(event.description) : tr(`tags.${event.tag || "study block"}`)}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState t={t} label={tr("dashboard.noEventsToday")} />
            )}
          </div>
          {hasMoreScheduleItems && (
            <button type="button" onClick={() => setIsScheduleExpanded((value) => !value)} style={expandButton}>
              <span style={{ transform: isScheduleExpanded ? "rotate(-90deg)" : "rotate(90deg)", display: "inline-flex", transition: "transform 180ms ease" }}><Icon.chevronRight /></span>
              {isScheduleExpanded ? tr("common.showLess") : tr("common.showMore", { count: allTodaySchedule.length - 3 })}
            </button>
          )}
          <div style={{ color: t.text, fontSize: 13, marginTop: 16 }}>{tr(allTodaySchedule.length === 1 ? "dashboard.eventToday" : "dashboard.eventsToday", { count: allTodaySchedule.length })}</div>
        </section>

        <section style={metricCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
            {dashboardHeader(<Icon.book />, tr("dashboard.studyPlanProgress"))}
            <button type="button" onClick={() => setActive("studyplans")} style={pillButton}>{tr("dashboard.viewAll")}</button>
          </div>

          <div style={subjectList}>
            {subjectItems.length ? (
              subjectItems.map((subject, index) => {
                const stats = getSubjectStats(subject);
                return (
                  <div key={subject.id || subject.name} style={{ display: "grid", gridTemplateColumns: "1fr minmax(120px, 44%)", gap: 16, alignItems: "center", padding: "12px 16px" }}>
                    <div>
                      <div style={{ color: t.text, fontSize: 15, fontWeight: 550 }}>{titleCase(subject.name)}</div>
                      <div style={{ color: t.textMutedMore, fontSize: 12, marginTop: 3 }}>{subject.tag ? titleCase(subject.tag) : tr("dashboard.studyPlan")}</div>
                    </div>
                    <div>
                      <div style={{ color: t.textMuted, fontSize: 11, textAlign: "right", marginBottom: 9 }}>{tr("dashboard.tasksCount", { done: stats.done, total: stats.total })}</div>
                      <div style={{ height: 7, background: t.hover, borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${stats.progress}%`, height: "100%", background: t.accent, borderRadius: 999 }} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState t={t} label={tr("dashboard.noStudyPlans")} />
            )}
          </div>
          {hasMoreSubjectItems && (
            <button type="button" onClick={() => setIsStudyPlanExpanded((value) => !value)} style={expandButton}>
              <span style={{ transform: isStudyPlanExpanded ? "rotate(-90deg)" : "rotate(90deg)", display: "inline-flex", transition: "transform 180ms ease" }}><Icon.chevronRight /></span>
              {isStudyPlanExpanded ? tr("common.showLess") : tr("common.showMore", { count: allSubjects.length - 3 })}
            </button>
          )}
          <div style={{ color: t.text, fontSize: 13, marginTop: 16 }}>{tr(pendingTasks === 1 ? "dashboard.pendingTask" : "dashboard.pendingTasks", { count: pendingTasks })}</div>
        </section>
      </div>

      <section style={card}>
        {dashboardHeader(<Icon.clock />, tr("dashboard.continueStudying"))}
        <div style={{ marginTop: 14, padding: "20px", borderRadius: 8, background: t.card, border: `1px solid ${t.cardBorder}`, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }}>
          <div style={{ width: 50, height: 50, borderRadius: 8, background: `linear-gradient(135deg, ${t.accentLight}, ${t.accentDark})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontFamily: "var(--sos-font-display)" }}></div>
          <div>
            <div style={{ color: t.text, fontSize: 22, fontWeight: 600, fontFamily: "var(--sos-font-display)" }}>{continueTitle}</div>
            <div style={{ color: t.text, fontSize: 12, marginTop: 4 }}>{continueSubject ? titleCase(continueSubject.subtasks?.find((task) => !task.done)?.text || tr("dashboard.allTasksComplete")) : tr("dashboard.createStudyPlan")}</div>
            <div style={{ color: t.textMutedMore, fontSize: 11, marginTop: 5 }}>{tr(continuePending === 1 ? "dashboard.pendingTask" : "dashboard.pendingTasks", { count: continuePending })}</div>
          </div>
          <button type="button" onClick={() => setActive("studyplans")} style={{ ...s.btn, minWidth: 92, height: 40 }}>{tr("common.continue")}</button>
        </div>
      </section>

      <section style={card}>
        {dashboardHeader(<Icon.zap />, tr("dashboard.quickActions"))}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginTop: 16 }}>
          <button type="button" onClick={() => navigateToCreate("schedule", "study-block")} style={actionButton}><Icon.plus />{tr("dashboard.addScheduleBlock")}</button>
          <button type="button" onClick={() => navigateToCreate("studyplans", "subject")} style={actionButton}><Icon.plus />{tr("dashboard.addSubjectPlan")}</button>
          <button type="button" onClick={() => navigateToCreate("documents", "note")} style={actionButton}><Icon.plus />{tr("dashboard.createNote")}</button>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ t, label }: { t: Theme; label: string }) {
  return (
    <div style={{ minHeight: 174, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMutedMore, fontSize: 13 }}>
      {label}
    </div>
  );
}
