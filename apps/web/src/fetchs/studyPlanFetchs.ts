export const studyPlanQueryKey = ["studyPlan"];

async function parseJsonResponse(response, fallback = null) {
  const data = await response.json().catch(() => fallback);

  if (!response.ok || data?.error) {
    throw new Error(data?.message || data?.error || "Study plan request failed");
  }

  return data;
}

function toSubjectPayload(subject) {
  return {
    id: subject.id,
    name: subject.name,
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
