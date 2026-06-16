import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../icons";
import { renderMarkdown } from "../markdown.js";
import { getStyles } from "../ui";
import { deleteNote, postNote, putNote } from "../../fetchs/notesFetchs";

type Theme = Record<string, string>;

type Note = {
  id: string;
  title: string;
  date: string;
  content: string;
};

type DocumentsProps = {
  docs: Note[];
  setDocs: (value: Note[] | ((items: Note[]) => Note[])) => void;
  isLoading: boolean;
  isError: boolean;
  createAction?: { id: number; type: string } | null;
  onCreateActionHandled?: () => void;
  t: Theme;
};

export default function Documents({ docs, setDocs, isLoading, isError, createAction, onCreateActionHandled, t }: DocumentsProps) {
  const { t: tr } = useTranslation();
  const s = getStyles(t);
  const [sel, setSel] = useState<Note | null>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [eContent, setEContent] = useState("");
  const [eTitle, setETitle] = useState("");
  const [savingId, setSavingId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const handledCreateActionId = useRef<number | null>(null);
  const filtered = docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));

  async function newDoc() {
    if (isCreating) return;

    const doc = { id: crypto.randomUUID(), title: tr("documents.untitledTitle"), date: new Date().toLocaleDateString("en-US"), content: tr("documents.untitledContent") };
    setIsCreating(true);

    try {
      await postNote(doc);
      setDocs((items) => [doc, ...items]);
      setSel(doc);
      setEContent(doc.content);
      setETitle(doc.title);
      setEditing(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  }

  async function save() {
    if (!sel || savingId) return;

    const updatedDoc = { ...sel, title: eTitle, content: eContent };
    setSavingId(sel.id);

    try {
      await putNote(updatedDoc);
      setDocs((items) => items.map((doc) => (doc.id === sel.id ? updatedDoc : doc)));
      setSel(updatedDoc);
      setEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingId("");
    }
  }

  function open(doc: Note) {
    setSel(doc);
    setEContent(doc.content);
    setETitle(doc.title);
    setEditing(false);
  }

  async function remove(doc: Note) {
    try {
      await deleteNote(doc.id);
      setDocs((items) => items.filter((x) => x.id !== doc.id));
      if (sel?.id === doc.id) setSel(null);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!createAction) return;
    if (handledCreateActionId.current === createAction.id) return;

    handledCreateActionId.current = createAction.id;
    if (createAction.type === "note") void newDoc();
    onCreateActionHandled?.();
  }, [createAction?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editing) save();
      }
      if (e.key === "Escape" && editing) setEditing(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, eContent, eTitle, sel]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 72px)", overflow: "hidden" }}>
      <div style={{ padding: "28px 28px 20px" }}>
        <h1 style={{ fontSize: 40, lineHeight: 1.1, fontWeight: 600, color: t.text, margin: 0 }}>{tr("nav.documents.label")}</h1>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ width: 300, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, background: t.bgAlt }}>
        <button onClick={newDoc} disabled={isCreating} style={{ ...s.btn, margin: 14, marginBottom: 10, opacity: isCreating ? 0.65 : 1 }}>{isCreating ? tr("documents.creating") : tr("documents.newNote")}</button>
        <div style={{ position: "relative", margin: "0 12px 8px" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: t.textMutedMore }}><Icon.search /></span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("documents.searchNotes")} style={{ ...s.input, paddingLeft: 30, marginBottom: 0 }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {isLoading && <div style={{ padding: 14, color: t.textMutedMore, fontSize: 13 }}>{tr("documents.loading")}</div>}
          {isError && <div style={{ padding: 14, color: t.accent, fontSize: 13 }}>{tr("documents.loadError")}</div>}
          {filtered.map((doc) => (
            <div key={doc.id} onClick={() => open(doc)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${t.border}`, background: sel?.id === doc.id ? t.hover : "transparent", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }} onMouseEnter={(e) => { if (sel?.id !== doc.id) e.currentTarget.style.background = t.hover; }} onMouseLeave={(e) => { if (sel?.id !== doc.id) e.currentTarget.style.background = "transparent"; }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: t.accent }}><Icon.file /></span>
                  <span style={{ fontSize: 15, color: t.text, fontWeight: 550 }}>{doc.title}</span>
                </div>
                <div style={{ fontSize: 14, color: t.textMutedMore }}>{doc.date}</div>
              </div>
              <button onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); remove(doc); }} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost, flexShrink: 0 }}><Icon.x /></button>
            </div>
          ))}
        </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: t.bgAlt }}>
        {sel ? (
          <>
            <div style={{ padding: "14px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {editing ? (
                <input value={eTitle} onChange={(e) => setETitle(e.target.value)} style={{ ...s.input, marginBottom: 0, fontSize: 28, flex: 1, marginRight: 12, fontWeight: 600, fontFamily: "var(--sos-font-display)" }} />
              ) : (
                <span style={{ fontSize: 28, color: t.text, fontWeight: 600, fontFamily: "var(--sos-font-display)" }}>{sel.title}</span>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {editing ? <button onClick={save} disabled={savingId === sel.id} style={{ ...s.btn, opacity: savingId === sel.id ? 0.65 : 1 }}>{savingId === sel.id ? tr("documents.saving") : tr("documents.save")}</button> : <button onClick={() => { setEditing(true); setEContent(sel.content); setETitle(sel.title); }} style={s.btn}>{tr("documents.editNote")}</button>}
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
              {editing ? (
                <textarea value={eContent} onChange={(e) => setEContent(e.target.value)} style={{ width: "100%", height: "100%", background: "none", border: "none", outline: "none", color: t.text, fontSize: 15, lineHeight: 1.7, resize: "none", fontFamily: "inherit" }} />
              ) : (
                <div className="sos-md" style={{ color: t.text, fontSize: 15, lineHeight: 1.8, maxWidth: 760 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(sel.content) }} />
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: t.textMutedMost }}>
            <Icon.file />
            <span style={{ fontSize: 14 }}>{tr("documents.selectNote")}</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
