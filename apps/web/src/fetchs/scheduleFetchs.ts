import { DAY_LABELS } from "../components/student-os/data.js";

export const scheduleQueryKey = ["schedule"];

function createEmptySchedule() {
  return Object.fromEntries(DAY_LABELS.map((day) => [day, []]));
}

function normalizeTime(value) {
  return String(value || "").slice(0, 5);
}

function toSchedule(events) {
  const schedule = createEmptySchedule();

  for (const event of events || []) {
    const day = event.day_of_week;
    if (!schedule[day]) continue;

    schedule[day].push({
      id: event.id,
      title: event.title,
      description: event.description || "",
      start_time: normalizeTime(event.start_time),
      start_period: event.start_period,
      end_time: normalizeTime(event.end_time),
      end_period: event.end_period,
    });
  }

  return schedule;
}

async function parseJsonResponse(response, fallback) {
  const data = await response.json().catch(() => fallback);

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

export async function fetchSchedule() {
  const response = await fetch("/schedule", { credentials: "include" });
  const data = await parseJsonResponse(response, { events: [] });

  return toSchedule(data.events);
}

export function scheduleQueryOptions(userId) {
  return {
    queryKey: [...scheduleQueryKey, userId],
    queryFn: fetchSchedule,
    enabled: Boolean(userId),
  };
}

export async function saveScheduleEvents(events) {
  const response = await fetch("/schedule", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });

  return parseJsonResponse(response, null);
}

export async function deleteScheduleEvents(events) {
  const response = await fetch("/schedule/delete", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });

  return parseJsonResponse(response, null);
}
