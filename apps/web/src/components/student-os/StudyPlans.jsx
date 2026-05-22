import { useState } from "react";
import { Icon } from "./icons.jsx";
import { getStyles, Modal, PageHdr } from "./ui.jsx";

export default function StudyPlans({ subjects, setSubjects, t }) {
  const s = getStyles(t);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", difficulty: "hard", importance: 3, difficultyDots: 3, hoursPerWeek: 4 });

  function add() {
    if (!form.name) return;
    setSubjects((subj) => [...subj, { ...form, id: Date.now(), progress: 0 }]);
    setModal(false);
    setForm({ name: "", difficulty: "hard", importance: 3, difficultyDots: 3, hoursPerWeek: 4 });
  }

  function Dots({ n, max = 5 }) {
    return <div style={{ display: "flex", gap: 3 }}>{Array.from({ length: max }).map((_, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < n ? t.accent : t.borderAlt }} />)}</div>;
  }

  return (
    <div>
      <PageHdr label="study plans" action={{ label: "+ add subject", onClick: () => setModal(true) }} t={t} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        {subjects.map((subj) => (
          <div key={subj.id} style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, background: t.hover, border: `1px solid ${t.borderAlt}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.book /></div>
                <div>
                  <div style={{ fontSize: 13, color: t.text }}>{subj.name}</div>
                  <div style={{ fontSize: 11, color: t.textMutedMore }}>{subj.difficulty}</div>
                </div>
              </div>
              <button onClick={() => setSubjects((subjs) => subjs.filter((x) => x.id !== subj.id))} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost }}><Icon.x /></button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.textMutedMore, marginBottom: 4 }}><span>progress</span><span style={{ color: t.accent }}>{subj.progress}%</span></div>
            <div style={{ height: 4, background: t.hover, borderRadius: 2, marginBottom: 16 }}>
              <div style={{ height: "100%", width: `${subj.progress}%`, background: t.accent, borderRadius: 2 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div><div style={{ fontSize: 10, color: t.textMutedMore, marginBottom: 4 }}>importance</div><Dots n={subj.importance} /></div>
              <div><div style={{ fontSize: 10, color: t.textMutedMore, marginBottom: 4 }}>difficulty</div><Dots n={subj.difficultyDots} /></div>
              <div><div style={{ fontSize: 10, color: t.textMutedMore, marginBottom: 4 }}>hrs/week</div><div style={{ display: "flex", alignItems: "center", gap: 4, color: t.accent, fontSize: 12 }}><Icon.clock /> {subj.hoursPerWeek}h</div></div>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal onClose={() => setModal(false)} title="add subject" t={t}>
          <label style={s.label}>name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="subject name" style={s.input} autoFocus />
          <label style={s.label}>difficulty</label>
          <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} style={s.input}>
            {["easy", "medium", "hard", "very hard"].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label style={s.label}>hours / week</label>
          <input type="number" value={form.hoursPerWeek} onChange={(e) => setForm((f) => ({ ...f, hoursPerWeek: +e.target.value }))} min="1" max="40" style={s.input} />
          <button onClick={add} style={s.btn}>add subject</button>
        </Modal>
      )}
    </div>
  );
}
