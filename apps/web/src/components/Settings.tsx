import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./icons";
import { ui } from "./ui";
import { updatePassword, updateProfile } from "../fetchs/authFetchs";
import { saveLanguage } from "../i18n";

const sectionTitle = "m-0 text-xl font-semibold text-[var(--sos-text)]";
const groupTitle = "mb-2 mt-7 text-xl font-semibold text-[var(--sos-text)]";
const sectionCopy = "mt-2 text-sm text-[var(--sos-text-muted)]";
const divider = "my-7 h-px bg-[var(--sos-border)]";
const optionGrid = "mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[18px]";
const optionButton = "grid h-14 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-lg border bg-[var(--sos-bg-alt)] px-[18px] text-[15px] font-semibold text-[var(--sos-text)]";
const optionButtonTwoColumn = "grid h-14 cursor-pointer grid-cols-[1fr_auto] items-center gap-3.5 rounded-lg border bg-[var(--sos-bg-alt)] px-[18px] text-[15px] font-semibold text-[var(--sos-text)]";
const selectedBorder = "border-[var(--sos-accent)]";
const unselectedBorder = "border-[var(--sos-border-alt)]";
const checkDot = "flex h-3.5 w-3.5 items-center justify-center rounded-full border text-white";
const modalOverlay = "fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-[18px]";

