import { type FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DAY_LABELS } from "../data.js";
import { Icon } from "../icons";
import { getStyles, Modal } from "../ui";
import { saveStudyPlanChanges, studyPlanQueryKey } from "../../fetchs/studyPlanFetchs";

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
    return "Linked study block";
  }

  if (!plan.day) return "No scheduled day";
  const time = [plan.startTime, plan.endTime].filter(Boolean).join(" - ");
  const period = [plan.startPeriod, plan.endPeriod].filter(Boolean).join("/");
  const suffix = period ? ` ${period}` : "";
  return `${tr(`days.${plan.day}`)}${time ? `, ${time}${suffix}` : ""}`;
}

export default function StudyPlans({ subjects, setSubjects, schedule, setSchedule, createAction, onCreateActionHandled, timeFormat, t }: StudyPlansProps) {
  const { t: tr } = useTranslation();
  const s = getStyles(t);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 40, lineHeight: 1.1, fontWeight: 600, color: t.text, margin: 0 }}>{tr("studyPlans.title")}</h1>
          <div style={{ fontSize: 14, color: t.textMutedMore, marginTop: 6 }}>{tr("studyPlans.description")}</div>
          {saveMessage && <div style={{ fontSize: 13, color: saveMessage === "saved" ? t.accent : t.textMutedMore, marginTop: 8 }}>{tr(saveMessage === "saved" ? "common.saved" : "common.couldNotSave")}</div>}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={saveChanges} disabled={!hasChanges || saving} style={{ ...s.btn, opacity: !hasChanges || saving ? 0.55 : 1 }}>{saving ? tr("common.saving") : tr("common.save")}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <aside style={s.card}>
          <button onClick={() => openPlanModal()} style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, color: t.textMuted, fontSize: 15, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, textAlign: "left", marginBottom: 12 }}>+ New Plan</button>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {studyPlans.map((plan) => (
              <div key={plan.id} style={{ position: "relative", background: selectedPlan?.id === plan.id ? t.hover : "transparent", borderRadius: 8 }}>
                <button onClick={() => { setSelectedPlanId(plan.id); setSelectedSubjectId(""); }} style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, color: t.textMuted, fontSize: 15, padding: "10px 34px 10px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, textAlign: "left" }}>
                  <span style={{ display: "block", color: t.text, fontFamily: "var(--sos-font-display)", fontSize: 18, fontWeight: 500 }}>{plan.name}</span>
                  <span style={{ display: "block", color: t.textMutedMore, fontSize: 14, marginTop: 3 }}>{formatPlanSchedule(plan, studyBlocks, tr)}</span>
                </button>
                <button onClick={() => setPlanMenuId(planMenuId === plan.id ? "" : plan.id)} style={{ position: "absolute", right: 6, top: 8, background: "none", border: "none", color: t.textMutedMost, cursor: "pointer" }}>...</button>
                {planMenuId === plan.id && (
                  <div style={{ position: "absolute", right: 4, top: 34, zIndex: 3, background: t.bgAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}>
                    <button onClick={() => openPlanModal(plan)} style={{ ...s.ghost, width: 100 }}>Update</button>
                    <button onClick={() => deletePlan(plan.id)} style={{ ...s.ghost, width: 100 }}>Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <main style={s.card}>
          {!selectedPlan && <div style={{ color: t.textMutedMore }}>Create a Study Plan to start adding topics.</div>}
          {selectedPlan && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(240px, 360px)", gap: 18, alignItems: "center", marginBottom: 22 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, background: t.hover, border: `1px solid ${t.borderAlt}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: t.accent }}><Icon.book /></div>
                  <div>
                    <h2 style={{ color: t.text, fontSize: 28, fontWeight: 600, margin: 0 }}>{selectedPlan.name}</h2>
                    <div style={{ color: t.textMutedMore, fontSize: 14, marginTop: 5, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{formatPlanSchedule(selectedPlan, studyBlocks, tr)}</span>
                      <span style={{ width: 4, height: 4, borderRadius: 999, background: t.textMutedMore }} />
                      <span>{planStats.topicCount} topics</span>
                      <span style={{ width: 4, height: 4, borderRadius: 999, background: t.textMutedMore }} />
                      <span>{planStats.taskCount} tasks</span>
                    </div>
                  </div>
                </div>
                <div style={{ transform: "translateX(-36%)", width: "120%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: t.text, fontSize: 13, fontWeight: 400, marginBottom: 8 }}><span>Overall Progress</span><span style={{ fontFamily: "var(--sos-font-display)", fontSize: 15, fontWeight: 400 }}>{planStats.progress}%</span></div>
                  <div style={{ height: 8, background: t.hover, borderRadius: 999 }}><div style={{ width: `${planStats.progress}%`, height: "100%", background: t.accent, borderRadius: 999 }} /></div>
                </div>
              </div>

              <div>
                <section style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ color: t.text, fontSize: 15, fontWeight: 600, margin: 0, paddingLeft: "1ch" }}>Topics</h3>
                    <button onClick={() => openSubjectModal()} style={{ background: "transparent", border: "none", borderRadius: 8, color: t.textMuted, fontSize: 15, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>+ Topic</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)", gap: 18, alignItems: "stretch" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {topics.map((subject, index) => {
                        const stats = getSubjectProgress(subject);
                        return (
                          <button key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} style={{ display: "grid", gridTemplateColumns: "34px 1fr 72px 90px 42px", gap: 12, alignItems: "center", background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 0, padding: "14px 16px", cursor: "pointer", textAlign: "left" }}>
                            <span style={{ width: 22, height: 22, borderRadius: 999, border: `1px solid ${selectedSubject?.id === subject.id ? t.accent : t.borderAlt}`, background: selectedSubject?.id === subject.id ? t.accent : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", color: selectedSubject?.id === subject.id ? "#fff" : t.textMutedMore, fontSize: 13 }}>{index + 1}</span>
                            <span style={{ color: t.text, fontSize: 18, fontWeight: 500, fontFamily: "var(--sos-font-display)" }}>{subject.name}</span>
                            <span style={{ color: t.textMutedMore, fontSize: 11, textAlign: "right" }}>{stats.done} / {stats.total} tasks</span>
                            <span style={{ height: 6, background: t.hover, borderRadius: 999 }}><span style={{ display: "block", width: `${stats.progress}%`, height: "100%", background: t.accent, borderRadius: 999 }} /></span>
                            <span style={{ color: t.textMutedMore, fontSize: 13, fontFamily: "var(--sos-font-display)", fontWeight: 500 }}>{stats.progress}%</span>
                          </button>
                        );
                      })}
                    </div>

                    <aside style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 16, background: t.card, boxShadow: t.cardShadow }}>
                  {!selectedSubject && <div style={{ color: t.textMutedMore, fontSize: 13 }}>Select a topic to manage its tasks.</div>}
                  {selectedSubject && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                        <div>
                          <h3 style={{ color: t.text, fontSize: 22, fontWeight: 600, margin: 0 }}>{selectedSubject.name}</h3>
                          <p style={{ color: t.textMutedMore, fontSize: 12, lineHeight: 1.5, margin: "8px 0 0" }}>{selectedSubject.description || "No description yet."}</p>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => openSubjectModal(selectedSubject)} style={{ background: "none", border: "none", color: t.textMutedMost, cursor: "pointer" }}><Icon.settings /></button>
                          <button onClick={() => deleteSubject(selectedSubject.id)} style={{ background: "none", border: "none", color: t.textMutedMost, cursor: "pointer" }}><Icon.x /></button>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: t.textMutedMore, marginBottom: 6 }}><span style={{ fontSize: 13 }}>Progress</span><span style={{ fontSize: 11 }}>{subjectStats.done} / {subjectStats.total} tasks</span></div>
                      <div style={{ height: 8, background: t.hover, borderRadius: 999, marginBottom: 14 }}><div style={{ width: `${subjectStats.progress}%`, height: "100%", background: t.accent, borderRadius: 999 }} /></div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
                        <h4 style={{ color: t.text, fontSize: 15, fontWeight: 600, margin: 0 }}>Tasks</h4>
                        <button onClick={() => openSubtaskModal()} style={{ ...s.ghost, fontSize: 12, padding: "7px 10px" }}>+ Task</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(selectedSubject.subtasks || []).map((subtask) => (
                          <div key={subtask.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 8, alignItems: "center", padding: "8px 0" }}>
                            <input type="checkbox" checked={Boolean(subtask.done)} onChange={() => toggleSubtask(subtask)} style={{ width: "1em", height: "1em", margin: 0 }} />
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: "block", color: subtask.done ? t.textMutedMore : t.text, fontSize: 15, textDecoration: subtask.done ? "line-through" : "none" }}>{subtask.text || subtask.name}</span>
                            </span>
                            <button onClick={() => openSubtaskModal(subtask)} style={{ background: "none", border: "none", color: t.textMutedMost, cursor: "pointer" }}><Icon.settings /></button>
                            <button onClick={() => deleteSubtask(subtask.id)} style={{ background: "none", border: "none", color: t.textMutedMost, cursor: "pointer" }}><Icon.x /></button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                    </aside>
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>

      {planModal && (
        <Modal onClose={() => setPlanModal(false)} title={planForm.id ? "Update Study Plan" : "New Study Plan"} t={t}>
          <label style={s.label}>Study Plan name</label>
          <input value={planForm.name} onChange={(event) => setPlanForm((form) => ({ ...form, name: event.target.value }))} placeholder="Final Exams Preparation" style={s.input} autoFocus />
          <label style={s.label}>Existing study block</label>
          <select value={planForm.scheduleBlockId} onChange={(event) => setPlanForm((form) => ({ ...form, scheduleBlockId: event.target.value }))} style={s.input}>
            <option value="">No linked block</option>
            {studyBlocks.map((block) => <option key={block.id} value={block.id}>{tr(`days.${block.day}`)} - {block.title}</option>)}
          </select>
          {!planForm.scheduleBlockId && (
            <>
              <label style={s.label}>Optional day</label>
              <select value={planForm.day} onChange={(event) => setPlanForm((form) => ({ ...form, day: event.target.value }))} style={s.input}>
                <option value="">No scheduled day</option>
                {DAY_LABELS.map((day) => <option key={day} value={day}>{tr(`days.${day}`)}</option>)}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 96px", gap: 8 }}>
                <input value={planForm.startTime} onChange={(event) => setPlanForm((form) => ({ ...form, startTime: event.target.value }))} placeholder="09:00" style={s.input} />
                <select value={planForm.startPeriod} onChange={(event) => setPlanForm((form) => ({ ...form, startPeriod: event.target.value }))} style={s.input}><option>AM</option><option>PM</option></select>
                <input value={planForm.endTime} onChange={(event) => setPlanForm((form) => ({ ...form, endTime: event.target.value }))} placeholder="10:00" style={s.input} />
                <select value={planForm.endPeriod} onChange={(event) => setPlanForm((form) => ({ ...form, endPeriod: event.target.value }))} style={s.input}><option>AM</option><option>PM</option></select>
              </div>
            </>
          )}
          <button onClick={savePlan} style={s.btn}>{planForm.id ? "Update" : "Create"}</button>
        </Modal>
      )}

      {subjectModal && (
        <Modal onClose={() => setSubjectModal(false)} title={subjectForm.id ? "Update Topic" : "New Topic"} t={t}>
          <form onSubmit={saveSubject}>
            <label style={s.label}>Topic name</label>
            <input value={subjectForm.name} onChange={(event) => setSubjectForm((form) => ({ ...form, name: event.target.value }))} placeholder="Calculus I" style={s.input} autoFocus />
            <label style={s.label}>Description</label>
            <textarea value={subjectForm.description} onChange={(event) => setSubjectForm((form) => ({ ...form, description: event.target.value }))} placeholder="Limits, derivatives, integrals..." rows={4} style={{ ...s.input, minHeight: 96, resize: "vertical" }} />
            <label style={s.label}>Tag</label>
            <input value={subjectForm.tag} onChange={(event) => setSubjectForm((form) => ({ ...form, tag: event.target.value }))} placeholder="math" style={s.input} />
            <button type="submit" style={s.btn}>{subjectForm.id ? "Update" : "Create"}</button>
          </form>
        </Modal>
      )}

      {subtaskModal && (
        <Modal onClose={() => setSubtaskModal(false)} title={subtaskForm.id ? "Update Task" : "New Task"} t={t}>
          <form onSubmit={saveSubtask}>
            <label style={s.label}>Task name</label>
            <input value={subtaskForm.name} onChange={(event) => setSubtaskForm((form) => ({ ...form, name: event.target.value }))} placeholder="Practice derivatives" style={s.input} autoFocus />
            <button type="submit" style={s.btn}>{subtaskForm.id ? "Update" : "Create"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
