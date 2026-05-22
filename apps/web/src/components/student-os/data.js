export const themes = {
  dark: {
    bg: "#0d0d0d",
    bgAlt: "#141414",
    border: "#1a1a1a",
    borderAlt: "#252525",
    borderLight: "#2a2a2a",
    text: "#ccc",
    textMuted: "#888",
    textMutedMore: "#555",
    textMutedMost: "#333",
    accent: "#e53e3e",
    accentDark: "#cc3333",
    accentLight: "#ff4d4d",
    card: "#141414",
    cardBorder: "#1e1e1e",
    hover: "#1a1a1a",
    select: "#0d0d0d",
  },
  light: {
    bg: "#f5f5f5",
    bgAlt: "#ffffff",
    border: "#e0e0e0",
    borderAlt: "#d0d0d0",
    borderLight: "#c5c5c5",
    text: "#222",
    textMuted: "#666",
    textMutedMore: "#999",
    textMutedMost: "#ccc",
    accent: "#e53e3e",
    accentDark: "#cc3333",
    accentLight: "#ff4d4d",
    card: "#ffffff",
    cardBorder: "#e5e5e5",
    hover: "#f0f0f0",
    select: "#fafafa",
  },
  collosDark: {
    bg: "#121416",
    bgAlt: "#1A1D21",
    border: "#242A30",
    borderAlt: "#303842",
    borderLight: "#3B4652",
    text: "#E4E7EB",
    textMuted: "#94A3B8",
    textMutedMore: "#6F7F91",
    textMutedMost: "#4A5564",
    accent: "#F59E0B",
    accentDark: "#D97706",
    accentLight: "#FBBF24",
    card: "#1A1D21",
    cardBorder: "#2A3138",
    hover: "#20262C",
    select: "#14181C",
  },
  collosLight: {
    bg: "#F8FAF6",
    bgAlt: "#FFFFFF",
    border: "#E1E7DD",
    borderAlt: "#CDD8C8",
    borderLight: "#BDCBB8",
    text: "#1E293B",
    textMuted: "#64748B",
    textMutedMore: "#7F8E72",
    textMutedMost: "#A7B49D",
    accent: "#D97706",
    accentDark: "#B45309",
    accentLight: "#F59E0B",
    card: "#FFFFFF",
    cardBorder: "#E2E8DD",
    hover: "#EEF4EA",
    select: "#F4F7F1",
  },
};

export const THEME_ORDER = ["dark", "light", "collosDark", "collosLight"];

export function getNextTheme(theme) {
  const index = THEME_ORDER.indexOf(theme);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? THEME_ORDER[0];
}

export function isDarkTheme(theme) {
  return theme === "dark" || theme === "collosDark";
}

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const initSchedule = {
  monday: [
    { id: 1, title: "calculus ii", time: "09:00 - 10:30" },
    { id: 2, title: "data structures", time: "11:00 - 12:30" },
    { id: 3, title: "study session", time: "14:00 - 16:00" },
  ],
  tuesday: [{ id: 4, title: "physics lab", time: "10:00 - 13:00" }],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

export const initSubjects = [
  { id: 1, name: "data structures & algorithms", difficulty: "hard", progress: 65, importance: 5, difficultyDots: 4, hoursPerWeek: 10 },
  { id: 2, name: "calculus ii", difficulty: "very hard", progress: 45, importance: 4, difficultyDots: 5, hoursPerWeek: 8 },
  { id: 3, name: "physics", difficulty: "hard", progress: 70, importance: 3, difficultyDots: 4, hoursPerWeek: 6 },
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
  { id: "dashboard", label: "dashboard", key: "1" },
  { id: "schedule", label: "schedule", key: "2" },
  { id: "studyplans", label: "study plans", key: "3" },
  { id: "habits", label: "habits", key: "4" },
  { id: "focustime", label: "focus time", key: "5" },
  { id: "documents", label: "documents", key: "6" },
];

export const PRESETS = [
  { label: "25 min", s: 25 * 60 },
  { label: "45 min", s: 45 * 60 },
  { label: "60 min", s: 60 * 60 },
  { label: "90 min", s: 90 * 60 },
];
