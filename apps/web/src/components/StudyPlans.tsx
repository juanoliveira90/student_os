import { type FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.js";
import { Modal, ui } from "./ui.js";
import { saveStudyPlanChanges, studyPlanQueryKey } from "../fetchs/studyPlanFetchs.js";

type Theme = Record<string, string>;
type LooseRecord = Record<string, any>;

type StudyPlansProps = {
  subjects: LooseRecord[];
  setSubjects: (value: any) => void;
  schedule: Record<string, LooseRecord[]>;
  setSchedule: (value: any) => void;
  createAction?: { id: number; type: string } | null;
  onCreateActionHandled?: () => void;
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

const emptyPlanForm = { id: "", name: "", day: "", startTime: "", startPeriod: "AM", endTime: "", endPeriod: "AM", scheduleBlockId: "" };
const emptySubjectForm = { id: "", name: "", description: "", tag: "" };
const emptySubtaskForm = { id: "", name: "", done: false };

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function getStudyBlocks(schedule: Record<string, LooseRecord[]>) {
  return DAY_LABELS.flatMap((day) =>
    (schedule?.[day] || [])
      .filter((event) => event.tag === "study block")
      .map((event) => ({ ...event, day }))
  );
}

function getStudyPlans(subjects: LooseRecord[]) {
  const plans = new Map<string, LooseRecord>();

  for (const subject of subjects || []) {
    if (!subject.studyPlanId) continue;

    if (!plans.has(subject.studyPlanId)) {
      plans.set(subject.studyPlanId, {
        id: subject.studyPlanId,
        name: subject.studyPlanName || subject.name,
        day: subject.studyPlanDay || "",
        startTime: String(subject.studyPlanStartTime || "").slice(0, 5),
        startPeriod: subject.studyPlanStartPeriod || "",
        endTime: String(subject.studyPlanEndTime || "").slice(0, 5),
        endPeriod: subject.studyPlanEndPeriod || "",
        scheduleBlockId: subject.studyPlanScheduleBlockId || "",
        subjects: [],
      });
    }

    if (!subject.isStudyPlanPlaceholder) {
      plans.get(subject.studyPlanId)!.subjects.push(subject);
    }
  }

  return Array.from(plans.values());
}

function getPlanStats(plan: LooseRecord) {
  const topics = plan.subjects || [];
  const tasks = topics.flatMap((subject) => subject.subtasks || []);
  const done = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return { topicCount: topics.length, taskCount: tasks.length, done, progress };
}

function getSubjectProgress(subject: LooseRecord) {
  const tasks = subject?.subtasks || [];
  const done = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return { done, total: tasks.length, progress };
}

function toPlanPlaceholder(plan: LooseRecord) {
  return {
    id: `plan:${plan.id}`,
    isStudyPlanPlaceholder: true,
    studyPlanId: plan.id,
    studyPlanName: plan.name,
    studyPlanDay: plan.day || "",
    studyPlanStartTime: plan.startTime || "",
    studyPlanStartPeriod: plan.startPeriod || "",
    studyPlanEndTime: plan.endTime || "",
    studyPlanEndPeriod: plan.endPeriod || "",
    studyPlanScheduleBlockId: plan.scheduleBlockId || "",
    name: plan.name,
    description: "",
    tag: "",
    scheduleBlockId: "",
    subtasks: [],
  };
}

function withPlanFields(subject: LooseRecord, plan: LooseRecord) {
  return {
    ...subject,
    studyPlanName: plan.name,
    studyPlanDay: plan.day || "",
    studyPlanStartTime: plan.startTime || "",
    studyPlanStartPeriod: plan.startPeriod || "",
    studyPlanEndTime: plan.endTime || "",
    studyPlanEndPeriod: plan.endPeriod || "",
    studyPlanScheduleBlockId: plan.scheduleBlockId || "",
  };
}

function toSubjectPayload(subject: LooseRecord) {
  return {
    id: subject.id,
    studyPlanId: subject.studyPlanId || "",
    name: normalizeText(subject.name),
    description: normalizeText(subject.description),
    tag: normalizeText(subject.tag),
    scheduleBlockId: subject.scheduleBlockId || "",
    subtasks: subject.subtasks || [],
  };
}

function normalizeSubtask(subtask: LooseRecord) {
  const name = normalizeText(subtask.name || subtask.text);

  return {
    id: subtask.id,
    name,
    text: name,
    done: Boolean(subtask.done),
  };
}

function formatPlanSchedule(plan: LooseRecord, studyBlocks: LooseRecord[], tr: (key: string) => string) {
  if (plan.scheduleBlockId) {
    const block = studyBlocks.find((item) => item.id === plan.scheduleBlockId);
    if (block) return `${tr(`days.${block.day}`)} - ${block.title}`;
    return tr("studyPlans.linkedStudyBlock");
  }

  if (!plan.day) return tr("studyPlans.noScheduledDay");
  const time = [plan.startTime, plan.endTime].filter(Boolean).join(" - ");
  const period = [plan.startPeriod, plan.endPeriod].filter(Boolean).join("/");
  const suffix = period ? ` ${period}` : "";
  return `${tr(`days.${plan.day}`)}${time ? `, ${time}${suffix}` : ""}`;
}

export default function StudyPlans({ subjects, setSubjects, schedule, setSchedule, createAction, onCreateActionHandled, t }: StudyPlansProps) {
  const { t: tr } = useTranslation();
  const queryClient = useQueryClient();
  const studyBlocks = getStudyBlocks(schedule);
  const studyPlans = getStudyPlans(subjects);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [planMenuId, setPlanMenuId] = useState("");
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);
  const [subtaskForm, setSubtaskForm] = useState(emptySubtaskForm);
  const [planModal, setPlanModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [subtaskModal, setSubtaskModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(emptyChanges);

  const selectedPlan = studyPlans.find((plan) => plan.id === selectedPlanId) || studyPlans[0];
  const topics = selectedPlan?.subjects || [];
  const selectedSubject = topics.find((subject) => subject.id === selectedSubjectId) || topics[0];
  const planStats = selectedPlan ? getPlanStats(selectedPlan) : { topicCount: 0, taskCount: 0, done: 0, progress: 0 };
  const subjectStats = selectedSubject ? getSubjectProgress(selectedSubject) : { done: 0, total: 0, progress: 0 };

  useEffect(() => {
    if (!selectedPlanId && studyPlans[0]) setSelectedPlanId(studyPlans[0].id);
  }, [studyPlans.length, selectedPlanId]);

  useEffect(() => {
    if (!selectedSubjectId && topics[0]) setSelectedSubjectId(topics[0].id);
    if (selectedSubjectId && topics.length && !topics.some((subject) => subject.id === selectedSubjectId)) setSelectedSubjectId(topics[0].id);
  }, [topics.length, selectedSubjectId]);

  useEffect(() => {
    if (!createAction) return;
    if (createAction.type === "subject") openPlanModal();
    onCreateActionHandled?.();
  }, [createAction?.id]);

  function markChanged() {
    setHasChanges(true);
    setSaveMessage("");
  }

  function syncPlanSchedule(planId: string, blockId: string) {
    setSchedule((days) =>
      Object.fromEntries(
        Object.entries(days).map(([day, events]) => [
          day,
          events.map((event) => {
            if (event.studyPlanId === planId && event.id !== blockId) return { ...event, studyPlanId: "" };
            if (event.id === blockId) return { ...event, studyPlanId: planId };
            return event;
          }),
        ])
      )
    );
  }

  function queuePlanUpdate(plan: LooseRecord) {
    setPendingChanges((current) => {
      const created = current.createStudyPlans.find((item) => item.id === plan.id);
      if (created) {
        return { ...current, createStudyPlans: current.createStudyPlans.map((item) => (item.id === plan.id ? { ...item, ...plan } : item)) };
      }

      return { ...current, updateStudyPlans: [...current.updateStudyPlans.filter((item) => item.id !== plan.id), plan] };
    });
  }

  function openPlanModal(plan?: LooseRecord) {
    if (plan) {
      setPlanForm({
        id: plan.id,
        name: plan.name,
        day: plan.day || "",
        startTime: plan.startTime || "",
        startPeriod: plan.startPeriod || "AM",
        endTime: plan.endTime || "",
        endPeriod: plan.endPeriod || "AM",
        scheduleBlockId: plan.scheduleBlockId || "",
      });
    } else {
      setPlanForm(emptyPlanForm);
    }

    setPlanMenuId("");
    setPlanModal(true);
  }

  function savePlan() {
    const name = normalizeText(planForm.name);
    if (!name) return;

    const plan = {
      id: planForm.id || crypto.randomUUID(),
      name,
      day: planForm.scheduleBlockId ? "" : planForm.day,
      startTime: planForm.scheduleBlockId ? "" : planForm.startTime,
      startPeriod: planForm.scheduleBlockId ? "" : planForm.startPeriod,
      endTime: planForm.scheduleBlockId ? "" : planForm.endTime,
      endPeriod: planForm.scheduleBlockId ? "" : planForm.endPeriod,
      scheduleBlockId: planForm.scheduleBlockId,
    };

    if (planForm.id) {
      setSubjects((items) => items.map((item) => item.studyPlanId === plan.id ? withPlanFields(item, plan) : item));
      queuePlanUpdate(plan);
    } else {
      setSubjects((items) => [...items, toPlanPlaceholder(plan)]);
      setPendingChanges((current) => ({ ...current, createStudyPlans: [...current.createStudyPlans, plan] }));
      setSelectedPlanId(plan.id);
    }

    if (plan.scheduleBlockId) syncPlanSchedule(plan.id, plan.scheduleBlockId);
    markChanged();
    setPlanModal(false);
  }

  function deletePlan(planId: string) {
    setSubjects((items) => items.filter((item) => item.studyPlanId !== planId));
    setSchedule((days) => Object.fromEntries(Object.entries(days).map(([day, events]) => [day, events.map((event) => event.studyPlanId === planId ? { ...event, studyPlanId: "" } : event)])));
    setPendingChanges((current) => {
      const wasNew = current.createStudyPlans.some((item) => item.id === planId);
      return {
        ...current,
        createStudyPlans: current.createStudyPlans.filter((item) => item.id !== planId),
        updateStudyPlans: current.updateStudyPlans.filter((item) => item.id !== planId),
        deleteStudyPlans: wasNew ? current.deleteStudyPlans : [...current.deleteStudyPlans.filter((id) => id !== planId), planId],
      };
    });
    setSelectedPlanId("");
    setSelectedSubjectId("");
    setPlanMenuId("");
    markChanged();
  }

  function openSubjectModal(subject?: LooseRecord) {
    if (subject) {
      setSubjectForm({ id: subject.id, name: subject.name || "", description: subject.description || "", tag: subject.tag || "" });
    } else {
      setSubjectForm(emptySubjectForm);
    }
    setSubjectModal(true);
  }

  function saveSubject(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selectedPlan || !normalizeText(subjectForm.name)) return;

    const subject = {
      id: subjectForm.id || crypto.randomUUID(),
      studyPlanId: selectedPlan.id,
      studyPlanName: selectedPlan.name,
      studyPlanDay: selectedPlan.day,
      studyPlanStartTime: selectedPlan.startTime,
      studyPlanStartPeriod: selectedPlan.startPeriod,
      studyPlanEndTime: selectedPlan.endTime,
      studyPlanEndPeriod: selectedPlan.endPeriod,
      studyPlanScheduleBlockId: selectedPlan.scheduleBlockId,
      name: normalizeText(subjectForm.name),
      description: normalizeText(subjectForm.description),
      tag: normalizeText(subjectForm.tag),
      scheduleBlockId: "",
      subtasks: subjectForm.id ? selectedSubject?.subtasks || [] : [],
    };

    if (subjectForm.id) {
      setSubjects((items) => items.map((item) => item.id === subject.id ? { ...item, ...subject } : item));
      setPendingChanges((current) => ({ ...current, updateSubjects: [...current.updateSubjects.filter((item) => item.id !== subject.id), toSubjectPayload(subject)] }));
    } else {
      setSubjects((items) => [...items.filter((item) => item.id !== `plan:${selectedPlan.id}`), subject]);
      setPendingChanges((current) => ({ ...current, createSubjects: [...current.createSubjects, subject] }));
      setSelectedSubjectId(subject.id);
    }

    markChanged();
    setSubjectModal(false);
  }

  function deleteSubject(subjectId: string) {
    setSubjects((items) => items.filter((item) => item.id !== subjectId));
    setPendingChanges((current) => {
      const wasNew = current.createSubjects.some((item) => item.id === subjectId);
      return {
        ...current,
        createSubjects: current.createSubjects.filter((item) => item.id !== subjectId),
        updateSubjects: current.updateSubjects.filter((item) => item.id !== subjectId),
        createSubtasks: current.createSubtasks.filter((item) => item.subjectId !== subjectId),
        deleteSubjects: wasNew ? current.deleteSubjects : [...current.deleteSubjects.filter((id) => id !== subjectId), subjectId],
      };
    });
    setSelectedSubjectId("");
    markChanged();
  }

  function openSubtaskModal(subtask?: LooseRecord) {
    if (subtask) setSubtaskForm({ id: subtask.id, name: subtask.name || subtask.text || "", done: Boolean(subtask.done) });
    if (!subtask) setSubtaskForm(emptySubtaskForm);
    setSubtaskModal(true);
  }

  function saveSubtask(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selectedSubject || !normalizeText(subtaskForm.name)) return;

    const subtask = normalizeSubtask({ ...subtaskForm, id: subtaskForm.id || crypto.randomUUID() });

    setSubjects((items) => items.map((item) => {
      if (item.id !== selectedSubject.id) return item;
      const existing = (item.subtasks || []).some((task) => task.id === subtask.id);
      const subtasks = existing
        ? item.subtasks.map((task) => task.id === subtask.id ? subtask : task)
        : [...(item.subtasks || []), subtask];
      return { ...item, subtasks };
    }));

    setPendingChanges((current) => {
      const createdSubject = current.createSubjects.find((item) => item.id === selectedSubject.id);
      if (createdSubject) {
        return {
          ...current,
          createSubjects: current.createSubjects.map((item) => {
            if (item.id !== selectedSubject.id) return item;
            const subtasks = subtaskForm.id
              ? (item.subtasks || []).map((task) => task.id === subtask.id ? subtask : task)
              : [...(item.subtasks || []), subtask];
            return { ...item, subtasks };
          }),
        };
      }

      if (!subtaskForm.id) return { ...current, createSubtasks: [...current.createSubtasks, { subjectId: selectedSubject.id, subtask }] };
      return { ...current, updateSubtasks: [...current.updateSubtasks.filter((item) => item.id !== subtask.id), subtask] };
    });

    markChanged();
    setSubtaskModal(false);
  }

  function toggleSubtask(subtask: LooseRecord) {
    if (!selectedSubject) return;
    const updatedSubtask = normalizeSubtask({ ...subtask, done: !subtask.done });

    setSubjects((items) => items.map((item) => {
      if (item.id !== selectedSubject.id) return item;
      return { ...item, subtasks: (item.subtasks || []).map((task) => task.id === updatedSubtask.id ? updatedSubtask : task) };
    }));

    setPendingChanges((current) => ({
      ...current,
      updateSubtasks: [...current.updateSubtasks.filter((item) => item.id !== updatedSubtask.id), updatedSubtask],
    }));
    markChanged();
  }

  function deleteSubtask(subtaskId: string) {
    if (!selectedSubject) return;
    setSubjects((items) => items.map((item) => item.id === selectedSubject.id ? { ...item, subtasks: (item.subtasks || []).filter((subtask) => subtask.id !== subtaskId) } : item));
    setPendingChanges((current) => ({
      ...current,
      createSubtasks: current.createSubtasks.filter((item) => item.subtask.id !== subtaskId),
      updateSubtasks: current.updateSubtasks.filter((item) => item.id !== subtaskId),
      deleteSubtasks: current.createSubtasks.some((item) => item.subtask.id === subtaskId) ? current.deleteSubtasks : [...current.deleteSubtasks.filter((id) => id !== subtaskId), subtaskId],
    }));
    markChanged();
  }

  async function saveChanges() {
    setSaving(true);
    setSaveMessage("");

    try {
      await saveStudyPlanChanges(pendingChanges);
      setPendingChanges(emptyChanges);
      setHasChanges(false);
      setSaveMessage("saved");
      queryClient.invalidateQueries({ queryKey: studyPlanQueryKey });
    } catch (error) {
      console.error(error);
      setSaveMessage("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-[40px] font-semibold leading-[1.1] text-[var(--sos-text)]">{tr("studyPlans.title")}</h1>
          <div className="mt-1.5 text-sm text-[var(--sos-text-muted-more)]">{tr("studyPlans.description")}</div>
          {saveMessage && <div className={`mt-2 text-[13px] ${saveMessage === "saved" ? "text-[var(--sos-accent)]" : "text-[var(--sos-text-muted-more)]"}`}>{tr(saveMessage === "saved" ? "common.saved" : "common.couldNotSave")}</div>}
        </div>
        <div className="flex flex-wrap justify-end gap-2.5">
          <button onClick={saveChanges} disabled={!hasChanges || saving} className={ui.btn}>{saving ? tr("common.saving") : tr("common.save")}</button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <aside className={`${ui.card} flex flex-col`}>
          <button onClick={() => openPlanModal()} className={`${ui.btn} mb-3 flex items-center justify-center gap-2`}><Icon.plus size={15} /> {tr("studyPlans.newPlan")}</button>
          <div className="flex flex-col gap-1.5">
            {studyPlans.map((plan) => (
              <div key={plan.id} className={`relative rounded-lg border ${selectedPlan?.id === plan.id ? "border-[var(--sos-accent)] bg-[color-mix(in_srgb,var(--sos-accent)_10%,var(--sos-card))]" : "border-transparent hover:bg-[var(--sos-hover)]"}`}>
                <button onClick={() => { setSelectedPlanId(plan.id); setSelectedSubjectId(""); }} className="w-full cursor-pointer rounded-lg border-0 bg-transparent py-2.5 pl-3 pr-[34px] text-left font-inherit">
                  <span className="block font-[family:var(--sos-font-display)] text-[17px] font-medium text-[var(--sos-text)]">{plan.name}</span>
                  <span className="mt-[3px] block truncate text-[13px] text-[var(--sos-text-muted-more)]">{formatPlanSchedule(plan, studyBlocks, tr)}</span>
                </button>
                <button onClick={() => setPlanMenuId(planMenuId === plan.id ? "" : plan.id)} aria-label={tr("common.edit")} className="absolute right-1.5 top-2.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[var(--sos-text-muted-most)] hover:text-[var(--sos-text)]"><Icon.more size={16} /></button>
                {planMenuId === plan.id && (
                  <div className="absolute right-1 top-[38px] z-[3] rounded-lg border border-[var(--sos-border)] bg-[var(--sos-card)] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
                    <button onClick={() => openPlanModal(plan)} className="flex w-[120px] cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2.5 py-2 text-left font-inherit text-[13px] text-[var(--sos-text)] hover:bg-[var(--sos-hover)]"><Icon.edit size={14} /> {tr("common.edit")}</button>
                    <button onClick={() => deletePlan(plan.id)} className="flex w-[120px] cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2.5 py-2 text-left font-inherit text-[13px] text-[var(--sos-accent)] hover:bg-[var(--sos-hover)]"><Icon.trash size={14} /> {tr("common.delete")}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <main className={ui.card}>
          {!selectedPlan && <div className="flex min-h-[200px] items-center justify-center text-[var(--sos-text-muted-more)]">{tr("studyPlans.createPlanEmptyState")}</div>}
          {selectedPlan && (
            <>
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[color-mix(in_srgb,var(--sos-accent)_14%,var(--sos-card))] text-[var(--sos-accent)]"><Icon.book size={20} /></div>
                <div className="min-w-0">
                  <h2 className="m-0 truncate text-[26px] font-semibold text-[var(--sos-text)]">{selectedPlan.name}</h2>
                  <div className="mt-[5px] flex flex-wrap items-center gap-2 text-[13px] text-[var(--sos-text-muted-more)]">
                    <span>{formatPlanSchedule(selectedPlan, studyBlocks, tr)}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--sos-text-muted-more)]" />
                    <span>{tr("studyPlans.topicsCount", { count: planStats.topicCount })}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--sos-text-muted-more)]" />
                    <span>{tr("studyPlans.tasksCount", { count: planStats.taskCount })}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-[var(--sos-card-border)] bg-[var(--sos-bg-alt)] p-4">
                <div className="mb-2 flex justify-between text-[13px] text-[var(--sos-text)]"><span>{tr("studyPlans.overallProgress")}</span><span className="font-[family:var(--sos-font-display)] text-[15px]">{planStats.progress}%</span></div>
                <progress value={planStats.progress} max={100} className="block h-2 w-full overflow-hidden rounded-full accent-[var(--sos-accent)] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[var(--sos-accent)] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[var(--sos-hover)] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[var(--sos-accent)]" />
              </div>

              <section className="mt-5 border-t border-[var(--sos-border)] pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="m-0 text-[15px] font-semibold text-[var(--sos-text)]">{tr("studyPlans.topics")}</h3>
                  <button onClick={() => openSubjectModal()} className={`${ui.ghost} flex items-center gap-1.5 px-3 py-2 text-[13px]`}><Icon.plus size={14} /> {tr("studyPlans.topic")}</button>
                </div>
                <div className="flex flex-col gap-2">
                  {topics.map((subject, index) => {
                    const stats = getSubjectProgress(subject);
                    const on = selectedSubject?.id === subject.id;
                    return (
                      <button key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} className={`grid w-full cursor-pointer grid-cols-[28px_1fr_84px_56px_44px] items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors ${on ? "border-[var(--sos-accent)] bg-[color-mix(in_srgb,var(--sos-accent)_10%,var(--sos-card))]" : "border-[var(--sos-card-border)] bg-[var(--sos-card)] hover:bg-[var(--sos-hover)]"}`}>
                        <span className={`inline-flex h-[24px] w-[24px] items-center justify-center rounded-full text-[12px] font-semibold ${on ? "bg-[var(--sos-accent)] text-white" : "bg-[var(--sos-bg-alt)] text-[var(--sos-text-muted)]"}`}>{index + 1}</span>
                        <span className="min-w-0 truncate font-[family:var(--sos-font-display)] text-[17px] font-medium text-[var(--sos-text)]">{subject.name}</span>
                        <span className="text-right text-[11px] text-[var(--sos-text-muted-more)]">{tr("dashboard.tasksCount", { done: stats.done, total: stats.total })}</span>
                        <progress value={stats.progress} max={100} className="block h-1.5 w-full overflow-hidden rounded-full accent-[var(--sos-accent)] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[var(--sos-accent)] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[var(--sos-hover)] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[var(--sos-accent)]" />
                        <span className="text-right font-[family:var(--sos-font-display)] text-[13px] font-medium text-[var(--sos-text-muted-more)]">{stats.progress}%</span>
                      </button>
                    );
                  })}
                  {!topics.length && <div className="py-6 text-center text-[13px] text-[var(--sos-text-muted-more)]">{tr("studyPlans.createPlanEmptyState")}</div>}
                </div>
              </section>
            </>
          )}
        </main>

        <aside className={`${ui.card} xl:sticky xl:top-4`}>
          {!selectedSubject && <div className="flex min-h-[200px] items-center justify-center text-center text-[13px] text-[var(--sos-text-muted-more)]">{tr("studyPlans.selectTopic")}</div>}
          {selectedSubject && (
            <>
              <div className="mb-4 flex justify-between gap-2.5">
                <div className="min-w-0">
                  <h3 className="m-0 truncate text-[20px] font-semibold text-[var(--sos-text)]">{selectedSubject.name}</h3>
                  <p className="m-0 mt-2 text-xs leading-normal text-[var(--sos-text-muted-more)]">{selectedSubject.description || tr("studyPlans.noDescriptionYet")}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openSubjectModal(selectedSubject)} aria-label={tr("common.edit")} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[var(--sos-text-muted-most)] hover:text-[var(--sos-text)]"><Icon.edit size={15} /></button>
                  <button onClick={() => deleteSubject(selectedSubject.id)} aria-label={tr("common.delete")} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[var(--sos-text-muted-most)] hover:text-[var(--sos-accent)]"><Icon.trash size={15} /></button>
                </div>
              </div>
              <div className="mb-1.5 flex justify-between text-[var(--sos-text-muted-more)]"><span className="text-[13px]">{tr("studyPlans.progress")}</span><span className="text-[11px]">{tr("dashboard.tasksCount", { done: subjectStats.done, total: subjectStats.total })}</span></div>
              <progress value={subjectStats.progress} max={100} className="mb-4 block h-2 w-full overflow-hidden rounded-full accent-[var(--sos-accent)] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[var(--sos-accent)] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[var(--sos-hover)] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[var(--sos-accent)]" />
              <div className="mb-2.5 flex items-center justify-between">
                <h4 className="m-0 text-[15px] font-semibold text-[var(--sos-text)]">{tr("studyPlans.tasks")}</h4>
                <button onClick={() => openSubtaskModal()} className={`${ui.ghost} flex items-center gap-1.5 px-2.5 py-[7px] text-xs`}><Icon.plus size={13} /> {tr("studyPlans.task")}</button>
              </div>
              <div className="flex flex-col gap-1">
                {(selectedSubject.subtasks || []).map((subtask) => (
                  <div key={subtask.id} className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md px-1 py-1.5 hover:bg-[var(--sos-hover)]">
                    <input type="checkbox" checked={Boolean(subtask.done)} onChange={() => toggleSubtask(subtask)} className="m-0 h-[16px] w-[16px] accent-[var(--sos-accent)]" />
                    <span className="min-w-0">
                      <span className={`block truncate text-[14px] ${subtask.done ? "text-[var(--sos-text-muted-more)] line-through" : "text-[var(--sos-text)]"}`}>{subtask.text || subtask.name}</span>
                    </span>
                    <button onClick={() => openSubtaskModal(subtask)} aria-label={tr("common.edit")} className="cursor-pointer border-0 bg-transparent text-[var(--sos-text-muted-most)] hover:text-[var(--sos-text)]"><Icon.edit size={14} /></button>
                    <button onClick={() => deleteSubtask(subtask.id)} aria-label={tr("common.delete")} className="cursor-pointer border-0 bg-transparent text-[var(--sos-text-muted-most)] hover:text-[var(--sos-accent)]"><Icon.trash size={14} /></button>
                  </div>
                ))}
                {!(selectedSubject.subtasks || []).length && <div className="py-4 text-center text-[12px] text-[var(--sos-text-muted-more)]">{tr("studyPlans.selectTopic")}</div>}
              </div>
            </>
          )}
        </aside>
      </div>

      {planModal && (
        <Modal onClose={() => setPlanModal(false)} title={planForm.id ? tr("studyPlans.editPlan") : tr("studyPlans.newPlan")} t={t}>
          <label className={ui.label}>{tr("studyPlans.planName")}</label>
          <input value={planForm.name} onChange={(event) => setPlanForm((form) => ({ ...form, name: event.target.value }))} placeholder={tr("studyPlans.planNamePlaceholder")} className={ui.input} autoFocus />
          <label className={ui.label}>{tr("studyPlans.existingStudyBlock")}</label>
          <select value={planForm.scheduleBlockId} onChange={(event) => setPlanForm((form) => ({ ...form, scheduleBlockId: event.target.value }))} className={ui.input}>
            <option value="">{tr("studyPlans.noLinkedBlock")}</option>
            {studyBlocks.map((block) => <option key={block.id} value={block.id}>{tr(`days.${block.day}`)} - {block.title}</option>)}
          </select>
          {!planForm.scheduleBlockId && (
            <>
              <label className={ui.label}>{tr("studyPlans.optionalDay")}</label>
              <select value={planForm.day} onChange={(event) => setPlanForm((form) => ({ ...form, day: event.target.value }))} className={ui.input}>
                <option value="">{tr("studyPlans.noScheduledDay")}</option>
                {DAY_LABELS.map((day) => <option key={day} value={day}>{tr(`days.${day}`)}</option>)}
              </select>
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <input value={planForm.startTime} onChange={(event) => setPlanForm((form) => ({ ...form, startTime: event.target.value }))} placeholder="09:00" className={ui.input} />
                <select value={planForm.startPeriod} onChange={(event) => setPlanForm((form) => ({ ...form, startPeriod: event.target.value }))} className={ui.input}><option>AM</option><option>PM</option></select>
                <input value={planForm.endTime} onChange={(event) => setPlanForm((form) => ({ ...form, endTime: event.target.value }))} placeholder="10:00" className={ui.input} />
                <select value={planForm.endPeriod} onChange={(event) => setPlanForm((form) => ({ ...form, endPeriod: event.target.value }))} className={ui.input}><option>AM</option><option>PM</option></select>
              </div>
            </>
          )}
          <button onClick={savePlan} className={ui.btn}>{tr("common.save")}</button>
        </Modal>
      )}

      {subjectModal && (
        <Modal onClose={() => setSubjectModal(false)} title={subjectForm.id ? tr("studyPlans.editTopic") : tr("studyPlans.newTopic")} t={t}>
          <form onSubmit={saveSubject}>
            <label className={ui.label}>{tr("studyPlans.topicName")}</label>
            <input value={subjectForm.name} onChange={(event) => setSubjectForm((form) => ({ ...form, name: event.target.value }))} placeholder={tr("studyPlans.topicNamePlaceholder")} className={ui.input} autoFocus />
            <label className={ui.label}>{tr("common.description")}</label>
            <textarea value={subjectForm.description} onChange={(event) => setSubjectForm((form) => ({ ...form, description: event.target.value }))} placeholder={tr("studyPlans.topicDescriptionPlaceholder")} rows={4} className={`${ui.input} min-h-24 resize-y`} />
            <label className={ui.label}>{tr("studyPlans.tag")}</label>
            <input value={subjectForm.tag} onChange={(event) => setSubjectForm((form) => ({ ...form, tag: event.target.value }))} placeholder={tr("studyPlans.tagPlaceholder")} className={ui.input} />
            <button type="submit" className={ui.btn}>{tr("common.save")}</button>
          </form>
        </Modal>
      )}

      {subtaskModal && (
        <Modal onClose={() => setSubtaskModal(false)} title={subtaskForm.id ? tr("studyPlans.editTask") : tr("studyPlans.newTask")} t={t}>
          <form onSubmit={saveSubtask}>
            <label className={ui.label}>{tr("studyPlans.taskName")}</label>
            <input value={subtaskForm.name} onChange={(event) => setSubtaskForm((form) => ({ ...form, name: event.target.value }))} placeholder={tr("studyPlans.taskNamePlaceholder")} className={ui.input} autoFocus />
            <button type="submit" className={ui.btn}>{tr("common.save")}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
