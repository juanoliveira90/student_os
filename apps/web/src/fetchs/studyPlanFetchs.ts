export const studyPlanQueryKey = ["studyPlan"];

function toSubject(subject) {
  return {
    id: subject.id,
    name: subject.name,
    tag: subject.tag || "",
    scheduleBlockId: subject.schedule_block || "",
    progress: 0,
    importance: 3,
    subtasks: (subject.subtasks || []).map((subtask) => ({
      id: subtask.id,
      text: subtask.name,
      name: subtask.name,
      description: subtask.description || "",
      done: false,
    })),
  };
}

async function parseJsonResponse(response, fallback = null) {
  const data = await response.json().catch(() => fallback);

  if (!response.ok || data?.error) {
    throw new Error(data?.message || data?.error || "Study plan request failed");
  }

  return data;
}

export async function fetchStudyPlanSubjects() {
  const response = await fetch("/plan", { credentials: "include" });
  const data = await parseJsonResponse(response, { plans: [] });

  return (data.plans || []).map(toSubject);
}

export function studyPlanQueryOptions(userId) {
  return {
    queryKey: [...studyPlanQueryKey, userId],
    queryFn: fetchStudyPlanSubjects,
    enabled: Boolean(userId),
  };
}

function toSubjectPayload(subject) {
  return {
    id: subject.id,
    name: subject.name,
    tag: subject.tag || null,
    schedule_block: subject.scheduleBlockId || null,
    subtasks: (subject.subtasks || []).map((subtask) => ({
      id: subtask.id,
      name: subtask.name || subtask.text,
      description: subtask.description || "",
    })),
  };
}

export async function postPlanSubject(subject) {
  const response = await fetch("/plan/subject", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toSubjectPayload(subject)),
  });

  return parseJsonResponse(response);
}

export async function putPlanSubject(subject) {
  const response = await fetch("/plan/subject", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: subject.id,
      name: subject.name,
      tag: subject.tag || null,
      schedule_block: subject.scheduleBlockId || null,
    }),
  });

  return parseJsonResponse(response);
}

export async function postSubtask(subjectId, subtask) {
  const response = await fetch("/plan/subtask", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject_id: subjectId,
      subtasks: [
        {
          id: subtask.id,
          name: subtask.name || subtask.text,
          description: subtask.description || "",
        },
      ],
    }),
  });

  return parseJsonResponse(response);
}

export async function putSubtask(subtask) {
  const response = await fetch("/plan/subtask", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: subtask.id,
      name: subtask.name || subtask.text,
      description: subtask.description || "",
    }),
  });

  return parseJsonResponse(response);
}

export async function deleteSubtask(subtaskId) {
  const response = await fetch("/plan/subtask", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: subtaskId })
  });

  return parseJsonResponse(response);
}

export async function deleteSubject(subjectId) {
  const response = await fetch("/plan/subject", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: subjectId })
  });

  return parseJsonResponse(response);
}

export async function saveStudyPlanChanges(changes) {
  for (const subject of changes.createSubjects || []) {
    await postPlanSubject(subject);
  }

  for (const subject of changes.updateSubjects || []) {
    await putPlanSubject(subject);
  }

  for (const item of changes.createSubtasks || []) {
    await postSubtask(item.subjectId, item.subtask);
  }

  for (const subtask of changes.updateSubtasks || []) {
    await putSubtask(subtask);
  }

  for (const subtaskId of changes.deleteSubtasks || []) {
    await deleteSubtask(subtaskId);
  }

  for (const subjectId of changes.deleteSubjects || []) {
    await deleteSubject(subjectId);
  }
}
