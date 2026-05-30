import { useState } from "react";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal, PageHdr } from "./ui.jsx";
import { postPlanSubject } from "../../fetchs/studyPlanFetchs";

function getStudyBlocks(schedule) {
  return DAY_LABELS.flatMap((day) =>
    (schedule?.[day] || [])
      .filter((event) => event.tag === "study block")
      .map((event) => ({ ...event, day }))
  );
}

export default function StudyPlans({ subjects, setSubjects, schedule, setSchedule, t }) {
  const s = getStyles(t);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", scheduleBlockId: "", subtasks: [{ id: 1, name: "", description: "" }] });
  const [drafts, setDrafts] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const studyBlocks = getStudyBlocks(schedule);

  function linkBlockToSubject(subjectId, blockId) {
    setSubjects((items) => items.map((item) => (item.id === subjectId ? { ...item, scheduleBlockId: blockId } : item)));
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

  async function add() {
    if (!form.name.trim() || isAdding) return;
    const id = crypto.randomUUID();
    const subtasks = form.subtasks
      .map((subtask) => ({ name: subtask.name.trim(), description: subtask.description.trim() }))
      .filter((subtask) => subtask.name)
      .map((subtask) => ({ id: crypto.randomUUID(), text: subtask.name.toLowerCase(), description: subtask.description || "", done: false }));

    const subject = { id, name: form.name.trim().toLowerCase(), progress: 0, importance: 3, scheduleBlockId: form.scheduleBlockId, subtasks };
    setIsAdding(true);

    try {
      await postPlanSubject(subject);
      setSubjects((items) => [...items, subject]);
      if (form.scheduleBlockId) linkBlockToSubject(id, form.scheduleBlockId);
      setModal(false);
      setForm({ name: "", scheduleBlockId: "", subtasks: [{ id: 1, name: "", description: "" }] });
    } catch (error) {
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  }

  function addSubtask(subjectId, text) {
    const cleanText = text.trim();
    if (!cleanText) return;
    setSubjects((items) =>
      items.map((item) =>
        item.id === subjectId
          ? { ...item, subtasks: [...(item.subtasks || []), { id: Date.now(), text: cleanText.toLowerCase(), done: false }] }
          : item
      )
    );
  }

  function toggleSubtask(subjectId, subtaskId) {
    setSubjects((items) =>
      items.map((item) =>
        item.id === subjectId
          ? { ...item, subtasks: (item.subtasks || []).map((subtask) => (subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask)) }
          : item
      )
    );
  }

  function removeSubtask(subjectId, subtaskId) {
    setSubjects((items) => items.map((item) => (item.id === subjectId ? { ...item, subtasks: (item.subtasks || []).filter((subtask) => subtask.id !== subtaskId) } : item)));
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

  return (
    <div>
      <PageHdr label="Study Plan" description="Plan subjects, subtasks, and optional schedule blocks." action={{ label: "Add subject", onClick: () => setModal(true) }} t={t} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        {subjects.map((subj) => {
          const draft = drafts[subj.id] || "";
          const setDraft = (value) => setDrafts((items) => ({ ...items, [subj.id]: value }));
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
                    <div style={{ fontSize: 12, color: t.textMutedMore, marginTop: 2 }}>{linkedBlockLabel(subj.scheduleBlockId)}</div>
                  </div>
                </div>
                <button onClick={() => setSubjects((subjs) => subjs.filter((x) => x.id !== subj.id))} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost }}><Icon.x /></button>
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
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { addSubtask(subj.id, draft); setDraft(""); } }} placeholder="new subtask" style={{ ...s.input, marginBottom: 0 }} />
                <button onClick={() => { addSubtask(subj.id, draft); setDraft(""); }} style={s.ghost}>Add</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal onClose={() => setModal(false)} title="Add subject" t={t}>
          <label style={s.label}>Subject name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="subject name" style={s.input} autoFocus />
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
                  placeholder="description optional"
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
    </div>
  );
}
