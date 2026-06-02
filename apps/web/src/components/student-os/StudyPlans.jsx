import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal } from "./ui.jsx";
import { saveStudyPlanChanges, studyPlanQueryKey } from "../../fetchs/studyPlanFetchs";

function getStudyBlocks(schedule) {
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSubtask(subtask) {
  const name = normalizeText(subtask.name || subtask.text);

  return {
    id: subtask.id,
    name,
    text: name,
    description: String(subtask.description || "").trim(),
    done: Boolean(subtask.done),
  };
}

function toSubjectUpdate(subject) {
  return {
    id: subject.id,
    name: normalizeText(subject.name),
    tag: normalizeText(subject.tag),
    scheduleBlockId: subject.scheduleBlockId || "",
  };
}

export default function StudyPlans({ subjects, setSubjects, schedule, setSchedule, createAction, onCreateActionHandled, t }) {
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

  function queueSubjectUpdate(subject) {
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

  function syncLinkedSchedule(subjectId, blockId) {
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

  function linkBlockToSubject(subjectId, blockId) {
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

  function addSubtask(subjectId, draft) {
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

  function toggleSubtask(subjectId, subtaskId) {
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

  function removeSubtask(subjectId, subtaskId) {
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

  function deleteSubject(subjectId) {
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

  function linkedBlockLabel(blockId) {
    const block = studyBlocks.find((item) => item.id === blockId);
    if (!block) return "No schedule block linked";
    return `${block.title} - ${block.day}, ${block.start_time || ""} ${block.start_period || ""}`;
  }

  function updateFormSubtask(id, field, value) {
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

  function removeFormSubtask(id) {
    setForm((current) => ({
      ...current,
      subtasks: current.subtasks.length === 1 ? current.subtasks : current.subtasks.filter((subtask) => subtask.id !== id),
    }));
  }

  function startEdit(subject) {
    setEditForm({
      id: subject.id,
      name: subject.name || "",
      tag: subject.tag || "",
      scheduleBlockId: subject.scheduleBlockId || "",
      subtasks: (subject.subtasks || []).map((subtask) => normalizeSubtask(subtask)),
    });
  }

  function updateEditSubtask(id, field, value) {
    setEditForm((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask) => (subtask.id === id ? { ...subtask, [field]: value } : subtask)),
    }));
  }

  function updateSubject(event) {
    event?.preventDefault();
    if (!editForm?.name.trim()) return;
    const updatedSubject = toSubjectUpdate(editForm);

    setSubjects((items) => items.map((item) => (item.id === editForm.id ? { ...item, ...updatedSubject } : item)));
    syncLinkedSchedule(editForm.id, updatedSubject.scheduleBlockId);
    queueSubjectUpdate(updatedSubject);
    markChanged();
    setEditForm((current) => ({ ...current, ...updatedSubject }));
  }

  function updateSubtask(subjectId, subtask) {
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
      setSaveMessage("Saved.");
      queryClient.invalidateQueries({ queryKey: studyPlanQueryKey });
    } catch (error) {
      console.error(error);
      setSaveMessage("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 750, color: t.text, margin: 0 }}>Study Plan</h1>
          <div style={{ fontSize: 14, color: t.textMutedMore, marginTop: 6 }}>Plan subjects, subtasks, and optional schedule blocks.</div>
          {saveMessage && <div style={{ fontSize: 12, color: saveMessage === "Saved." ? t.accent : t.textMutedMore, marginTop: 8 }}>{saveMessage}</div>}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={saveChanges}
            disabled={!hasChanges || saving}
            style={{ ...s.btn, opacity: !hasChanges || saving ? 0.55 : 1, cursor: !hasChanges || saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => setModal(true)} style={s.btn}>Add subject</button>
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
                  <button onClick={() => startEdit(subj)} title="Update subject" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost }}><Icon.settings /></button>
                  <button onClick={() => deleteSubject(subj.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost }}><Icon.x /></button>
                </div>
              </div>

              <label style={s.label}>Schedule block</label>
              <select value={subj.scheduleBlockId || ""} onChange={(e) => linkBlockToSubject(subj.id, e.target.value)} style={s.input}>
                <option value="">No linked block</option>
                {studyBlocks.map((block) => <option key={block.id} value={block.id}>{block.day} - {block.title}</option>)}
              </select>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.textMutedMore, marginBottom: 6 }}><span>Subtasks</span><span style={{ color: t.accent, fontWeight: 700 }}>{completed}/{total}</span></div>
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
                  placeholder="new subtask"
                  style={{ ...s.input, marginBottom: 0 }}
                />
                <button onClick={() => { if (addSubtask(subj.id, draft)) setDraft(emptySubtaskDraft); }} style={s.ghost}>Add</button>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ description: e.target.value })}
                  placeholder="description (optional)"
                  rows={2}
                  style={{ ...s.input, gridColumn: "1 / -1", marginBottom: 0, minHeight: 62, resize: "vertical", lineHeight: 1.4 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal onClose={() => setModal(false)} title="Add subject" t={t}>
          <label style={s.label}>Subject name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="subject name" style={s.input} autoFocus />
          <label style={s.label}>Tag</label>
          <input value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="tag (optional)" style={s.input} />
          <label style={s.label}>Schedule block</label>
          <select value={form.scheduleBlockId} onChange={(e) => setForm((f) => ({ ...f, scheduleBlockId: e.target.value }))} style={s.input}>
            <option value="">No linked block</option>
            {studyBlocks.map((block) => <option key={block.id} value={block.id}>{block.day} - {block.title}</option>)}
          </select>
          <label style={s.label}>Subtasks</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {form.subtasks.map((subtask, index) => (
              <div key={subtask.id} style={{ background: t.hover, border: `1px solid ${t.border}`, borderRadius: 8, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "start" }}>
                  <input
                    value={subtask.name}
                    onChange={(e) => updateFormSubtask(subtask.id, "name", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && add()}
                    placeholder={`subtask ${index + 1} name`}
                    style={{ ...s.input, marginBottom: 8 }}
                  />
                  <button onClick={() => removeFormSubtask(subtask.id)} style={{ ...s.ghost, padding: "10px 12px", opacity: form.subtasks.length === 1 ? 0.55 : 1 }}><Icon.x /></button>
                </div>
                <textarea
                  value={subtask.description}
                  onChange={(e) => updateFormSubtask(subtask.id, "description", e.target.value)}
                  placeholder="description (optional)"
                  rows={2}
                  style={{ ...s.input, marginBottom: 0, minHeight: 68, resize: "vertical", lineHeight: 1.4 }}
                />
              </div>
            ))}
          </div>
          <button onClick={addFormSubtask} style={{ ...s.ghost, width: "100%", marginBottom: 12 }}>Add another subtask</button>
          <button onClick={add} disabled={isAdding} style={{ ...s.btn, opacity: isAdding ? 0.65 : 1 }}>{isAdding ? "Adding..." : "Add subject"}</button>
        </Modal>
      )}

      {editForm && (
        <Modal onClose={() => setEditForm(null)} title="Update subject" t={t}>
          <form onSubmit={updateSubject}>
            <label style={s.label}>Subject name</label>
            <input name="name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="subject name" style={s.input} autoFocus />
            <label style={s.label}>Tag</label>
            <input name="tag" value={editForm.tag} onChange={(e) => setEditForm((f) => ({ ...f, tag: e.target.value }))} placeholder="tag (optional)" style={s.input} />
            <label style={s.label}>Schedule block</label>
            <select name="scheduleBlockId" value={editForm.scheduleBlockId} onChange={(e) => setEditForm((f) => ({ ...f, scheduleBlockId: e.target.value }))} style={s.input}>
              <option value="">No linked block</option>
              {studyBlocks.map((block) => <option key={block.id} value={block.id}>{block.day} - {block.title}</option>)}
            </select>
            <button type="submit" style={{ ...s.btn, marginBottom: 14 }}>Update subject</button>
          </form>

          <label style={s.label}>Subtasks</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {editForm.subtasks.map((subtask) => (
              <div key={subtask.id} style={{ background: t.hover, border: `1px solid ${t.border}`, borderRadius: 8, padding: 10 }}>
                <input
                  value={subtask.name}
                  onChange={(e) => updateEditSubtask(subtask.id, "name", e.target.value)}
                  placeholder="subtask name"
                  style={{ ...s.input, marginBottom: 8 }}
                />
                <textarea
                  value={subtask.description}
                  onChange={(e) => updateEditSubtask(subtask.id, "description", e.target.value)}
                  placeholder="description optional"
                  rows={2}
                  style={{ ...s.input, minHeight: 68, resize: "vertical", lineHeight: 1.4 }}
                />
                <button onClick={() => updateSubtask(editForm.id, subtask)} style={{ ...s.ghost, width: "100%" }}>
                  Update subtask
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
