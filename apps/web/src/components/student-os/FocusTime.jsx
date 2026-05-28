import { useEffect, useMemo, useRef, useState } from "react";
import { DAY_LABELS } from "./data.js";
import { Icon } from "./icons.jsx";
import { getStyles, Modal, PageHdr, SecHdr } from "./ui.jsx";

function getScheduleItems(schedule, tag) {
  return DAY_LABELS.flatMap((day) =>
    (schedule?.[day] || [])
      .filter((event) => event.tag === tag)
      .map((event) => ({
        id: `schedule-${tag}-${event.id}`,
        text: event.title,
        done: false,
        source: tag,
        meta: [day, event.start_time && `${event.start_time} ${event.start_period || ""}`].filter(Boolean).join(" - "),
      }))
  );
}

function clampMinutes(value, fallback) {
  return Math.min(Math.max(Number(value) || fallback, 1), 240);
}

export default function FocusTime({ tasks, setTasks, subjects = [], schedule, t }) {
  const s = getStyles(t);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [restMinutes, setRestMinutes] = useState(5);
  const [mode, setMode] = useState("pomodoro");
  const [total, setTotal] = useState(25 * 60);
  const [rem, setRem] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [selTask, setSelTask] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [taskModal, setTaskModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [momentTask, setMomentTask] = useState("");
  const [settingsForm, setSettingsForm] = useState({ pomodoro: 25, rest: 5 });
  const intRef = useRef(null);

  const studyBlocks = getScheduleItems(schedule, "study block");
  const scheduleTasks = getScheduleItems(schedule, "task");
  const studySubtasks = subjects.flatMap((subject) =>
    (subject.subtasks || []).map((subtask) => ({
      id: `study-${subject.id}-${subtask.id}`,
      text: `${subject.name}: ${subtask.text}`,
      done: subtask.done,
      source: "subtask",
      meta: subtask.description || "Study plan subtask",
    }))
  );

  const taskOptions = [
    { label: "Study blocks", items: studyBlocks },
    { label: "Tasks", items: [...scheduleTasks, ...tasks.map((task) => ({ ...task, id: `saved-${task.id}`, source: "task", meta: "Saved task" }))] },
    { label: "Subtasks", items: studySubtasks },
  ];

  const history = useMemo(() => {
    const totals = new Map();
    for (const session of sessions) {
      const current = totals.get(session.task) || { task: session.task, mins: 0, count: 0, lastAt: session.at };
      totals.set(session.task, { ...current, mins: current.mins + session.mins, count: current.count + 1, lastAt: session.at });
    }
    return [...totals.values()].reverse();
  }, [sessions]);

  function setTimerMode(nextMode) {
    const nextTotal = (nextMode === "pomodoro" ? pomodoroMinutes : restMinutes) * 60;
    setMode(nextMode);
    setRunning(false);
    setTotal(nextTotal);
    setRem(nextTotal);
  }

  function logMinutes(mins) {
    if (mins < 1 || mode !== "pomodoro") return;
    setSessions((items) => [
      ...items,
      {
        task: selTask?.text || "Untitled focus",
        mins,
        at: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  useEffect(() => {
    if (running) {
      intRef.current = setInterval(() => {
        setRem((remaining) => {
          if (remaining <= 1) {
            clearInterval(intRef.current);
            setRunning(false);
            if (mode === "pomodoro") {
              logMinutes(Math.round(total / 60));
              const nextTotal = restMinutes * 60;
              setMode("rest");
              setTotal(nextTotal);
              return nextTotal;
            }
            const nextTotal = pomodoroMinutes * 60;
            setMode("pomodoro");
            setTotal(nextTotal);
            return nextTotal;
          }
          return remaining - 1;
        });
      }, 1000);
    } else {
      clearInterval(intRef.current);
    }
    return () => clearInterval(intRef.current);
  }, [running, mode, total, restMinutes, pomodoroMinutes, selTask]);

  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        setRunning((value) => !value);
      }
      if (e.key === "r" || e.key === "R") reset();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  function reset() {
    setRunning(false);
    setRem(total);
  }

  function logSession() {
    const elapsed = Math.round((total - rem) / 60);
    logMinutes(elapsed);
    reset();
  }

  function selectTask(task) {
    if (task.done) return;
    setSelTask(task);
    setTaskModal(false);
  }

  function createMomentTask() {
    const text = momentTask.trim().toLowerCase();
    if (!text) return;
    setSelTask({ id: `moment-${Date.now()}`, text, done: false, source: "moment" });
    setMomentTask("");
    setTaskModal(false);
  }

  function saveSettings() {
    const nextPomodoro = clampMinutes(settingsForm.pomodoro, pomodoroMinutes);
    const nextRest = clampMinutes(settingsForm.rest, restMinutes);
    setPomodoroMinutes(nextPomodoro);
    setRestMinutes(nextRest);
    setSettingsForm({ pomodoro: nextPomodoro, rest: nextRest });
    setRunning(false);
    const nextTotal = (mode === "pomodoro" ? nextPomodoro : nextRest) * 60;
    setTotal(nextTotal);
    setRem(nextTotal);
    setSettingsModal(false);
  }

  const pct = total > 0 ? ((total - rem) / total) * 100 : 0;
  const mm = String(Math.floor(rem / 60)).padStart(2, "0");
  const ss = String(rem % 60).padStart(2, "0");
  const r = 96;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div>
      <PageHdr label="Focus" description="Pick one task, set a timer, and log the session when you are done." t={t} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)", gap: 16, alignItems: "stretch" }}>
        <div style={{ ...s.card, minHeight: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: "34px 20px" }}>
          <button onClick={() => setSettingsModal(true)} title="Timer settings" style={{ position: "absolute", top: 16, right: 16, ...s.ghost, width: 38, height: 38, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.settings />
          </button>

          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {["pomodoro", "rest"].map((item) => (
              <button key={item} onClick={() => setTimerMode(item)} style={mode === item ? s.btn : s.ghost}>
                {item === "pomodoro" ? "Pomodoro" : "Rest"}
              </button>
            ))}
          </div>

          <svg width="250" height="250" viewBox="0 0 250 250">
            <circle cx="125" cy="125" r={r} fill="none" stroke={t.borderLight} strokeWidth="8" />
            <circle cx="125" cy="125" r={r} fill="none" stroke={mode === "pomodoro" ? t.accent : "#4caf50"} strokeWidth="8" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 125 125)" style={{ transition: running ? "stroke-dashoffset 1s linear" : "none" }} />
            <text x="125" y="116" textAnchor="middle" fill={t.text} fontSize="40" fontFamily="Inter, SF Pro Text, Segoe UI, system-ui, sans-serif" fontWeight="500">{mm}:{ss}</text>
            <text x="125" y="142" textAnchor="middle" fill={t.textMutedMore} fontSize="12" fontFamily="Inter, SF Pro Text, Segoe UI, system-ui, sans-serif">{running ? (mode === "pomodoro" ? "Focusing" : "Resting") : "Ready"}</text>
          </svg>

          <div style={{ minHeight: 36, marginTop: 8, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: t.textMutedMore, marginBottom: 4 }}>Current task</div>
            <div style={{ color: selTask ? t.accent : t.textMutedMore, fontSize: 14, fontWeight: 750 }}>{selTask?.text || "No task selected"}</div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 26, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={reset} title="Reset timer" style={{ ...s.ghost, display: "flex", alignItems: "center", gap: 6 }}><Icon.reset /> Reset</button>
            <button onClick={() => setRunning((value) => !value)} title="Start or pause timer" style={{ ...s.btn, minWidth: 116, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {running ? <><Icon.pause /> Pause</> : <><Icon.play /> Start</>}
            </button>
            <button onClick={logSession} title="Log current session" style={{ ...s.ghost, display: "flex", alignItems: "center", gap: 6 }}><Icon.log /> Log</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateRows: "minmax(0, 1fr) auto", gap: 12, minHeight: 520 }}>
          <div style={{ ...s.card, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <SecHdr icon={<Icon.zap />} label="Tasks" t={t} />
            <button onClick={() => setTaskModal(true)} style={{ ...s.ghost, marginTop: 12, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon.zap /> Add task
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", paddingRight: 2 }}>
              {selTask ? (
                <button style={{ display: "flex", alignItems: "center", gap: 10, background: t.hover, border: `1px solid ${t.accent}`, borderRadius: 6, padding: "10px 12px", textAlign: "left", color: t.text, fontSize: 12, fontFamily: "inherit" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
                  <span>{selTask.text}</span>
                </button>
              ) : (
                <div style={{ fontSize: 13, color: t.textMutedMore }}>No active task yet</div>
              )}
            </div>
          </div>

          <div style={{ ...s.card, maxHeight: 190, overflow: "hidden" }}>
            <SecHdr icon={<Icon.clock />} label="History" t={t} />
            {history.length === 0 ? (
              <div style={{ marginTop: 12, fontSize: 13, color: t.textMutedMore }}>No focus time logged yet</div>
            ) : (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: 118, overflowY: "auto" }}>
                {history.map((item) => (
                  <div key={item.task} style={{ padding: "8px 10px", background: t.hover, border: `1px solid ${t.border}`, borderRadius: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.task}</span>
                      <span style={{ fontSize: 11, color: t.accent, fontWeight: 750, flexShrink: 0 }}>{item.mins}m</span>
                    </div>
                    <span style={{ fontSize: 10, color: t.textMutedMore }}>{item.count} session{item.count === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {taskModal && (
        <Modal onClose={() => setTaskModal(false)} title="Add task" t={t}>
          <label style={s.label}>Create for this session</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 14 }}>
            <input value={momentTask} onChange={(e) => setMomentTask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createMomentTask()} placeholder="task name" style={{ ...s.input, marginBottom: 0 }} autoFocus />
            <button onClick={createMomentTask} style={s.btn}>Use</button>
          </div>

          {taskOptions.map((section) => (
            <div key={section.label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: t.textMutedMore, fontWeight: 750, marginBottom: 8 }}>{section.label}</div>
              {section.items.length === 0 ? (
                <div style={{ fontSize: 12, color: t.textMutedMore, marginBottom: 8 }}>None yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {section.items.map((task) => (
                    <button key={task.id} onClick={() => selectTask(task)} disabled={task.done} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 9, alignItems: "center", background: selTask?.id === task.id ? t.hover : "transparent", border: `1px solid ${selTask?.id === task.id ? t.accent : t.border}`, borderRadius: 6, padding: "8px 10px", cursor: task.done ? "not-allowed" : "pointer", color: task.done ? t.textMutedMost : t.textMuted, textAlign: "left", fontFamily: "inherit" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: selTask?.id === task.id ? t.accent : t.borderLight }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 12, color: task.done ? t.textMutedMost : t.text }}>{task.text}</span>
                        {task.meta && <span style={{ display: "block", fontSize: 10, color: t.textMutedMore, marginTop: 2 }}>{task.meta}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Modal>
      )}

      {settingsModal && (
        <Modal onClose={() => setSettingsModal(false)} title="Timer settings" t={t}>
          <label style={s.label}>Pomodoro minutes</label>
          <input type="number" min="1" max="240" value={settingsForm.pomodoro} onChange={(e) => setSettingsForm((form) => ({ ...form, pomodoro: e.target.value }))} style={s.input} autoFocus />
          <label style={s.label}>Rest minutes</label>
          <input type="number" min="1" max="240" value={settingsForm.rest} onChange={(e) => setSettingsForm((form) => ({ ...form, rest: e.target.value }))} style={s.input} />
          <button onClick={saveSettings} style={s.btn}>Save settings</button>
        </Modal>
      )}
    </div>
  );
}
