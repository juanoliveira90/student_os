export const themes = {
  dark: {
    bg: "#16201a",
    bgAlt: "#1a261d",
    border: "#2a3a2d",
    borderAlt: "#35493a",
    borderLight: "#425846",
    text: "#eef3ec",
    textMuted: "#b6c4b8",
    textMutedMore: "#869085",
    textMutedMost: "#5b6a5d",
    accent: "#5aa473",
    accentDark: "#43855b",
    accentLight: "#7cc294",
    card: "#1a261d",
    cardBorder: "#2a3a2d",
    cardShadow: "0 10px 28px rgba(0,0,0,0.22)",
    hover: "#223129",
    select: "#16201a",
  },
  light: {
    bg: "#f5f0e8",
    bgAlt: "#efe8dc",
    border: "#e3d9c7",
    borderAlt: "#d6cab3",
    borderLight: "#c8bba1",
    text: "#2a2a24",
    textMuted: "#6b6456",
    textMutedMore: "#938a78",
    textMutedMost: "#c0b6a1",
    accent: "#2f6b3e",
    accentDark: "#234f2e",
    accentLight: "#5a9168",
    card: "#fbf8f2",
    cardBorder: "#e6ddcc",
    cardShadow: "0 10px 28px rgba(42,42,36,0.06)",
    hover: "#ece4d6",
    select: "#fbf8f2",
  },
};

export const THEME_ORDER = ["dark", "light"];
export const APPEARANCE_ORDER = ["dark", "light", "system"];
export const THEME_STORAGE_KEY = "studium_theme";
export const TIME_FORMATS = ["12h", "24h"];
export const TIME_FORMAT_STORAGE_KEY = "studium_time_format";

export function detectSystemTimeFormat() {
  if (typeof Intl === "undefined") return "12h";

  const parts = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).formatToParts(new Date());
  return parts.some((part) => part.type === "dayPeriod") ? "12h" : "24h";
}

export function getStoredTimeFormat() {
  if (typeof window === "undefined") return detectSystemTimeFormat();

  const storedFormat = window.localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
  return TIME_FORMATS.includes(storedFormat) ? storedFormat : detectSystemTimeFormat();
}

export function saveStoredTimeFormat(timeFormat) {
  if (typeof window === "undefined" || !TIME_FORMATS.includes(timeFormat)) return;

  window.localStorage.setItem(TIME_FORMAT_STORAGE_KEY, timeFormat);
}

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

export function applyThemeVariables(themeValues, options = {}) {
  if (typeof document === "undefined") return;

  const style = document.documentElement.style;
  style.background = themeValues.bg;
  style.color = themeValues.text;

  Object.entries(themeValues).forEach(([key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    style.setProperty(`--sos-${cssKey}`, value);
  });

  style.setProperty("--sos-ok", "#4caf50");
  style.setProperty("--sos-danger", themeValues.danger || "#dc2626");
  style.setProperty("--landing-soft", options.landingSoft || themeValues.card);
}

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const productivityData = [];

export const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", description: "Your day at a glance", key: "1" },
  { id: "schedule", label: "Schedule", description: "Classes and study blocks", key: "2" },
  { id: "studyplans", label: "Study Plan", description: "Subjects and weekly goals", key: "3" },
  { id: "documents", label: "Notes", description: "Study documents", key: "4" },
  { id: "settings", label: "Settings", description: "Profile and system", key: "5" },
];

export const PRESETS = [
  { label: "25 min", s: 25 * 60 },
  { label: "45 min", s: 45 * 60 },
  { label: "60 min", s: 60 * 60 },
  { label: "90 min", s: 90 * 60 },
];
