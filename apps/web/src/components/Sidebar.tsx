import { NAV_ITEMS } from "./data.js";
import { Icon } from "./icons";
import { useNavigate } from "@tanstack/react-router";
import { type CSSProperties, type Dispatch, type MouseEvent, type SetStateAction, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthenticatedUser, logout } from "../fetchs/authFetchs";

type Theme = Record<string, string>;

type UserProfile = {
  user?: UserProfile;
  name?: string;
  email?: string;
  picture?: string;
  avatar?: string;
  avatarUrl?: string;
  image?: string;
};

type SidebarProps = {
  active: string;
  setActive: (active: string) => void;
  t: Theme;
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  onLogout?: () => void;
};

type NavButtonProps = {
  item: {
    id: string;
  };
  active: string;
  setActive: (active: string) => void;
  icons: Record<string, () => JSX.Element>;
  collapsed: boolean;
  t: Theme;
};

export default function Sidebar({ active, setActive, t, collapsed, setCollapsed, onLogout }: SidebarProps) {
  const { t: tr } = useTranslation();
  const navigate = useNavigate();
  const icons = { dashboard: Icon.grid, schedule: Icon.cal, studyplans: Icon.book, habits: Icon.target, focustime: Icon.timer, documents: Icon.file, settings: Icon.settings };
  const readyItems = NAV_ITEMS.filter((item) => !["habits", "focustime", "settings"].includes(item.id));
  const pendingItems = NAV_ITEMS.filter((item) => ["habits", "focustime"].includes(item.id));
  const settingsItem = NAV_ITEMS.find((item) => item.id === "settings");
  const width = collapsed ? 64 : 216;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const profile = user?.user ?? user ?? {};
  const displayName = profile.name || profile.email || "student";
  const avatarUrl = profile.picture || profile.avatar || profile.avatarUrl || profile.image;
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    getAuthenticatedUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (e.target instanceof Node && !profileRef.current?.contains(e.target)) setProfileOpen(false);
    }

    
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);
  
  async function callLogout() {
    try {
      const data = await logout();
      console.log(data);
    } catch (err) {
      console.error("logout failed:", err);
    } finally {
      onLogout?.();
      navigate({ to: "/login" });
    }
  }
  
  return (
    <aside style={{ width, minHeight: "100vh", background: t.bg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.22s ease", position: "relative" }}>
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? tr("common.expandSidebar") : tr("common.collapseSidebar")}
        title={collapsed ? tr("common.expandSidebar") : tr("common.collapseSidebar")}
        style={{ position: "absolute", top: collapsed ? 18 : 22, right: -17, width: 34, height: 34, border: `1px solid ${t.borderLight}`, borderRadius: 999, background: t.bgAlt, color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.16s ease, color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease", zIndex: 60, boxShadow: "0 8px 20px rgba(0,0,0,0.10)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = t.hover;
          e.currentTarget.style.color = t.text;
          e.currentTarget.style.borderColor = t.borderLight;
          e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.14)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = t.bgAlt;
          e.currentTarget.style.color = t.textMuted;
          e.currentTarget.style.borderColor = t.borderLight;
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.10)";
        }}
      >
        <Icon.panelSoft />
      </button>

      <div ref={profileRef} style={{ padding: collapsed ? "12px 10px" : "16px 12px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10, transition: "padding 0.22s ease", position: "relative" }}>
        {profileOpen && (
          <div style={{ position: "absolute", left: collapsed ? 10 : 12, top: "calc(100% + 8px)", width: collapsed ? 180 : 190, background: t.card, border: `1px solid ${t.borderLight}`, borderRadius: 8, padding: 6, boxShadow: "0 14px 36px rgba(0,0,0,0.22)", zIndex: 40 }}>
            <button type="button" style={{ ...profileMenuItem(t), color: t.accent }} onClick={callLogout}>
              <Icon.logout />
              <span>{tr("common.logout")}</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setProfileOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          title={collapsed ? displayName : undefined}
          style={{ minWidth: 0, flex: collapsed ? "0 0 auto" : 1, height: 44, padding: collapsed ? 0 : "0 8px", border: "none", background: "transparent", color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10, borderRadius: 8, fontFamily: "inherit", transition: "background 0.16s ease" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = t.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span style={{ width: 32, height: 32, borderRadius: "50%", background: t.bgAlt, border: `1px solid ${t.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: t.textMuted, overflow: "hidden", flexShrink: 0, fontWeight: 750 }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
          </span>
          <span style={{ maxWidth: collapsed ? 0 : 116, opacity: collapsed ? 0 : 1, overflow: "hidden", whiteSpace: "nowrap", transition: "max-width 0.2s ease, opacity 0.16s ease", textAlign: "left" }}>
            <span style={{ display: "block", fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", fontWeight: 750 }}>{displayName}</span>
            <span style={{ display: "block", fontSize: 11, color: t.textMutedMore }}>{tr("common.student")}</span>
          </span>
        </button>

      </div>

      <nav style={{ flex: 1, padding: collapsed ? "12px 8px" : "14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {readyItems.map((item) => (
          <NavButton key={item.id} item={item} active={active} setActive={setActive} icons={icons} collapsed={collapsed} t={t} />
        ))}
        <div style={{ height: 1, background: t.border, margin: collapsed ? "12px 8px" : "18px 44px 14px" }} />
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: t.textMutedMore, fontSize: 11, fontWeight: 750, letterSpacing: 2.4, textTransform: "uppercase", margin: "0 10px 10px" }}>
            <span style={{ height: 1, flex: 1, background: t.border }} />
            {tr("common.comingSoon")}
            <span style={{ height: 1, flex: 1, background: t.border }} />
          </div>
        )}
        {pendingItems.map(({ id }) => {
          const Ic = icons[id];
          const translatedLabel = tr(`nav.${id}.label`);
          const translatedDescription = tr(`nav.${id}.description`);
          return (
            <button
              key={id}
              disabled
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                width: "fit-content",
                minHeight: collapsed ? 42 : 54,
                padding: collapsed ? "0" : "0 12px",
                border: "none",
                cursor: "not-allowed",
                textAlign: "left",
                background: "transparent",
                color: t.textMutedMore,
                fontSize: 14,
                fontWeight: 650,
                borderRadius: 8,
                fontFamily: "inherit",
                opacity: 0.78,
              }}
              title={collapsed ? `${translatedLabel} ${tr("common.pending").toLowerCase()}` : undefined}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: collapsed ? 0 : 12, width: "100%", minWidth: 0 }}>
                <span style={{ width: collapsed ? 32 : 34, height: collapsed ? 32 : 34, borderRadius: 999, border: `1px dashed ${t.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMutedMore, flexShrink: 0 }}><Ic /></span>
                <span style={{ maxWidth: collapsed ? 0 : 140, opacity: collapsed ? 0 : 1, overflow: "hidden", whiteSpace: "nowrap", transition: "max-width 0.2s ease, opacity 0.16s ease" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {translatedLabel}
                    <span style={{ background: t.hover, border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 7, padding: "2px 7px", fontSize: 11, fontWeight: 650 }}>{tr("common.pending")}</span>
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: t.textMutedMore, fontWeight: 500, marginTop: 2 }}>{translatedDescription}</span>
                </span>
              </span>
            </button>
          );
        })}
        {settingsItem && (
          <div style={{ marginTop: "auto", paddingTop: 14 }}>
            <NavButton item={settingsItem} active={active} setActive={setActive} icons={icons} collapsed={collapsed} t={t} />
          </div>
        )}
      </nav>

    </aside>
  );
}

function NavButton({ item, active, setActive, icons, collapsed, t }: NavButtonProps) {
  const { t: tr } = useTranslation();
  const { id } = item;
  const translatedLabel = tr(`nav.${id}.label`);
  const translatedDescription = tr(`nav.${id}.description`);
  const Ic = icons[id];
  const on = active === id;

  return (
    <button
      type="button"
      onClick={() => setActive(id)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        width: "100%",
        minHeight: collapsed ? 42 : 54,
        padding: collapsed ? "0" : "0 12px",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        background: on ? t.hover : "transparent",
        color: on ? t.text : t.textMuted,
        fontSize: 14,
        fontWeight: on ? 750 : 600,
        transition: "all 0.12s",
        borderRadius: 8,
        borderLeft: collapsed ? "none" : `3px solid ${on ? t.accent : "transparent"}`,
        fontFamily: "inherit",
      }}
      title={collapsed ? translatedLabel : undefined}
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
      <span style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: collapsed ? 0 : 12, width: "100%", minWidth: 0 }}>
        <span style={{ color: on ? t.accent : t.textMuted, display: "flex" }}><Ic /></span>
        <span style={{ maxWidth: collapsed ? 0 : 140, opacity: collapsed ? 0 : 1, overflow: "hidden", whiteSpace: "nowrap", transition: "max-width 0.2s ease, opacity 0.16s ease" }}>
          <span style={{ display: "block" }}>{translatedLabel}</span>
          <span style={{ display: "block", fontSize: 11, color: t.textMutedMore, fontWeight: 500, marginTop: 2 }}>{translatedDescription}</span>
        </span>
      </span>
    </button>
  );
}

function profileMenuItem(t: Theme): CSSProperties {
  return {
    width: "100%",
    height: 34,
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: t.textMuted,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 10px",
    fontSize: 12,
    fontFamily: "inherit",
    textAlign: "left",
  };
}
