import { useEffect, useRef, useState } from "react";
import { PRESETS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal, PageHdr, SecHdr } from "./ui.jsx";

export default function FocusTime({ tasks, setTasks, t }) {
  const s = getStyles(t);
  const [total, setTotal] = useState(25 * 60);
  const [rem, setRem] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [selTask, setSelTask] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [newModal, setNewModal] = useState(false);
  const [saveModal, setSaveModal] = useState(null);
  const [newText, setNewText] = useState("");
  const intRef = useRef(null);

  useEffect(() => {
    if (running) {
      intRef.current = setInterval(() => {
        setRem((r) => {
          if (r <= 1) {
            clearInterval(intRef.current);
            setRunning(false);
            setSessions((ses) => [...ses, { task: selTask?.text ?? "-", mins: Math.floor(total / 60), at: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) }]);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      clearInterval(intRef.current);
    }
    return () => clearInterval(intRef.current);
  }, [running, selTask, total]);

  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        setRunning((r) => !r);
      }
      if (e.key === "r" || e.key === "R") {
        setRunning(false);
        setRem(total);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  function pickPreset(sec) {
    setRunning(false);
    setTotal(sec);
    setRem(sec);
  }

  function reset() {
    setRunning(false);
    setRem(total);
  }

  function logSession() {
    const elapsed = total - rem;
    if (elapsed < 1) return;
    setSessions((ses) => [...ses, { task: selTask?.text ?? "-", mins: Math.round(elapsed / 60), at: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) }]);
    reset();
  }

  function submitNewTask() {
    if (!newText.trim()) return;
    setNewModal(false);
    setSaveModal({ text: newText.trim().toLowerCase() });
    setNewText("");
  }

  function handleSaveChoice(choice) {
    const task = { id: Date.now(), text: saveModal.text, done: false };
    setSaveModal(null);
    if (choice === "save") setTasks((items) => [...items, task]);
    setSelTask(task);
  }

  const pct = total > 0 ? ((total - rem) / total) * 100 : 0;
  const mm = String(Math.floor(rem / 60)).padStart(2, "0");
  const ss = String(rem % 60).padStart(2, "0");
  const r = 88;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div>
      <PageHdr label="Focus" description="Pick one task, set a timer, and log the session when you are done." t={t} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={s.card}>
            <div style={{ fontSize: 15, color: t.text, marginBottom: 12, fontWeight: 750 }}>Choose a duration</div>
            <div style={{ display: "flex", gap: 8 }}>
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => pickPreset(p.s)} style={{ ...(total === p.s ? s.btn : s.ghost), flex: 1, textAlign: "center" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...s.card, display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 20px" }}>
            <svg width="220" height="220" viewBox="0 0 220 220">
              <circle cx="110" cy="110" r={r} fill="none" stroke={t.borderLight} strokeWidth="8" />
              <circle cx="110" cy="110" r={r} fill="none" stroke={t.accent} strokeWidth="8" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 110 110)" style={{ transition: running ? "stroke-dashoffset 1s linear" : "none" }} />
              <text x="110" y="98" textAnchor="middle" fill={t.text} fontSize="38" fontFamily="Inter, SF Pro Text, Segoe UI, system-ui, sans-serif" fontWeight="400">{mm}:{ss}</text>
              <text x="110" y="122" textAnchor="middle" fill={t.textMutedMore} fontSize="11" fontFamily="Inter, SF Pro Text, Segoe UI, system-ui, sans-serif">{running ? "Focusing" : rem === total ? "Ready" : rem === 0 ? "Done" : "Paused"}</text>
              {selTask && <text x="110" y="146" textAnchor="middle" fill={t.accent} fontSize="10" fontFamily="Inter, SF Pro Text, Segoe UI, system-ui, sans-serif">{selTask.text.length > 24 ? `${selTask.text.slice(0, 24)}...` : selTask.text}</text>}
            </svg>

            <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
              <button onClick={reset} title="Reset timer" style={{ ...s.ghost, display: "flex", alignItems: "center", gap: 6 }}><Icon.reset /> Reset</button>
              <button onClick={() => setRunning((isRunning) => !isRunning)} title="Start or pause timer" style={{ ...s.btn, padding: "10px 30px", display: "flex", alignItems: "center", gap: 8 }}>
                {running ? <><Icon.pause /> Pause</> : <><Icon.play /> Start</>}
              </button>
              <button onClick={logSession} title="Log current session" style={{ ...s.ghost, display: "flex", alignItems: "center", gap: 6 }}><Icon.log /> Log</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={s.card}>
            <SecHdr icon={<Icon.zap />} label="Focus Task" t={t} />
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {tasks.map((task) => (
                <button key={task.id} onClick={() => { if (!task.done) setSelTask(task); }} style={{ display: "flex", alignItems: "center", gap: 10, background: selTask?.id === task.id ? t.hover : "none", border: `1px solid ${selTask?.id === task.id ? t.accent : t.border}`, borderRadius: 4, cursor: task.done ? "not-allowed" : "pointer", padding: "8px 10px", textAlign: "left", color: task.done ? t.textMutedMost : selTask?.id === task.id ? t.text : t.textMuted, fontSize: 12, textDecoration: task.done ? "line-through" : "none", transition: "all 0.12s", fontFamily: "inherit" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: selTask?.id === task.id ? t.accent : t.borderLight, flexShrink: 0 }} />
                  {task.text}
                </button>
              ))}
            </div>
            <button onClick={() => { setNewText(""); setNewModal(true); }} style={{ ...s.ghost, width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon.zap /> New task</button>
          </div>

          <div style={{ ...s.card, flex: 1 }}>
            <SecHdr icon={<Icon.clock />} label="Session History" t={t} />
            {sessions.length === 0 ? (
              <div style={{ marginTop: 12, fontSize: 13, color: t.textMutedMore }}>No sessions logged yet</div>
            ) : (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                {[...sessions].reverse().map((ses, i) => (
                  <div key={`${ses.at}-${i}`} style={{ padding: "7px 10px", background: t.hover, border: `1px solid ${t.border}`, borderRadius: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span style={{ fontSize: 11, color: t.text }}>{ses.task}</span><span style={{ fontSize: 10, color: t.textMutedMore }}>{ses.at}</span></div>
                    <span style={{ fontSize: 10, color: t.accent }}>{ses.mins}m logged</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {newModal && (
        <Modal onClose={() => setNewModal(false)} title="New focus task" t={t}>
          <label style={s.label}>What are you working on?</label>
          <input value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitNewTask()} placeholder="e.g. review chapter 4 notes" style={s.input} autoFocus />
          <button onClick={submitNewTask} style={s.btn}>Continue</button>
        </Modal>
      )}

      {saveModal && (
        <Modal onClose={() => setSaveModal(null)} title="Save this task?" t={t}>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 4 }}>Task created</div>
          <div style={{ fontSize: 13, color: t.text, background: t.hover, border: `1px solid ${t.cardBorder}`, borderRadius: 4, padding: "8px 12px", marginBottom: 16 }}>"{saveModal.text}"</div>
          <div style={{ fontSize: 13, color: t.textMutedMore, marginBottom: 20, lineHeight: 1.6 }}>Use it only for this focus session, or save it to your task list.</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => handleSaveChoice("here")} style={{ ...s.ghost, flex: 1, textAlign: "center" }}>Only here</button>
            <button onClick={() => handleSaveChoice("save")} style={{ ...s.btn, flex: 1, textAlign: "center" }}>Save task</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