export default function Settings({ user, appearance, setAppearance, timeFormat, setTimeFormat }) {
  const { t: tr, i18n } = useTranslation();
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
    <div className="mx-auto max-w-[1180px]">
      <section className={`${ui.card} overflow-hidden p-0`}>
        <div className="grid grid-cols-2 border-b border-[var(--sos-border)]">
          {tabs.map((item) => {
            const on = tab === item.id;
            const TabIcon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex h-14 cursor-pointer items-center justify-center gap-2.5 border-0 border-b-2 bg-transparent text-sm ${on ? "border-b-[var(--sos-accent)] font-extrabold text-[var(--sos-text)]" : "border-b-transparent font-semibold text-[var(--sos-text-muted)]"}`}
              >
                <span className={`flex ${on ? "text-[var(--sos-accent)]" : "text-[var(--sos-text-muted)]"}`}><TabIcon /></span>
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="p-7">
          {tab === "profile" ? (
            <ProfileTab form={form} setForm={setForm} />
          ) : (
            <SystemTab form={form} setForm={setForm} appearance={appearance} setAppearance={setAppearance} timeFormat={timeFormat} setTimeFormat={setTimeFormat} />
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileTab({ form, setForm }) {
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
      <h2 className={sectionTitle}>{tr("settings.profile")}</h2>
      <p className={sectionCopy}>{tr("settings.manageProfile")}</p>

      <div className="mt-7 max-w-[520px]">
        <label className={ui.label}>{tr("settings.name")}</label>
        <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className={ui.input} />
        <div className="mb-1.5 mt-3 flex items-center gap-2">
          <label className="block text-[13px] font-medium text-[var(--sos-text-muted)]">{tr("settings.email")}</label>
        </div>
        <input
          value={form.email}
          disabled
          title={tr("settings.emailPending")}
          className={`${ui.input} cursor-not-allowed border-dashed bg-[var(--sos-bg-alt)] text-[var(--sos-text-muted-more)] opacity-[0.78]`}
        />
      </div>

      <div className={divider} />

      <h2 className={sectionTitle}>{tr("settings.security")}</h2>
      <p className={sectionCopy}>{tr("settings.securityCopy")}</p>
      <button
        type="button"
        onClick={() => setPasswordOpen(true)}
        className={`${ui.ghost} mt-7 h-[42px] border-[var(--sos-border-alt)] text-[var(--sos-accent)]`}
      >
        {tr("settings.changePassword")}
      </button>

      <div className="mt-7 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={!canSave}
          className={`${ui.btn} ${canSave ? "cursor-pointer opacity-100" : "cursor-not-allowed opacity-[0.58]"}`}
        >
          {isSaving ? tr("common.saving") : tr("settings.saveChanges")}
        </button>
        {saveStatus && <span className={`text-[13px] ${saveStatus === "saved" ? "text-[var(--sos-accent)]" : "text-[var(--sos-danger,#b42318)]"}`}>{saveStatus === "saved" ? tr("settings.saved") : saveStatus}</span>}
      </div>

      {passwordOpen && (
        <PasswordPanel
          onClose={() => setPasswordOpen(false)}
          onUpdated={() => {
            setPasswordOpen(false);
            setPasswordUpdatedOpen(true);
          }}
        />
      )}
      {passwordUpdatedOpen && <PasswordUpdatedPanel onClose={() => setPasswordUpdatedOpen(false)} />}
    </div>
  );
}

function PasswordPanel({ onClose, onUpdated }) {
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
    <div className={modalOverlay}>
      <section className={`${ui.card} w-[min(420px,100%)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.24)]`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className={sectionTitle}>{tr("settings.changePassword")}</h2>
          <button type="button" onClick={onClose} aria-label={tr("settings.closeChangePassword")} className={`${ui.ghost} h-[34px] w-[34px] p-0`}>x</button>
        </div>

        <div className="mt-[22px]">
          <label className={ui.label}>{tr("settings.newPassword")}</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={ui.input} />

          <label className={`${ui.label} mt-3`}>{tr("settings.confirmNewPassword")}</label>
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={ui.input} />
        </div>

        <div className="min-h-5 text-[13px] text-[var(--sos-danger,#b42318)]">
          {!isLongEnough && password ? tr("settings.passwordLength") : ""}
          {isLongEnough && !isMatching && confirmPassword ? tr("settings.passwordMatch") : ""}
          {status}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className={`${ui.btn} mt-3.5 w-full ${canContinue ? "cursor-pointer opacity-100" : "cursor-not-allowed opacity-[0.58]"}`}
        >
          {isSaving ? tr("common.saving") : tr("settings.continue")}
        </button>
      </section>
    </div>
  );
}

function PasswordUpdatedPanel({ onClose }) {
  const { t: tr } = useTranslation();

  return (
    <div className={modalOverlay}>
      <section className={`${ui.card} w-[min(360px,100%)] p-6 text-center shadow-[0_18px_48px_rgba(0,0,0,0.24)]`}>
        <h2 className={sectionTitle}>{tr("settings.passwordUpdated")}</h2>
        <button type="button" onClick={onClose} className={`${ui.btn} mt-[22px] w-full`}>{tr("common.close")}</button>
      </section>
    </div>
  );
}

function SystemTab({ form, setForm, appearance, setAppearance, timeFormat, setTimeFormat }) {
  const { t: tr, i18n } = useTranslation();
  const options = [
    { id: "light", label: tr("settings.light"), icon: Icon.sun },
    { id: "dark", label: tr("settings.dark"), icon: Icon.moon },
    { id: "system", label: tr("settings.systemTheme"), icon: Icon.panelSoft },
  ];
  const timeOptions = [
    { id: "12h", label: tr("settings.timeFormat12") },
    { id: "24h", label: tr("settings.timeFormat24") },
  ];

  return (
    <div>
      <h2 className={sectionTitle}>{tr("settings.system")}</h2>
      <p className={sectionCopy}>{tr("settings.customizeSystem")}</p>

      <h3 className={groupTitle}>{tr("settings.appearance")}</h3>
      <p className={sectionCopy}>{tr("settings.appearanceCopy")}</p>
      <div className={optionGrid}>
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
              className={`${optionButton} ${on ? selectedBorder : unselectedBorder}`}
            >
              <span className={`flex ${on ? "text-[var(--sos-accent)]" : "text-[var(--sos-text)]"}`}><OptionIcon /></span>
              <span className="text-left">{option.label}</span>
              <span className={`${checkDot} ${on ? "border-[var(--sos-accent)] bg-[var(--sos-accent)]" : "border-[var(--sos-border-light)] bg-transparent"}`}>
                {on && <Icon.check />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="my-[30px] h-px bg-[var(--sos-border)]" />

      <h3 className={groupTitle}>{tr("settings.language")}</h3>
      <p className={sectionCopy}>{tr("settings.languageCopy")}</p>
      <select
        value={i18n.language?.startsWith("pt") ? "pt-BR" : "en"}
        onChange={(e) => {
          const language = e.target.value;
          setForm((current) => ({ ...current, language }));
          void i18n.changeLanguage(language);
          saveLanguage(language);
        }}
        className={`${ui.input} mt-[18px] max-w-[520px]`}
      >
        <option value="en">{tr("language.english")}</option>
        <option value="pt-BR">{tr("language.portuguese")}</option>
      </select>

      <div className="my-[30px] h-px bg-[var(--sos-border)]" />

      <h3 className={groupTitle}>{tr("settings.timeFormat")}</h3>
      <p className={sectionCopy}>{tr("settings.timeFormatCopy")}</p>
      <div className={optionGrid}>
        {timeOptions.map((option) => {
          const on = timeFormat === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTimeFormat(option.id)}
              className={`${optionButtonTwoColumn} ${on ? selectedBorder : unselectedBorder}`}
            >
              <span className="text-left">{option.label}</span>
              <span className={`${checkDot} ${on ? "border-[var(--sos-accent)] bg-[var(--sos-accent)]" : "border-[var(--sos-border-light)] bg-transparent"}`}>
                {on && <Icon.check />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
