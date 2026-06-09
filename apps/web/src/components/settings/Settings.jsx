import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../icons";
import { getStyles } from "../ui";
import { updatePassword, updateProfile } from "../../fetchs/authFetchs";
import { saveLanguage } from "../../i18n";

export default function Settings({ user, appearance, setAppearance, t }) {
  const { t: tr, i18n } = useTranslation();
  const s = getStyles(t);
  const profile = user?.user ?? user ?? {};
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    language: i18n.language?.startsWith("pt") ? "pt-BR" : "en",
  });

  const tabs = [
    { id: "profile", label: tr("settings.profile"), icon: Icon.settings },
    { id: "system", label: tr("settings.system"), icon: Icon.panelSoft },
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
            <SystemTab form={form} setForm={setForm} appearance={appearance} setAppearance={setAppearance} s={s} t={t} />
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileTab({ form, setForm, s, t }) {
  const { t: tr } = useTranslation();
  const [savedName, setSavedName] = useState(form.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordUpdatedOpen, setPasswordUpdatedOpen] = useState(false);
  const nextName = String(form.name || "").trim();
  const canSave = nextName.length > 0 && nextName !== savedName && !isSaving;

  async function handleSaveProfile() {
    if (!canSave) return;

    setIsSaving(true);
    setSaveStatus("");

    try {
      await updateProfile(nextName);
      setSavedName(nextName);
      setForm((current) => ({ ...current, name: nextName }));
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h2 style={sectionTitle(t)}>{tr("settings.profile")}</h2>
      <p style={sectionCopy(t)}>{tr("settings.manageProfile")}</p>

      <div style={{ maxWidth: 520, marginTop: 28 }}>
        <label style={s.label}>{tr("settings.name")}</label>
        <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} style={s.input} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, marginBottom: 6 }}>
          <label style={{ ...s.label, margin: 0 }}>{tr("settings.email")}</label>
        </div>
        <input
          value={form.email}
          disabled
          title={tr("settings.emailPending")}
          style={{
            ...s.input,
            cursor: "not-allowed",
            color: t.textMutedMore,
            background: t.bgAlt,
            borderStyle: "dashed",
            opacity: 0.78,
          }}
        />
      </div>

      <div style={{ height: 1, background: t.border, margin: "28px 0" }} />

      <h2 style={sectionTitle(t)}>{tr("settings.security")}</h2>
      <p style={sectionCopy(t)}>{tr("settings.securityCopy")}</p>
      <button
        type="button"
        onClick={() => setPasswordOpen(true)}
        style={{ ...s.ghost, height: 42, color: t.accent, borderColor: t.borderAlt, marginTop: 28 }}
      >
        {tr("settings.changePassword")}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={!canSave}
          style={{
            ...s.btn,
            cursor: canSave ? "pointer" : "not-allowed",
            opacity: canSave ? 1 : 0.58,
          }}
        >
          {isSaving ? tr("common.saving") : tr("settings.saveChanges")}
        </button>
        {saveStatus && <span style={{ color: saveStatus === "saved" ? t.accent : t.danger || "#b42318", fontSize: 13 }}>{saveStatus === "saved" ? tr("settings.saved") : saveStatus}</span>}
      </div>

      {passwordOpen && (
        <PasswordPanel
          onClose={() => setPasswordOpen(false)}
          onUpdated={() => {
            setPasswordOpen(false);
            setPasswordUpdatedOpen(true);
          }}
          s={s}
          t={t}
        />
      )}
      {passwordUpdatedOpen && <PasswordUpdatedPanel onClose={() => setPasswordUpdatedOpen(false)} s={s} t={t} />}
    </div>
  );
}

function PasswordPanel({ onClose, onUpdated, s, t }) {
  const { t: tr } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const isLongEnough = password.length >= 8;
  const isMatching = password === confirmPassword;
  const canContinue = isLongEnough && isMatching && !isSaving;

  async function handleContinue() {
    if (!canContinue) return;

    setIsSaving(true);
    setStatus("");

    try {
      await updatePassword(password);
      onUpdated();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <section style={{ ...s.card, width: "min(420px, 100%)", padding: 24, boxShadow: "0 18px 48px rgba(0,0,0,0.24)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <h2 style={sectionTitle(t)}>{tr("settings.changePassword")}</h2>
          <button type="button" onClick={onClose} aria-label={tr("settings.closeChangePassword")} style={{ ...s.ghost, width: 34, height: 34, padding: 0 }}>x</button>
        </div>

        <div style={{ marginTop: 22 }}>
          <label style={s.label}>{tr("settings.newPassword")}</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} style={s.input} />

          <label style={{ ...s.label, marginTop: 12 }}>{tr("settings.confirmNewPassword")}</label>
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={s.input} />
        </div>

        <div style={{ minHeight: 20, color: t.danger || "#b42318", fontSize: 13 }}>
          {!isLongEnough && password ? tr("settings.passwordLength") : ""}
          {isLongEnough && !isMatching && confirmPassword ? tr("settings.passwordMatch") : ""}
          {status}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          style={{
            ...s.btn,
            width: "100%",
            marginTop: 14,
            cursor: canContinue ? "pointer" : "not-allowed",
            opacity: canContinue ? 1 : 0.58,
          }}
        >
          {isSaving ? tr("common.saving") : tr("settings.continue")}
        </button>
      </section>
    </div>
  );
}

function PasswordUpdatedPanel({ onClose, s, t }) {
  const { t: tr } = useTranslation();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <section style={{ ...s.card, width: "min(360px, 100%)", padding: 24, boxShadow: "0 18px 48px rgba(0,0,0,0.24)", textAlign: "center" }}>
        <h2 style={{ ...sectionTitle(t), fontSize: 20 }}>{tr("settings.passwordUpdated")}</h2>
        <button type="button" onClick={onClose} style={{ ...s.btn, width: "100%", marginTop: 22 }}>{tr("common.close")}</button>
      </section>
    </div>
  );
}

function SystemTab({ form, setForm, appearance, setAppearance, s, t }) {
  const { t: tr, i18n } = useTranslation();
  const options = [
    { id: "light", label: tr("settings.light"), icon: Icon.sun },
    { id: "dark", label: tr("settings.dark"), icon: Icon.moon },
    { id: "system", label: tr("settings.systemTheme"), icon: Icon.panelSoft },
  ];

  return (
    <div>
      <h2 style={sectionTitle(t)}>{tr("settings.system")}</h2>
      <p style={sectionCopy(t)}>{tr("settings.customizeSystem")}</p>

      <h3 style={groupTitle(t)}>{tr("settings.appearance")}</h3>
      <p style={sectionCopy(t)}>{tr("settings.appearanceCopy")}</p>
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

      <h3 style={groupTitle(t)}>{tr("settings.language")}</h3>
      <p style={sectionCopy(t)}>{tr("settings.languageCopy")}</p>
      <select
        value={i18n.language?.startsWith("pt") ? "pt-BR" : "en"}
        onChange={(e) => {
          const language = e.target.value;
          setForm((current) => ({ ...current, language }));
          void i18n.changeLanguage(language);
          saveLanguage(language);
        }}
        style={{ ...s.input, maxWidth: 520, marginTop: 18 }}
      >
        <option value="en">{tr("language.english")}</option>
        <option value="pt-BR">{tr("language.portuguese")}</option>
      </select>
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
