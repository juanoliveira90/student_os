import { useState } from "react";
import { Icon } from "./icons.jsx";
import { getStyles } from "./ui.jsx";

export default function Settings({ user, theme, setTheme, t }) {
  const s = getStyles(t);
  const profile = user?.user ?? user ?? {};
  const [tab, setTab] = useState("profile");
  const [appearance, setAppearance] = useState(theme);
  const [form, setForm] = useState({
    name: profile.name || "Juan Farias",
    email: profile.email || "juan@example.com",
    password: "************",
    language: "en",
  });

  const tabs = [
    { id: "profile", label: "Profile", icon: Icon.settings },
    { id: "system", label: "System", icon: Icon.panelSoft },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <section style={{ ...s.card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${t.border}` }}>
          {tabs.map((item) => {
            const on = tab === item.id;
            const TabIcon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                style={{
                  height: 56,
                  border: "none",
                  borderBottom: `2px solid ${on ? t.accent : "transparent"}`,
                  background: "transparent",
                  color: on ? t.text : t.textMuted,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: on ? 800 : 650,
                }}
              >
                <span style={{ color: on ? t.accent : t.textMuted, display: "flex" }}><TabIcon /></span>
                {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 28 }}>
          {tab === "profile" ? (
            <ProfileTab form={form} setForm={setForm} s={s} t={t} />
          ) : (
            <SystemTab form={form} setForm={setForm} appearance={appearance} setAppearance={setAppearance} setTheme={setTheme} s={s} t={t} />
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileTab({ form, setForm, s, t }) {
  return (
    <div>
      <h2 style={sectionTitle(t)}>Profile</h2>
      <p style={sectionCopy(t)}>Manage your personal information and account.</p>

      <div style={{ maxWidth: 520, marginTop: 28 }}>
        <label style={s.label}>Name</label>
        <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} style={s.input} />
        <label style={{ ...s.label, marginTop: 12 }}>Email</label>
        <input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} style={s.input} />
      </div>

      <div style={{ height: 1, background: t.border, margin: "28px 0" }} />

      <h2 style={sectionTitle(t)}>Security</h2>
      <p style={sectionCopy(t)}>Update your password to keep your account secure.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, alignItems: "end", marginTop: 28, maxWidth: 700 }}>
        <div>
          <label style={s.label}>Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} style={{ ...s.input, marginBottom: 0 }} />
        </div>
        <button type="button" style={{ ...s.ghost, height: 42, color: t.accent, borderColor: t.borderAlt }}>Change Password</button>
      </div>

      <button type="button" style={{ ...s.btn, marginTop: 28 }}>Save Changes</button>
    </div>
  );
}

function SystemTab({ form, setForm, appearance, setAppearance, setTheme, s, t }) {
  const options = [
    { id: "light", label: "Light", icon: Icon.sun },
    { id: "dark", label: "Dark", icon: Icon.moon },
    { id: "system", label: "System", icon: Icon.panelSoft },
  ];

  return (
    <div>
      <h2 style={sectionTitle(t)}>System</h2>
      <p style={sectionCopy(t)}>Customize how Student OS works for you.</p>

      <h3 style={groupTitle(t)}>Appearance</h3>
      <p style={sectionCopy(t)}>Choose the theme you prefer.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginTop: 18 }}>
        {options.map((option) => {
          const on = appearance === option.id;
          const OptionIcon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setAppearance(option.id);
                if (option.id !== "system") setTheme(option.id);
              }}
              style={{
                height: 56,
                background: t.bgAlt,
                border: `1px solid ${on ? t.accent : t.borderAlt}`,
                borderRadius: 8,
                color: t.text,
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: 14,
                padding: "0 18px",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 750,
              }}
            >
              <span style={{ color: on ? t.accent : t.text, display: "flex" }}><OptionIcon /></span>
              <span style={{ textAlign: "left" }}>{option.label}</span>
              <span style={{ width: 14, height: 14, borderRadius: "50%", border: `1px solid ${on ? t.accent : t.borderLight}`, background: on ? t.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                {on && <Icon.check />}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ height: 1, background: t.border, margin: "30px 0" }} />

      <h3 style={groupTitle(t)}>Language</h3>
      <p style={sectionCopy(t)}>Choose the language used in the application.</p>
      <select value={form.language} onChange={(e) => setForm((current) => ({ ...current, language: e.target.value }))} style={{ ...s.input, maxWidth: 520, marginTop: 18 }}>
        <option value="en">English</option>
        <option value="pt">Português</option>
      </select>

      <button type="button" style={{ ...s.btn, marginTop: 16 }}>Save Changes</button>
    </div>
  );
}

function sectionTitle(t) {
  return { margin: 0, color: t.text, fontSize: 18, fontWeight: 800 };
}

function groupTitle(t) {
  return { margin: "28px 0 8px", color: t.text, fontSize: 16, fontWeight: 800 };
}

function sectionCopy(t) {
  return { margin: "8px 0 0", color: t.textMuted, fontSize: 14 };
}
