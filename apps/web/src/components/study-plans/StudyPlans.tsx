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
  t: Theme;
};

function getStudyBlocks(schedule: Record<string, LooseRecord[]>) {
  return DAY_LABELS.flatMap((day) =>
    (schedule?.[day] || [])
      .filter((event) => event.tag === "study block")
      .map((event) => ({ ...event, day }))
  );
}

const emptyChanges = {
  createSubjects: [],
  updateSubjects: [],
  createSubtasks: [],
  updateSubtasks: [],
  deleteSubtasks: [],
  deleteSubjects: [],
};

const emptySubtaskDraft = { name: "", description: "" };

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeSubtask(subtask: LooseRecord) {
  const name = normalizeText(subtask.name || subtask.text);

  return {
    id: subtask.id,
    name,
    text: name,
    description: String(subtask.description || "").trim(),
    done: Boolean(subtask.done),
  };
}

function toSubjectUpdate(subject: LooseRecord) {
  return {
    id: subject.id,
    name: normalizeText(subject.name),
    tag: normalizeText(subject.tag),
    scheduleBlockId: subject.scheduleBlockId || "",
  };
}

export default function StudyPlans({ subjects, setSubjects, schedule, setSchedule, createAction, onCreateActionHandled, t }: StudyPlansProps) {
  const { t: tr } = useTranslation();
  const s = getStyles(t);
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", tag: "", scheduleBlockId: "", subtasks: [{ id: 1, name: "", description: "" }] });
  const [editForm, setEditForm] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(emptyChanges);
  const studyBlocks = getStudyBlocks(schedule);

  useEffect(() => {
    if (!createAction) return;

    if (createAction.type === "subject") setModal(true);
    onCreateActionHandled?.();
  }, [createAction?.id]);

  function markChanged() {
    setHasChanges(true);
    setSaveMessage("");
  }

  function queueSubjectUpdate(subject: LooseRecord) {
    setPendingChanges((current) => {
      if (current.deleteSubjects.includes(subject.id)) return current;

      const createSubject = current.createSubjects.find((item) => item.id === subject.id);
      if (createSubject) {
        return {
          ...current,
          createSubjects: current.createSubjects.map((item) => (item.id === subject.id ? { ...item, ...subject } : item)),
        };
      }

      return {
        ...current,
        updateSubjects: [...current.updateSubjects.filter((item) => item.id !== subject.id), toSubjectUpdate(subject)],
      };
    });
  }

  function syncLinkedSchedule(subjectId: string, blockId: string) {
    setSchedule((days) =>
      Object.fromEntries(
        Object.entries(days).map(([day, events]) => [
          day,
          events.map((event) => {
            if (event.studyPlanId === subjectId && event.id !== blockId) return { ...event, studyPlanId: "" };
            if (event.id === blockId) return { ...event, studyPlanId: subjectId };
            return event;
          }),
        ])
      )
    );
  }

  function linkBlockToSubject(subjectId: string, blockId: string) {
    const subject = subjects.find((item) => item.id === subjectId);

    setSubjects((items) =>
      items.map((item) => (item.id === subjectId ? { ...item, scheduleBlockId: blockId } : item))
    );
    syncLinkedSchedule(subjectId, blockId);
    if (subject) queueSubjectUpdate({ ...subject, scheduleBlockId: blockId });
    markChanged();
  }

  function add() {
    if (!form.name.trim() || isAdding) return;
    setIsAdding(true);

    const id = crypto.randomUUID();
    const subtasks = form.subtasks
      .map((subtask) => ({ name: subtask.name.trim(), description: subtask.description.trim() }))
      .filter((subtask) => subtask.name)
      .map((subtask) => normalizeSubtask({ id: crypto.randomUUID(), name: subtask.name, description: subtask.description }));

    const subject = {
      id,
      name: normalizeText(form.name),
      tag: normalizeText(form.tag),
      progress: 0,
      importance: 3,
      scheduleBlockId: form.scheduleBlockId,
      subtasks,
    };

    setSubjects((items) => [...items, subject]);
    setPendingChanges((current) => ({ ...current, createSubjects: [...current.createSubjects, subject] }));
    if (form.scheduleBlockId) linkBlockToSubject(id, form.scheduleBlockId);
    markChanged();
    setModal(false);
    setForm({ name: "", tag: "", scheduleBlockId: "", subtasks: [{ id: 1, name: "", description: "" }] });
    setIsAdding(false);
  }

  function addSubtask(subjectId: string, draft: LooseRecord) {
    const cleanName = draft.name.trim();
    if (!cleanName) return false;

    const subtask = normalizeSubtask({
      id: crypto.randomUUID(),
      name: cleanName,
      description: draft.description,
    });

    setSubjects((items) =>
      items.map((item) =>
        item.id === subjectId
          ? { ...item, subtasks: [...(item.subtasks || []), subtask] }
          : item
      )
    );
    setPendingChanges((current) => {
      const createSubject = current.createSubjects.find((item) => item.id === subjectId);
      if (createSubject) {
        return {
          ...current,
          createSubjects: current.createSubjects.map((item) =>
            item.id === subjectId ? { ...item, subtasks: [...(item.subtasks || []), subtask] } : item
          ),
        };
      }

      return {
        ...current,
        createSubtasks: [...current.createSubtasks, { subjectId, subtask }],
      };
    });
    markChanged();
    return true;
  }

  function toggleSubtask(subjectId: string, subtaskId: string) {
    const subject = subjects.find((item) => item.id === subjectId);
    const subtask = subject?.subtasks?.find((item) => item.id === subtaskId);
    if (!subtask) return;

    const updatedSubtask = normalizeSubtask({ ...subtask, done: !subtask.done });

    setSubjects((items) =>
      items.map((item) =>
        item.id === subjectId
          ? { ...item, subtasks: (item.subtasks || []).map((task) => (task.id === subtaskId ? updatedSubtask : task)) }
          : item
      )
    );
    setPendingChanges((current) => {
      const createSubject = current.createSubjects.find((item) => item.id === subjectId);
      if (createSubject) {
        return {
          ...current,
          createSubjects: current.createSubjects.map((item) =>
            item.id === subjectId
              ? { ...item, subtasks: (item.subtasks || []).map((task) => (task.id === subtaskId ? updatedSubtask : task)) }
              : item
          ),
        };
      }

      if (current.createSubtasks.some((item) => item.subtask.id === subtaskId)) {
        return {
          ...current,
          createSubtasks: current.createSubtasks.map((item) => (item.subtask.id === subtaskId ? { ...item, subtask: updatedSubtask } : item)),
        };
      }

      return {
        ...current,
        updateSubtasks: [...current.updateSubtasks.filter((item) => item.id !== subtaskId), updatedSubtask],
      };
    });
    markChanged();
  }

  function removeSubtask(subjectId: string, subtaskId: string) {
    setSubjects((items) => items.map((item) => (item.id === subjectId ? { ...item, subtasks: (item.subtasks || []).filter((subtask) => subtask.id !== subtaskId) } : item)));
    setPendingChanges((current) => {
      const createSubject = current.createSubjects.find((item) => item.id === subjectId);
      if (createSubject) {
        return {
          ...current,
          createSubjects: current.createSubjects.map((item) =>
            item.id === subjectId ? { ...item, subtasks: (item.subtasks || []).filter((subtask) => subtask.id !== subtaskId) } : item
          ),
        };
      }

      const wasNew = current.createSubtasks.some((item) => item.subtask.id === subtaskId);
      return {
        ...current,
        createSubtasks: current.createSubtasks.filter((item) => item.subtask.id !== subtaskId),
        updateSubtasks: current.updateSubtasks.filter((item) => item.id !== subtaskId),
        deleteSubtasks: wasNew ? current.deleteSubtasks : [...current.deleteSubtasks.filter((id) => id !== subtaskId), subtaskId],
      };
    });
    markChanged();
  }

  function deleteSubject(subjectId: string) {
    setSubjects((items) => items.filter((item) => item.id !== subjectId));
    setPendingChanges((current) => {
      const wasNew = current.createSubjects.some((item) => item.id === subjectId);

      return {
        createSubjects: current.createSubjects.filter((item) => item.id !== subjectId),
        updateSubjects: current.updateSubjects.filter((item) => item.id !== subjectId),
        createSubtasks: current.createSubtasks.filter((item) => item.subjectId !== subjectId),
        updateSubtasks: current.updateSubtasks,
        deleteSubtasks: current.deleteSubtasks,
        deleteSubjects: wasNew ? current.deleteSubjects : [...current.deleteSubjects.filter((id) => id !== subjectId), subjectId],
      };
    });
    markChanged();
  }

  function linkedBlockLabel(blockId: string) {
    const block = studyBlocks.find((item) => item.id === blockId);
    if (!block) return tr("studyPlans.noScheduleBlockLinked");
    return `${block.title} - ${tr(`days.${block.day}`)}, ${block.start_time || ""} ${block.start_period || ""}`;
  }

  function updateFormSubtask(id: number, field: string, value: string) {
    setForm((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask) => (subtask.id === id ? { ...subtask, [field]: value } : subtask)),
    }));
  }

  function addFormSubtask() {
    setForm((current) => ({
      ...current,
      subtasks: [...current.subtasks, { id: Date.now(), name: "", description: "" }],
    }));
  }

  function removeFormSubtask(id: number) {
    setForm((current) => ({
      ...current,
      subtasks: current.subtasks.length === 1 ? current.subtasks : current.subtasks.filter((subtask) => subtask.id !== id),
    }));
  }

  function startEdit(subject: LooseRecord) {
    setEditForm({
      id: subject.id,
      name: subject.name || "",
      tag: subject.tag || "",
      scheduleBlockId: subject.scheduleBlockId || "",
      subtasks: (subject.subtasks || []).map((subtask) => normalizeSubtask(subtask)),
    });
  }

  function updateEditSubtask(id: string, field: string, value: string) {
    setEditForm((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask) => (subtask.id === id ? { ...subtask, [field]: value } : subtask)),
    }));
  }

  function updateSubject(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!editForm?.name.trim()) return;
    const updatedSubject = toSubjectUpdate(editForm);

    setSubjects((items) => items.map((item) => (item.id === editForm.id ? { ...item, ...updatedSubject } : item)));
    syncLinkedSchedule(editForm.id, updatedSubject.scheduleBlockId);
    queueSubjectUpdate(updatedSubject);
    markChanged();
    setEditForm((current) => ({ ...current, ...updatedSubject }));
  }

  function updateSubtask(subjectId: string, subtask: LooseRecord) {
    if (!subtask.name.trim()) return;
    const updatedSubtask = normalizeSubtask(subtask);

    setEditForm((current) => ({
      ...current,
      subtasks: current.subtasks.map((item) => (item.id === subtask.id ? { ...item, ...updatedSubtask } : item)),
    }));
    setSubjects((items) =>
      items.map((item) =>
        item.id === subjectId
          ? { ...item, subtasks: (item.subtasks || []).map((task) => (task.id === subtask.id ? { ...task, ...updatedSubtask } : task)) }
          : item
      )
    );
    setPendingChanges((current) => {
      const createSubject = current.createSubjects.find((item) => item.id === subjectId);
      if (createSubject) {
        return {
          ...current,
          createSubjects: current.createSubjects.map((item) =>
            item.id === subjectId
              ? { ...item, subtasks: (item.subtasks || []).map((task) => (task.id === subtask.id ? { ...task, ...updatedSubtask } : task)) }
              : item
          ),
        };
      }

      if (current.createSubtasks.some((item) => item.subtask.id === subtask.id)) {
        return {
          ...current,
          createSubtasks: current.createSubtasks.map((item) => (item.subtask.id === subtask.id ? { ...item, subtask: updatedSubtask } : item)),
        };
      }

      return {
        ...current,
        updateSubtasks: [...current.updateSubtasks.filter((item) => item.id !== subtask.id), updatedSubtask],
      };
    });
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
          <h1 style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 750, color: t.text, margin: 0 }}>{tr("studyPlans.title")}</h1>
          <div style={{ fontSize: 14, color: t.textMutedMore, marginTop: 6 }}>{tr("studyPlans.description")}</div>
          {saveMessage && <div style={{ fontSize: 12, color: saveMessage === "saved" ? t.accent : t.textMutedMore, marginTop: 8 }}>{tr(saveMessage === "saved" ? "common.saved" : "common.couldNotSave")}</div>}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={saveChanges}
            disabled={!hasChanges || saving}
            style={{ ...s.btn, opacity: !hasChanges || saving ? 0.55 : 1, cursor: !hasChanges || saving ? "not-allowed" : "pointer" }}
          >
            {saving ? tr("common.saving") : tr("common.save")}
          </button>
          <button onClick={() => setModal(true)} style={s.btn}>{tr("studyPlans.addSubject")}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        {subjects.map((subj) => {
          const draft = drafts[subj.id] || emptySubtaskDraft;
          const setDraft = (value) => setDrafts((items) => ({ ...items, [subj.id]: { ...emptySubtaskDraft, ...items[subj.id], ...value } }));
          const completed = (subj.subtasks || []).filter((task) => task.done).length;
          const total = (subj.subtasks || []).length;
          const progress = total ? Math.round((completed / total) * 100) : subj.progress || 0;

          return (
            <div key={subj.id} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, background: t.hover, border: `1px solid ${t.borderAlt}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: t.accent }}><Icon.book /></div>
                  <div>
                    <div style={{ fontSize: 15, color: t.text, fontWeight: 750 }}>{subj.name}</div>
                    {subj.tag && <div style={{ fontSize: 11, color: t.accent, marginTop: 2 }}>{subj.tag}</div>}
                    <div style={{ fontSize: 12, color: t.textMutedMore, marginTop: 2 }}>{linkedBlockLabel(subj.scheduleBlockId)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(subj)} title={tr("studyPlans.updateSubject")} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost }}><Icon.settings /></button>
                  <button onClick={() => deleteSubject(subj.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost }}><Icon.x /></button>
                </div>
              </div>

              <label style={s.label}>{tr("studyPlans.scheduleBlock")}</label>
              <select value={subj.scheduleBlockId || ""} onChange={(e) => linkBlockToSubject(subj.id, e.target.value)} style={s.input}>
                <option value="">{tr("studyPlans.noLinkedBlock")}</option>
                {studyBlocks.map((block) => <option key={block.id} value={block.id}>{tr(`days.${block.day}`)} - {block.title}</option>)}
              </select>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textMutedMore, marginBottom: 6 }}><span>{tr("studyPlans.subtasks")}</span><span style={{ color: t.accent, fontWeight: 700 }}>{completed}/{total}</span></div>
              <div style={{ height: 8, background: t.hover, borderRadius: 999, marginBottom: 14 }}>
                <div style={{ height: "100%", width: `${progress}%`, background: t.accent, borderRadius: 999 }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {(subj.subtasks || []).map((subtask) => (
                  <div key={subtask.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 8, padding: "8px 10px", background: t.hover, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                    <input type="checkbox" checked={subtask.done} onChange={() => toggleSubtask(subj.id, subtask.id)} />
                    <span>
                      <span style={{ display: "block", fontSize: 12, color: subtask.done ? t.textMutedMore : t.text, textDecoration: subtask.done ? "line-through" : "none" }}>{subtask.text}</span>
                      {subtask.description && <span style={{ display: "block", fontSize: 11, color: t.textMutedMore, marginTop: 2 }}>{subtask.description}</span>}
                    </span>
                    <button onClick={() => removeSubtask(subj.id, subtask.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost }}><Icon.x /></button>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && addSubtask(subj.id, draft)) setDraft(emptySubtaskDraft);
                  }}
                  placeholder={tr("studyPlans.newSubtask")}
                  style={{ ...s.input, marginBottom: 0 }}
                />
                <button onClick={() => { if (addSubtask(subj.id, draft)) setDraft(emptySubtaskDraft); }} style={s.ghost}>{tr("common.add")}</button>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ description: e.target.value })}
                  placeholder={tr("studyPlans.descriptionOptional")}
                  rows={2}
                  style={{ ...s.input, gridColumn: "1 / -1", marginBottom: 0, minHeight: 62, resize: "vertical", lineHeight: 1.4 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal onClose={() => setModal(false)} title={tr("studyPlans.addSubject")} t={t}>
          <label style={s.label}>{tr("studyPlans.subjectName")}</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={tr("studyPlans.subjectNamePlaceholder")} style={s.input} autoFocus />
          <label style={s.label}>{tr("studyPlans.tag")}</label>
          <input value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={tr("studyPlans.tagOptional")} style={s.input} />
          <label style={s.label}>{tr("studyPlans.scheduleBlock")}</label>
          <select value={form.scheduleBlockId} onChange={(e) => setForm((f) => ({ ...f, scheduleBlockId: e.target.value }))} style={s.input}>
            <option value="">{tr("studyPlans.noLinkedBlock")}</option>
            {studyBlocks.map((block) => <option key={block.id} value={block.id}>{tr(`days.${block.day}`)} - {block.title}</option>)}
          </select>
          <label style={s.label}>{tr("studyPlans.subtasks")}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {form.subtasks.map((subtask, index) => (
              <div key={subtask.id} style={{ background: t.hover, border: `1px solid ${t.border}`, borderRadius: 8, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "start" }}>
                  <input
                    value={subtask.name}
                    onChange={(e) => updateFormSubtask(subtask.id, "name", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && add()}
                    placeholder={tr("studyPlans.subtaskName", { count: index + 1 })}
                    style={{ ...s.input, marginBottom: 8 }}
                  />
                  <button onClick={() => removeFormSubtask(subtask.id)} style={{ ...s.ghost, padding: "10px 12px", opacity: form.subtasks.length === 1 ? 0.55 : 1 }}><Icon.x /></button>
                </div>
                <textarea
                  value={subtask.description}
                  onChange={(e) => updateFormSubtask(subtask.id, "description", e.target.value)}
                  placeholder={tr("studyPlans.descriptionOptional")}
                  rows={2}
                  style={{ ...s.input, marginBottom: 0, minHeight: 68, resize: "vertical", lineHeight: 1.4 }}
                />
              </div>
            ))}
          </div>
          <button onClick={addFormSubtask} style={{ ...s.ghost, width: "100%", marginBottom: 12 }}>{tr("studyPlans.addAnotherSubtask")}</button>
          <button onClick={add} disabled={isAdding} style={{ ...s.btn, opacity: isAdding ? 0.65 : 1 }}>{isAdding ? tr("studyPlans.adding") : tr("studyPlans.addSubject")}</button>
        </Modal>
      )}

      {editForm && (
        <Modal onClose={() => setEditForm(null)} title={tr("studyPlans.updateSubject")} t={t}>
          <form onSubmit={updateSubject}>
            <label style={s.label}>{tr("studyPlans.subjectName")}</label>
            <input name="name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder={tr("studyPlans.subjectNamePlaceholder")} style={s.input} autoFocus />
            <label style={s.label}>{tr("studyPlans.tag")}</label>
            <input name="tag" value={editForm.tag} onChange={(e) => setEditForm((f) => ({ ...f, tag: e.target.value }))} placeholder={tr("studyPlans.tagOptional")} style={s.input} />
            <label style={s.label}>{tr("studyPlans.scheduleBlock")}</label>
            <select name="scheduleBlockId" value={editForm.scheduleBlockId} onChange={(e) => setEditForm((f) => ({ ...f, scheduleBlockId: e.target.value }))} style={s.input}>
              <option value="">{tr("studyPlans.noLinkedBlock")}</option>
              {studyBlocks.map((block) => <option key={block.id} value={block.id}>{tr(`days.${block.day}`)} - {block.title}</option>)}
            </select>
            <button type="submit" style={{ ...s.btn, marginBottom: 14 }}>{tr("studyPlans.updateSubject")}</button>
          </form>

          <label style={s.label}>{tr("studyPlans.subtasks")}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {editForm.subtasks.map((subtask) => (
              <div key={subtask.id} style={{ background: t.hover, border: `1px solid ${t.border}`, borderRadius: 8, padding: 10 }}>
                <input
                  value={subtask.name}
                  onChange={(e) => updateEditSubtask(subtask.id, "name", e.target.value)}
                  placeholder={tr("studyPlans.newSubtask")}
                  style={{ ...s.input, marginBottom: 8 }}
                />
                <textarea
                  value={subtask.description}
                  onChange={(e) => updateEditSubtask(subtask.id, "description", e.target.value)}
                  placeholder={tr("studyPlans.descriptionOptionalNoParens")}
                  rows={2}
                  style={{ ...s.input, minHeight: 68, resize: "vertical", lineHeight: 1.4 }}
                />
                <button onClick={() => updateSubtask(editForm.id, subtask)} style={{ ...s.ghost, width: "100%" }}>
                  {tr("studyPlans.updateSubtask")}
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
