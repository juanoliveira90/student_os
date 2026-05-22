import { NAV_ITEMS } from "./data.js";
import { Icon } from "./icons.jsx";

export default function Sidebar({ active, setActive, t, collapsed, setCollapsed }) {
  const icons = { dashboard: Icon.grid, schedule: Icon.cal, studyplans: Icon.book, habits: Icon.target, focustime: Icon.timer, documents: Icon.file };
  const width = collapsed ? 64 : 216;

  return (
    <aside style={{ width, minHeight: "100vh", background: t.bg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.22s ease" }}>
      <div style={{ padding: collapsed ? "12px 10px" : "14px 12px 10px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 8, transition: "padding 0.22s ease" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent, display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: t.textMutedMore, letterSpacing: "0.08em" }}>menu</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
          title={collapsed ? "expand sidebar" : "collapse sidebar"}
          style={{ width: 32, height: 28, border: `1px solid ${t.borderLight}`, borderRadius: 4, background: t.bgAlt, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.16s ease, color 0.16s ease, border-color 0.16s ease" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = t.hover;
            e.currentTarget.style.color = t.text;
            e.currentTarget.style.borderColor = t.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = t.bgAlt;
            e.currentTarget.style.color = t.textMuted;
            e.currentTarget.style.borderColor = t.borderLight;
          }}
        >
          {collapsed ? <Icon.chevronRight /> : <Icon.chevronLeft />}
        </button>
      </div>

      <nav style={{ flex: 1, padding: "8px 0" }}>
        {NAV_ITEMS.map(({ id, label }) => {
          const Ic = icons[id];
          const on = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                width: "100%",
                height: 40,
                padding: collapsed ? "0" : "0 16px",
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
              title={collapsed ? label : undefined}
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
              <span style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: collapsed ? 0 : 10, width: "100%", minWidth: 0 }}>
                <Ic />
                <span style={{ maxWidth: collapsed ? 0 : 136, opacity: collapsed ? 0 : 1, overflow: "hidden", whiteSpace: "nowrap", transition: "max-width 0.2s ease, opacity 0.16s ease" }}>{label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: collapsed ? "12px 10px" : "12px 16px", borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10, transition: "padding 0.22s ease" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.bgAlt, border: `1px solid ${t.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: t.textMuted }}>U</div>
        <div style={{ maxWidth: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1, overflow: "hidden", whiteSpace: "nowrap", transition: "max-width 0.2s ease, opacity 0.16s ease" }}>
          <div style={{ fontSize: 12, color: t.text }}>user_005</div>
          <div style={{ fontSize: 11, color: t.textMutedMore }}>student</div>
        </div>
      </div>
    </aside>
  );
}
