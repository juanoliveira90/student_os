export const notesQueryKey = ["notes"];

function formatDate(value) {
  if (!value) return new Date().toLocaleDateString("en-US");

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("en-US");

  return date.toLocaleDateString("en-US");
}

function toNote(note) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    subjectId: note.subject_id || "",
    date: formatDate(note.created_at),
  };
}

async function parseJsonResponse(response, fallback = null) {
  const data = await response.json().catch(() => fallback);

  if (!response.ok || data?.error) {
    throw new Error(data?.message || data?.error || "Notes request failed");
  }

  return data;
}

export async function fetchNotes() {
  const response = await fetch("/notes", { credentials: "include" });
  const data = await parseJsonResponse(response, { notes: [] });

  return (data.notes || []).map(toNote);
}

export function notesQueryOptions(userId) {
  return {
    queryKey: [...notesQueryKey, userId],
    queryFn: fetchNotes,
    enabled: Boolean(userId),
  };
}

function toNotePayload(note) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    subject_id: note.subjectId || null,
  };
}

export async function postNote(note) {
  const response = await fetch("/notes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toNotePayload(note)),
  });

  return parseJsonResponse(response);
}

export async function putNote(note) {
  const response = await fetch("/notes", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toNotePayload(note)),
  });

  return parseJsonResponse(response);
}

export async function deleteNote(noteId) {
  const response = await fetch("/notes", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: noteId }),
  });

  return parseJsonResponse(response);
}
