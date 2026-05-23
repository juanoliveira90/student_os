import { useEffect, useState } from "react";
import { Icon } from "./icons.jsx";
import { renderMarkdown } from "./markdown.js";
import { getStyles } from "./ui.jsx";

export default function Documents({ docs, setDocs, t }) {
  const s = getStyles(t);
  const [sel, setSel] = useState(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [eContent, setEContent] = useState("");
  const [eTitle, setETitle] = useState("");
  const filtered = docs.filter((d) => d.title.includes(search.toLowerCase()));

  function newDoc() {
    const doc = { id: Date.now(), title: "Untitled note", date: new Date().toLocaleDateString("en-US"), content: "# Untitled note\n\nStart writing..." };
    setDocs((items) => [doc, ...items]);
    setSel(doc);
    setEContent(doc.content);
    setETitle(doc.title);
    setEditing(true);
  }

  function save() {
    if (!sel) return;
    setDocs((items) => items.map((doc) => (doc.id === sel.id ? { ...doc, title: eTitle, content: eContent } : doc)));
    setSel((doc) => ({ ...doc, title: eTitle, content: eContent }));
    setEditing(false);
  }

  function open(doc) {
    setSel(doc);
    setEContent(doc.content);
    setETitle(doc.title);
    setEditing(false);
  }

  useEffect(() => {
    function onKey(e) {
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
    <div style={{ display: "flex", height: "calc(100vh - 72px)" }}>
      <div style={{ width: 300, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, background: t.bgAlt }}>
        <button onClick={newDoc} style={{ ...s.btn, margin: 14, marginBottom: 10 }}>New note</button>
        <div style={{ position: "relative", margin: "0 12px 8px" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: t.textMutedMore }}><Icon.search /></span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes" style={{ ...s.input, paddingLeft: 30, marginBottom: 0 }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((doc) => (
            <div key={doc.id} onClick={() => open(doc)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${t.border}`, background: sel?.id === doc.id ? t.hover : "transparent", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }} onMouseEnter={(e) => { if (sel?.id !== doc.id) e.currentTarget.style.background = t.hover; }} onMouseLeave={(e) => { if (sel?.id !== doc.id) e.currentTarget.style.background = "transparent"; }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: t.accent }}><Icon.file /></span>
                  <span style={{ fontSize: 14, color: t.text, fontWeight: 650 }}>{doc.title}</span>
                </div>
                <div style={{ fontSize: 12, color: t.textMutedMore }}>{doc.date}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setDocs((items) => items.filter((x) => x.id !== doc.id)); if (sel?.id === doc.id) setSel(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMutedMost, flexShrink: 0 }}><Icon.x /></button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: t.bgAlt }}>
        {sel ? (
          <>
            <div style={{ padding: "14px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {editing ? (
                <input value={eTitle} onChange={(e) => setETitle(e.target.value)} style={{ ...s.input, marginBottom: 0, fontSize: 16, flex: 1, marginRight: 12, fontWeight: 750 }} />
              ) : (
                <span style={{ fontSize: 18, color: t.text, fontWeight: 750 }}>{sel.title}</span>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {editing ? <button onClick={save} style={s.btn}>Save</button> : <button onClick={() => { setEditing(true); setEContent(sel.content); setETitle(sel.title); }} style={s.btn}>Edit note</button>}
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
            <span style={{ fontSize: 14 }}>Select a note to read or edit</span>
          </div>
        )}
      </div>
    </div>
  );
}
