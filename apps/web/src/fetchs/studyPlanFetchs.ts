import { apiUrl } from "./apiUrl";

export const studyPlanQueryKey = ["studyPlan"];

function toSubject(subject) {
  return {
    id: subject.id,
    studyPlanId: subject.study_plan_id || subject.studyPlanId || "",
    studyPlanName: subject.studyPlanName || "",
    studyPlanDay: subject.studyPlanDay || "",
    studyPlanStartTime: subject.studyPlanStartTime || "",
    studyPlanStartPeriod: subject.studyPlanStartPeriod || "",
    studyPlanEndTime: subject.studyPlanEndTime || "",
    studyPlanEndPeriod: subject.studyPlanEndPeriod || "",
    studyPlanScheduleBlockId: subject.studyPlanScheduleBlockId || "",
    name: subject.name,
    description: subject.description || "",
    tag: subject.tag || "",
    scheduleBlockId: subject.schedule_block || "",
    progress: 0,
    importance: 3,
    subtasks: (subject.subtasks || []).map((subtask) => ({
      id: subtask.id,
      text: subtask.name,
      name: subtask.name,
      description: subtask.description || "",
      done: Boolean(subtask.done),
    })),
  };
}

function toStudyPlanPlaceholder(plan) {
  return {
    id: `plan:${plan.id}`,
    isStudyPlanPlaceholder: true,
    studyPlanId: plan.id,
    studyPlanName: plan.name,
    studyPlanDay: plan.day_of_week || "",
    studyPlanStartTime: plan.start_time || "",
    studyPlanStartPeriod: plan.start_period || "",
    studyPlanEndTime: plan.end_time || "",
    studyPlanEndPeriod: plan.end_period || "",
    studyPlanScheduleBlockId: plan.schedule_block || "",
    name: plan.name,
    tag: "",
    scheduleBlockId: "",
    progress: 0,
    importance: 3,
    subtasks: [],
  };
}

function normalizePlanItem(item) {
  if (!Array.isArray(item.subjects)) return [toSubject(item)];

  if (item.subjects.length === 0) return [toStudyPlanPlaceholder(item)];

  return item.subjects.map((subject) => toSubject({
    ...subject,
    studyPlanName: item.name,
    studyPlanDay: item.day_of_week || "",
    studyPlanStartTime: item.start_time || "",
    studyPlanStartPeriod: item.start_period || "",
    studyPlanEndTime: item.end_time || "",
    studyPlanEndPeriod: item.end_period || "",
    studyPlanScheduleBlockId: item.schedule_block || "",
  }));
}

async function parseJsonResponse(response, fallback = null) {
  const data = await response.json().catch(() => fallback);

  if (!response.ok || data?.error) {
    throw new Error(data?.message || data?.error || "Study plan request failed");
  }

  return data;
}

export async function fetchStudyPlanSubjects() {
  const response = await fetch(apiUrl("/plan"), { credentials: "include" });
  const data = await parseJsonResponse(response, { plans: [] });

  return (data.plans || []).flatMap(normalizePlanItem);
}

function toStudyPlanPayload(plan) {
  return {
    id: plan.id || plan.studyPlanId,
    name: plan.name || plan.studyPlanName,
    day_of_week: plan.day || plan.studyPlanDay || null,
    start_time: plan.startTime || plan.studyPlanStartTime || null,
    start_period: plan.startPeriod || plan.studyPlanStartPeriod || null,
    end_time: plan.endTime || plan.studyPlanEndTime || null,
    end_period: plan.endPeriod || plan.studyPlanEndPeriod || null,
    schedule_block: plan.scheduleBlockId || plan.studyPlanScheduleBlockId || null,
  };
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
    study_plan_id: subject.studyPlanId || null,
    name: subject.name,
    description: subject.description || null,
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
  const response = await fetch(apiUrl("/plan/subject"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toSubjectPayload(subject)),
  });

  return parseJsonResponse(response);
}

export async function putPlanSubject(subject) {
  const response = await fetch(apiUrl("/plan/subject"), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: subject.id,
      study_plan_id: subject.studyPlanId || null,
      name: subject.name,
      description: subject.description || null,
      tag: subject.tag || null,
      schedule_block: subject.scheduleBlockId || null,
    }),
  });

  return parseJsonResponse(response);
}

export async function postSubtask(subjectId, subtask) {
  const response = await fetch(apiUrl("/plan/subtask"), {
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
  const response = await fetch(apiUrl("/plan/subtask"), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: subtask.id,
      name: subtask.name || subtask.text,
      description: subtask.description || "",
      done: Boolean(subtask.done),
    }),
  });

  return parseJsonResponse(response);
}

export async function deleteSubtask(subtaskId) {
  const response = await fetch(apiUrl("/plan/subtask"), {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: subtaskId })
  });

  return parseJsonResponse(response);
}

export async function deleteSubject(subjectId) {
  const response = await fetch(apiUrl("/plan/subject"), {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: subjectId })
  });

  return parseJsonResponse(response);
}

export async function postStudyPlan(plan) {
  const response = await fetch(apiUrl("/plan"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toStudyPlanPayload(plan)),
  });

  return parseJsonResponse(response);
}

export async function putStudyPlan(plan) {
  const response = await fetch(apiUrl("/plan"), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toStudyPlanPayload(plan)),
  });

  return parseJsonResponse(response);
}

export async function deleteStudyPlan(planId) {
  const response = await fetch(apiUrl("/plan"), {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: planId })
  });

  return parseJsonResponse(response);
}

export async function saveStudyPlanChanges(changes) {
  for (const plan of changes.createStudyPlans || []) {
    await postStudyPlan(plan);
  }

  for (const plan of changes.updateStudyPlans || []) {
    await putStudyPlan(plan);
  }

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

  for (const planId of changes.deleteStudyPlans || []) {
    await deleteStudyPlan(planId);
  }
}
