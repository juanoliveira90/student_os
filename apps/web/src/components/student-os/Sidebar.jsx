import { NAV_ITEMS } from "./data.js";
import { Icon } from "./icons.jsx";
import { Kbd } from "./ui.jsx";

export default function Sidebar({ active, setActive, t }) {
  const icons = { dashboard: Icon.grid, schedule: Icon.cal, studyplans: Icon.book, habits: Icon.target, focustime: Icon.timer, documents: Icon.file };

  return (
    <aside style={{ width: 216, minHeight: "100vh", background: t.bg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent, display: "inline-block" }} />
        <span style={{ fontSize: 11, color: t.textMutedMore, letterSpacing: "0.08em" }}>menu</span>
      </div>

      <nav style={{ flex: 1, padding: "8px 0" }}>
        {NAV_ITEMS.map(({ id, label, key }) => {
          const Ic = icons[id];
          const on = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "9px 16px",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                background: on ? t.accent : "transparent",
                color: on ? "#fff" : t.textMuted,
                fontSize: 13,
                letterSpacing: "0.02em",
                transition: "all 0.12s",
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                if (!on) {
                  e.currentTarget.style.background = t.hover;
                  e.currentTarget.style.color = t.text;
                }
              }}
              onMouseLeave={(e) => {
                if (!on) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = t.textMuted;
                }
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Ic /> {label}</span>
              <kbd style={{ fontSize: 9, opacity: 0.45, background: "transparent", border: "1px solid currentColor", borderRadius: 2, padding: "0 3px", fontFamily: "inherit" }}>{key}</kbd>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 10, color: t.textMutedMost, marginBottom: 6 }}>// shortcuts</div>
        {[
          { keys: ["1-6"], desc: "navigate" },
          { keys: ["Space"], desc: "play/pause" },
          { keys: ["R"], desc: "reset timer" },
          { keys: ["Esc"], desc: "close modal" },
          { keys: ["Ctrl", "S"], desc: "save doc" },
        ].map(({ keys, desc }) => (
          <div key={desc} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            {keys.map((k) => <Kbd key={k} k={k} t={t} />)}
            <span style={{ fontSize: 10, color: t.textMutedMost }}>{desc}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 16px", borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.bgAlt, border: `1px solid ${t.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: t.textMuted }}>U</div>
        <div>
          <div style={{ fontSize: 12, color: t.text }}>user_005</div>
          <div style={{ fontSize: 11, color: t.textMutedMore }}>student</div>
        </div>
      </div>
    </aside>
  );
}
