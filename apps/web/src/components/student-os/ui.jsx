import { useEffect } from "react";
import { Icon } from "./icons.jsx";

export function getStyles(t) {
  return {
    card: { background: t.bgAlt, border: `1px solid ${t.cardBorder}`, borderRadius: 6, padding: "16px" },
    input: { width: "100%", background: t.select, border: `1px solid ${t.borderAlt}`, borderRadius: 4, color: t.text, fontSize: 13, padding: "8px 10px", outline: "none", marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit" },
    label: { fontSize: 11, color: t.textMutedMore, display: "block", marginBottom: 4 },
    btn: { background: t.accent, border: "none", borderRadius: 4, color: "#fff", fontSize: 12, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.03em" },
    ghost: { background: "transparent", border: `1px solid ${t.borderLight}`, borderRadius: 4, color: t.textMuted, fontSize: 12, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit" },
  };
}

export function Divider({ t }) {
  return <div style={{ height: 1, background: t.border, margin: "10px 0" }} />;
}

export function Stat({ label, value, accent, ok, t }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
      <span style={{ fontSize: 11, color: t.textMutedMore }}>{label}</span>
      <span style={{ fontSize: 12, color: accent ? t.accent : ok ? "#4caf50" : t.textMuted }}>{value}</span>
    </div>
  );
}

export function MiniStat({ label, value, accent, ok, t }) {
  return (
    <div style={{ background: t.hover, borderRadius: 4, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: t.textMutedMore, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: accent ? t.accent : ok ? "#4caf50" : t.text }}>{value}</div>
    </div>
  );
}

export function SecHdr({ icon, label, t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.accent, fontSize: 12, letterSpacing: "0.05em" }}>
      {icon} {label}
    </div>
  );
}

export function PageHdr({ label, action, t }) {
  const s = getStyles(t);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 400, color: t.text, margin: 0 }}>{label}</h1>
      {action && <button onClick={action.onClick} style={s.btn}>{action.label}</button>}
    </div>
  );
}

export function Kbd({ k, t }) {
  return <kbd style={{ background: t.bgAlt, border: `1px solid ${t.borderLight}`, borderRadius: 3, padding: "1px 5px", fontFamily: "inherit", fontSize: 10, color: t.textMutedMore }}>{k}</kbd>;
}

export function Modal({ onClose, title, children, t }) {
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: t.card, border: `1px solid ${t.borderLight}`, borderRadius: 8, padding: 24, minWidth: 320, maxWidth: 440, width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 14, color: t.text }}>// {title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMore }}><Icon.x /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
