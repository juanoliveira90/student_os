import { NAV_ITEMS } from "./data.js";
import { Icon } from "./icons";
import { type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";

type Theme = Record<string, string>;

type SidebarProps = {
  active: string;
  setActive: (active: string) => void;
  t: Theme;
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
};

type IconComponent = (props: { size?: number }) => JSX.Element;

type NavButtonProps = {
  item: {
    id: string;
  };
  active: string;
  setActive: (active: string) => void;
  icons: Record<string, IconComponent>;
  collapsed: boolean;
};

const NAV_ICONS: Record<string, IconComponent> = {
  dashboard: Icon.home,
  schedule: Icon.calendar,
  studyplans: Icon.book,
  documents: Icon.fileText,
  settings: Icon.settings,
};

export default function Sidebar({ active, setActive, collapsed, setCollapsed }: SidebarProps) {
  const { t: tr } = useTranslation();
  const mainItems = NAV_ITEMS.filter((item) => item.id !== "settings");
  const settingsItem = NAV_ITEMS.find((item) => item.id === "settings");

  return (
    <aside className={`${collapsed ? "w-[72px]" : "w-[232px]"} relative flex min-h-screen shrink-0 flex-col border-r border-[var(--sos-sidebar-border)] bg-[var(--sos-sidebar)] text-[var(--sos-sidebar-text)] transition-[width] duration-[220ms] ease-in-out`}>
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? tr("common.expandSidebar") : tr("common.collapseSidebar")}
        title={collapsed ? tr("common.expandSidebar") : tr("common.collapseSidebar")}
        className="absolute right-[-15px] top-[26px] z-[60] flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border border-[var(--sos-sidebar-border)] bg-[var(--sos-sidebar-alt)] text-[var(--sos-sidebar-muted)] shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-colors duration-150 ease-in-out hover:text-[var(--sos-sidebar-text)]"
      >
        <Icon.panelSoft size={15} />
      </button>

      <div className={`${collapsed ? "justify-center px-2" : "justify-start px-5"} flex h-[72px] shrink-0 items-center gap-2.5`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--sos-sidebar-active)] text-[var(--sos-sidebar-accent)]">
          <Icon.feather size={19} />
        </span>
        <span className={`${collapsed ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100"} overflow-hidden whitespace-nowrap font-sos-display text-[24px] font-semibold tracking-[0.3px] transition-[max-width,opacity] duration-200 ease-in-out`}>
          {tr("landing.brand")}
        </span>
      </div>

      <nav className={`${collapsed ? "px-2.5" : "px-3"} flex flex-1 flex-col gap-1 pt-2`}>
        {mainItems.map((item) => (
          <NavButton key={item.id} item={item} active={active} setActive={setActive} icons={NAV_ICONS} collapsed={collapsed} />
        ))}
        {settingsItem && (
          <div className="mt-auto pb-4 pt-2">
            <NavButton item={settingsItem} active={active} setActive={setActive} icons={NAV_ICONS} collapsed={collapsed} />
          </div>
        )}
      </nav>
    </aside>
  );
}

function NavButton({ item, active, setActive, icons, collapsed }: NavButtonProps) {
  const { t: tr } = useTranslation();
  const { id } = item;
  const translatedLabel = tr(`nav.${id}.label`);
  const Ic = icons[id];
  const on = active === id;

  return (
    <button
      type="button"
      onClick={() => setActive(id)}
      title={collapsed ? translatedLabel : undefined}
      aria-current={on ? "page" : undefined}
      className={`${collapsed ? "justify-center px-0" : "justify-start px-3"} ${on ? "bg-[var(--sos-sidebar-active)] text-[var(--sos-sidebar-active-text)]" : "bg-transparent text-[var(--sos-sidebar-muted)] hover:bg-[var(--sos-sidebar-hover)] hover:text-[var(--sos-sidebar-text)]"} flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-[10px] border-0 text-left font-[inherit] text-sm font-semibold transition-colors duration-150`}
    >
      <span className={`flex shrink-0 ${on ? "text-[var(--sos-sidebar-accent)]" : ""}`}>{Ic && <Ic size={18} />}</span>
      <span className={`${collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"} overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-in-out`}>
        {translatedLabel}
      </span>
    </button>
  );
}
