import { type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect } from "react";
import { Icon } from "./icons";

type Theme = Record<string, string>;

type BasicStatProps = {
  label: ReactNode;
  value: ReactNode;
  accent?: boolean;
  ok?: boolean;
  t: Theme;
};

type SecHdrProps = {
  icon: ReactNode;
  label: ReactNode;
  t: Theme;
};

type PageHdrProps = {
  label: ReactNode;
  description?: ReactNode;
  action?: {
    label: ReactNode;
    onClick: () => void;
  };
  t: Theme;
};

type KbdProps = {
  k: ReactNode;
  t: Theme;
};

type ModalProps = {
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  t: Theme;
};

export function getStyles(t: Theme): Record<string, CSSProperties> {
  return {
    card: { background: t.bgAlt, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: "18px", boxShadow: "0 10px 28px rgba(0,0,0,0.04)" },
    input: { width: "100%", background: t.select, border: `1px solid ${t.borderAlt}`, borderRadius: 8, color: t.text, fontSize: 14, padding: "11px 12px", outline: "none", marginBottom: 12, boxSizing: "border-box", fontFamily: "inherit" },
    label: { fontSize: 12, color: t.textMuted, display: "block", marginBottom: 6, fontWeight: 600 },
    btn: { background: t.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontWeight: 650 },
    ghost: { background: t.bgAlt, border: `1px solid ${t.borderLight}`, borderRadius: 8, color: t.textMuted, fontSize: 13, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 },
  };
}

export function Divider({ t }: { t: Theme }) {
  return <div style={{ height: 1, background: t.border, margin: "10px 0" }} />;
}

export function Stat({ label, value, accent, ok, t }: BasicStatProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
      <span style={{ fontSize: 11, color: t.textMutedMore }}>{label}</span>
      <span style={{ fontSize: 12, color: accent ? t.accent : ok ? "#4caf50" : t.textMuted }}>{value}</span>
    </div>
  );
}

export function MiniStat({ label, value, accent, ok, t }: BasicStatProps) {
  return (
    <div style={{ background: t.hover, borderRadius: 8, padding: "12px" }}>
      <div style={{ fontSize: 12, color: t.textMutedMore, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, color: accent ? t.accent : ok ? "#4caf50" : t.text, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export function SecHdr({ icon, label, t }: SecHdrProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.text, fontSize: 15, fontWeight: 700 }}>
      {icon} {label}
    </div>
  );
}

export function PageHdr({ label, description, action, t }: PageHdrProps) {
  const s = getStyles(t);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 750, color: t.text, margin: 0 }}>{label}</h1>
        {description && <div style={{ fontSize: 14, color: t.textMutedMore, marginTop: 6 }}>{description}</div>}
      </div>
      {action && <button onClick={action.onClick} style={s.btn}>{action.label}</button>}
    </div>
  );
}

export function Kbd({ k, t }: KbdProps) {
  return <kbd style={{ background: t.bgAlt, border: `1px solid ${t.borderLight}`, borderRadius: 3, padding: "1px 5px", fontFamily: "inherit", fontSize: 10, color: t.textMutedMore }}>{k}</kbd>;
}

export function Modal({ onClose, title, children, t }: ModalProps) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: t.card, border: `1px solid ${t.borderLight}`, borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 440, width: "90%", boxShadow: "0 24px 70px rgba(0,0,0,0.24)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, alignItems: "center" }}>
          <span style={{ fontSize: 18, color: t.text, fontWeight: 750 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMore }}><Icon.x /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
