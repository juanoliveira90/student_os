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
export const THEME_STORAGE_KEY = "student_os_theme";

export function getStoredTheme() {
  if (typeof window === "undefined") return "dark";

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_ORDER.includes(storedTheme) ? storedTheme : "dark";
}

export function saveStoredTheme(theme) {
  if (typeof window === "undefined" || !THEME_ORDER.includes(theme)) return;

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

export const initSchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

export const initSubjects = [
  { id: 1, name: "data structures & algorithms", progress: 65, importance: 5, scheduleBlockId: "", subtasks: [{ id: 101, text: "binary tree traversals", done: false }, { id: 102, text: "hash table exercises", done: true }] },
  { id: 2, name: "calculus ii", progress: 45, importance: 4, scheduleBlockId: "", subtasks: [{ id: 201, text: "integration by parts", done: false }, { id: 202, text: "series convergence practice", done: false }] },
  { id: 3, name: "physics", progress: 70, importance: 3, scheduleBlockId: "", subtasks: [{ id: 301, text: "kinematics problem set", done: true }, { id: 302, text: "electric fields review", done: false }] },
];

export const initHabits = [
  { id: 1, name: "morning workout", category: "health", streak: 15, done: true, week: [1, 1, 1, 0, 1, 1, 1] },
  { id: 2, name: "read 30 minutes", category: "learning", streak: 22, done: true, week: [1, 1, 1, 1, 1, 1, 1] },
  { id: 3, name: "code practice", category: "skills", streak: 8, done: false, week: [1, 1, 0, 1, 1, 1, 0] },
  { id: 4, name: "meditation 10min", category: "mindfulness", streak: 5, done: false, week: [1, 0, 1, 1, 1, 0, 0] },
];

export const initTasks = [
  { id: 1, text: "read 30min", done: true },
  { id: 2, text: "study 6 hours", done: false },
  { id: 3, text: "exercise 45min", done: true },
];

export const initDocs = [
  {
    id: 1,
    title: "calculus notes",
    date: "5/15/2024",
    content: "# calculus ii - week 3 notes\n\n## integration by parts\n\nFormula: **int u dv = uv - int v du**\n\nChoose u and dv using **LIATE** (Logarithmic, Inverse trig, Algebraic, Trig, Exponential).\n\n```\nint x*e^x dx\n  u = x,    dv = e^x dx\n  du = dx,  v  = e^x\n  -> x*e^x - int e^x dx = x*e^x - e^x + C\n```\n\n## key reminders\n\n- Always add + C for indefinite integrals\n- Check by differentiating the result\n- Practice the trig substitution identities",
  },
  {
    id: 2,
    title: "data structures summary",
    date: "5/14/2024",
    content: "# data structures - cheat sheet\n\n## big-o complexity\n\n| structure | access | search | insert | delete |\n|-----------|--------|--------|--------|--------|\n| array | O(1) | O(n) | O(n) | O(n) |\n| linked list | O(n) | O(n) | O(1) | O(1) |\n| hash map | O(1) | O(1) | O(1) | O(1) |\n| bst | O(log n) | O(log n) | O(log n) | O(log n) |\n\n## trees\n\n- **BST**: left < root < right\n- **AVL**: self-balancing BST, height diff <= 1\n- **Heap**: parent <= children (min-heap)\n\n## graph algorithms\n\n- BFS - shortest path in unweighted graph\n- DFS - cycle detection, topological sort\n- Dijkstra - shortest path weighted graph",
  },
];

export const productivityData = [6.5, 5, 8, 6, 4, 2.5, 2];

export const NAV_ITEMS = [
  { id: "dashboard", label: "Home", description: "Your day at a glance", key: "1" },
  { id: "schedule", label: "Schedule", description: "Classes and study blocks", key: "2" },
  { id: "studyplans", label: "Study Plan", description: "Subjects and weekly goals", key: "3" },
  { id: "habits", label: "Habits", description: "Daily routines", key: "4" },
  { id: "focustime", label: "Focus", description: "Timer and sessions", key: "5" },
  { id: "documents", label: "Notes", description: "Study documents", key: "6" },
];

export const PRESETS = [
  { label: "25 min", s: 25 * 60 },
  { label: "45 min", s: 45 * 60 },
  { label: "60 min", s: 60 * 60 },
  { label: "90 min", s: 90 * 60 },
];
