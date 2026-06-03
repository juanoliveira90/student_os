import { apiUrl } from "./apiUrl";

function getServerMessage(data) {
  if (!data) return "";
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return "";
}

async function parseJsonResponse(response) {
  const data = await response.json().catch(() => null);
  const responseMessage = getServerMessage(data);

  if (!response.ok || data?.error) {
    throw new Error(responseMessage || "Something went wrong. Please try again.");
  }

  return data;
}

export async function getAuthenticatedUser() {
  const response = await fetch(apiUrl("/auth/me"), { credentials: "include" });
  const data = await parseJsonResponse(response);

  return data.user;
}

export async function loginWithEmail(credentials) {
  const response = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    credentials: "include",
  });

  return parseJsonResponse(response);
}

export async function registerWithEmail(account) {
  const response = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
    credentials: "include",
  });

  return parseJsonResponse(response);
}

export async function logout() {
  const response = await fetch(apiUrl("/auth/logout"), {
    method: "POST",
    credentials: "include",
  });

  return parseJsonResponse(response);
}

export async function updateProfile(name) {
  const response = await fetch(apiUrl("/auth/profile"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    credentials: "include",
  })

  return parseJsonResponse(response)
}

export async function updatePassword(new_password) {
  const response = await fetch(apiUrl("/auth/password"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_password }),
    credentials: "include",
  })

  return parseJsonResponse(response)
}
