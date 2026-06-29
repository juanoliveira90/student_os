import { type MouseEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./icons";
import { renderMarkdown } from "./markdown.js";
import { ui } from "./ui";
import { deleteNote, postNote, putNote } from "../fetchs/notesFetchs";

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

export default function Documents({ docs, setDocs, isLoading, isError, createAction, onCreateActionHandled }: DocumentsProps) {
  const { t: tr } = useTranslation();
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
    <div className="flex h-[calc(100vh-72px)] flex-col overflow-hidden">
      <div className="px-7 pb-5 pt-7">
        <h1 className="m-0 text-[40px] font-semibold leading-[1.1] text-[var(--sos-text)]">{tr("nav.documents.label")}</h1>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-[300px] shrink-0 flex-col border-r border-[var(--sos-border)] bg-[var(--sos-bg-alt)]">
          <button onClick={newDoc} disabled={isCreating} className={`${ui.btn} m-3.5 mb-2.5`}>{isCreating ? tr("documents.creating") : tr("documents.newNote")}</button>
          <div className="relative mx-3 mb-2">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--sos-text-muted-more)]"><Icon.search /></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("documents.searchNotes")} className={`${ui.input} mb-0 pl-[30px]`} />
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && <div className="p-3.5 text-[13px] text-[var(--sos-text-muted-more)]">{tr("documents.loading")}</div>}
            {isError && <div className="p-3.5 text-[13px] text-[var(--sos-accent)]">{tr("documents.loadError")}</div>}
            {filtered.map((doc) => (
              <div key={doc.id} onClick={() => open(doc)} className={`flex cursor-pointer items-start justify-between border-b border-[var(--sos-border)] px-3.5 py-2.5 hover:bg-[var(--sos-hover)] ${sel?.id === doc.id ? "bg-[var(--sos-hover)]" : "bg-transparent"}`}>
                <div>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="text-[var(--sos-accent)]"><Icon.file /></span>
                    <span className="text-[15px] font-[550] text-[var(--sos-text)]">{doc.title}</span>
                  </div>
                  <div className="text-sm text-[var(--sos-text-muted-more)]">{doc.date}</div>
                </div>
                <button onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); remove(doc); }} className="shrink-0 cursor-pointer border-0 bg-transparent text-[var(--sos-text-muted-most)]"><Icon.x /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-[var(--sos-bg-alt)]">
          {sel ? (
            <>
              <div className="flex items-center justify-between border-b border-[var(--sos-border)] px-6 py-3.5">
                {editing ? (
                  <input value={eTitle} onChange={(e) => setETitle(e.target.value)} className={`${ui.input} mb-0 mr-3 flex-1 font-[family:var(--sos-font-display)] text-[28px] font-semibold`} />
                ) : (
                  <span className="font-[family:var(--sos-font-display)] text-[28px] font-semibold text-[var(--sos-text)]">{sel.title}</span>
                )}
                <div className="flex items-center gap-2">
                  {editing ? <button onClick={save} disabled={savingId === sel.id} className={ui.btn}>{savingId === sel.id ? tr("documents.saving") : tr("documents.save")}</button> : <button onClick={() => { setEditing(true); setEContent(sel.content); setETitle(sel.title); }} className={ui.btn}>{tr("documents.editNote")}</button>}
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {editing ? (
                  <textarea value={eContent} onChange={(e) => setEContent(e.target.value)} className="h-full w-full resize-none border-0 bg-transparent font-[inherit] text-[15px] leading-[1.7] text-[var(--sos-text)] outline-none" />
                ) : (
                  <div className="sos-md max-w-[760px] text-[15px] leading-[1.8] text-[var(--sos-text)]" dangerouslySetInnerHTML={{ __html: renderMarkdown(sel.content) }} />
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[var(--sos-text-muted-most)]">
              <Icon.file />
              <span className="text-sm">{tr("documents.selectNote")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
