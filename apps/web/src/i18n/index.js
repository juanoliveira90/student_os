import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/common.json";
import ptBR from "./locales/pt-BR/common.json";

export const LANGUAGE_STORAGE_KEY = "student_os_language";
export const SUPPORTED_LANGUAGES = ["en", "pt-BR"];

export function detectBrowserLanguage() {
  if (typeof window === "undefined") return "en";

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const match = browserLanguages.find((language) => {
    const value = String(language || "").toLowerCase();
    return value.startsWith("en") || value.startsWith("pt");
  });

  if (!match) return "en";
  return String(match).toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

export function getInitialLanguage() {
  if (typeof window === "undefined") return "en";

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : detectBrowserLanguage();
}

export function saveLanguage(language) {
  if (typeof window === "undefined" || !SUPPORTED_LANGUAGES.includes(language)) return;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en },
    "pt-BR": { common: ptBR },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
