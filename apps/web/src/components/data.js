export const themes = {
  dark: {
    bg: "#1c1a18",
    bgAlt: "#24211f",
    border: "#302c28",
    borderAlt: "#403a34",
    borderLight: "#4a433d",
    text: "#f3eee8",
    textMuted: "#c2b8ae",
    textMutedMore: "#8f857c",
    textMutedMost: "#625950",
    accent: "#f28c28",
    accentDark: "#c86815",
    accentLight: "#ffad5c",
    card: "#24211f",
    cardBorder: "#342f2a",
    hover: "#2b2723",
    select: "#191715",
  },
  light: {
    bg: "#f7f4ef",
    bgAlt: "#fffdf9",
    border: "#e6ded4",
    borderAlt: "#d8cec1",
    borderLight: "#c9bdae",
    text: "#25211d",
    textMuted: "#6f665d",
    textMutedMore: "#968b80",
    textMutedMost: "#c8beb2",
    accent: "#e77918",
    accentDark: "#b85b0f",
    accentLight: "#ff9d42",
    card: "#fffdf9",
    cardBorder: "#e9e1d7",
    hover: "#eee8df",
    select: "#fbf8f3",
  },
};

export const THEME_ORDER = ["dark", "light"];
export const APPEARANCE_ORDER = ["dark", "light", "system"];
export const THEME_STORAGE_KEY = "studium_theme";

export function getSystemTheme() {
  if (typeof window === "undefined") return "dark";

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getResolvedTheme(appearance, systemTheme = getSystemTheme()) {
  return appearance === "system" ? systemTheme : appearance;
}

export function getStoredAppearance() {
  if (typeof window === "undefined") return "dark";

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return APPEARANCE_ORDER.includes(storedTheme) ? storedTheme : "dark";
}

export function getStoredTheme() {
  return getResolvedTheme(getStoredAppearance());
}

export function saveStoredTheme(theme) {
  if (typeof window === "undefined" || !APPEARANCE_ORDER.includes(theme)) return;

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function getNextTheme(theme) {
  const index = THEME_ORDER.indexOf(theme);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? THEME_ORDER[0];
}

export function isDarkTheme(theme) {
  return theme === "dark";
}

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const productivityData = [];

export const NAV_ITEMS = [
  { id: "dashboard", label: "Home", description: "Your day at a glance", key: "1" },
  { id: "schedule", label: "Schedule", description: "Classes and study blocks", key: "2" },
  { id: "studyplans", label: "Study Plan", description: "Subjects and weekly goals", key: "3" },
  { id: "habits", label: "Habits", description: "Daily routines", key: "4" },
  { id: "focustime", label: "Focus", description: "Timer and sessions", key: "5" },
  { id: "documents", label: "Notes", description: "Study documents", key: "6" },
  { id: "settings", label: "Settings", description: "Profile and system", key: "7" },
];

export const PRESETS = [
  { label: "25 min", s: 25 * 60 },
  { label: "45 min", s: 45 * 60 },
  { label: "60 min", s: 60 * 60 },
  { label: "90 min", s: 90 * 60 },
];
