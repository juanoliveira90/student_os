import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect } from "react";
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

export const ui = {
  card: "rounded-lg border border-[var(--sos-card-border)] bg-[var(--sos-card)] p-[18px] shadow-[var(--sos-card-shadow)]",
  input: "mb-3 w-full rounded-lg border border-[var(--sos-border-alt)] bg-[var(--sos-select)] px-3 py-[11px] text-base text-[var(--sos-text)] outline-none",
  label: "mb-1.5 block text-[13px] font-medium text-[var(--sos-text-muted)]",
  btn: "cursor-pointer rounded-lg border-0 bg-[var(--sos-accent)] px-4 py-2.5 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-65",
  ghost: "cursor-pointer rounded-lg border border-[var(--sos-card-border)] bg-[var(--sos-card)] px-4 py-2.5 text-[15px] font-medium text-[var(--sos-text-muted)]",
};

export function Divider({ t }: { t: Theme }) {
  return <div className="my-2.5 h-px bg-[var(--sos-border)]" />;
}

export function Stat({ label, value, accent, ok, t }: BasicStatProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13px] text-[var(--sos-text-muted-more)]">{label}</span>
      <span className={`text-sm ${accent ? "text-[var(--sos-accent)]" : ok ? "text-[var(--sos-ok)]" : "text-[var(--sos-text-muted)]"}`}>{value}</span>
    </div>
  );
}

export function MiniStat({ label, value, accent, ok, t }: BasicStatProps) {
  return (
    <div className="rounded-lg border border-[var(--sos-card-border)] bg-[var(--sos-card)] p-3 shadow-[var(--sos-card-shadow)]">
      <div className="mb-1 text-[13px] text-[var(--sos-text-muted-more)]">{label}</div>
      <div className={`${accent || ok ? "sos-highlight" : ""} text-lg font-semibold ${accent ? "text-[var(--sos-accent)]" : ok ? "text-[var(--sos-ok)]" : "text-[var(--sos-text)]"}`}>{value}</div>
    </div>
  );
}

export function SecHdr({ icon, label, t }: SecHdrProps) {
  return (
    <div className="sos-heading flex items-center gap-2 text-xl font-semibold text-[var(--sos-text)]">
      {icon} {label}
    </div>
  );
}

export function PageHdr({ label, description, action, t }: PageHdrProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="m-0 text-[40px] font-semibold leading-[1.1] text-[var(--sos-text)]">{label}</h1>
        {description && <div className="mt-1.5 text-sm text-[var(--sos-text-muted-more)]">{description}</div>}
      </div>
      {action && <button className={ui.btn} onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

export function Kbd({ k, t }: KbdProps) {
  return <kbd className="rounded-[3px] border border-[var(--sos-border-light)] bg-[var(--sos-bg-alt)] px-[5px] py-px font-inherit text-[10px] text-[var(--sos-text-muted-more)]">{k}</kbd>;
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <div className="w-[90%] min-w-80 max-w-[440px] rounded-xl border border-[var(--sos-border-light)] bg-[var(--sos-card)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
        <div className="mb-[18px] flex items-center justify-between">
          <span className="sos-heading text-xl font-semibold text-[var(--sos-text)]">{title}</span>
          <button className="cursor-pointer border-0 bg-transparent text-[var(--sos-text-muted-more)]" onClick={onClose}><Icon.x /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
