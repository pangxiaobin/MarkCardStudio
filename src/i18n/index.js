import { createI18n } from "vue-i18n";
import { computed, readonly, ref } from "vue";
import enUS from "./en-US.js";
import zhCN from "./zh-CN.js";

const messages = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

const LANGUAGE_PREFERENCE_KEY = "markcard_studio_language_preference_v1";
const APPEARANCE_PREFERENCE_KEY = "markcard_studio_appearance_preference_v1";
const supportedLocales = ["zh-CN", "en-US"];

function getSystemLocale() {
  if (typeof navigator === "undefined") return "en-US";
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((language) => language?.toLowerCase().startsWith("zh")) ? "zh-CN" : "en-US";
}

function resolveLocale(preference) {
  return supportedLocales.includes(preference) ? preference : getSystemLocale();
}

function readPreference(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preferences still apply for the current session when storage is unavailable.
  }
}

const storedLanguagePreference = readPreference(LANGUAGE_PREFERENCE_KEY, "system");
const storedAppearancePreference = readPreference(APPEARANCE_PREFERENCE_KEY, "system");
const languagePreference = ref(
  [...supportedLocales, "system"].includes(storedLanguagePreference) ? storedLanguagePreference : "system",
);
const appearancePreference = ref(
  ["system", "light", "dark"].includes(storedAppearancePreference) ? storedAppearancePreference : "system",
);

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale(languagePreference.value),
  fallbackLocale: "en-US",
  messages,
});

function resolveAppearance(preference) {
  if (preference === "light" || preference === "dark") return preference;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyAppearance() {
  const appearance = resolveAppearance(appearancePreference.value);
  document.documentElement.classList.toggle("dark", appearance === "dark");
  document.documentElement.style.colorScheme = appearance;
}

function applyLanguage() {
  const locale = resolveLocale(languagePreference.value);
  i18n.global.locale.value = locale;
  document.documentElement.lang = locale;
}

export function useAppPreferences() {
  const resolvedLocale = computed(() => resolveLocale(languagePreference.value));
  const resolvedAppearance = computed(() => resolveAppearance(appearancePreference.value));

  function setLanguagePreference(preference) {
    languagePreference.value = supportedLocales.includes(preference) ? preference : "system";
    writePreference(LANGUAGE_PREFERENCE_KEY, languagePreference.value);
    applyLanguage();
  }

  function setAppearancePreference(preference) {
    appearancePreference.value = ["system", "light", "dark"].includes(preference) ? preference : "system";
    writePreference(APPEARANCE_PREFERENCE_KEY, appearancePreference.value);
    applyAppearance();
  }

  return {
    languagePreference: readonly(languagePreference),
    appearancePreference: readonly(appearancePreference),
    resolvedLocale,
    resolvedAppearance,
    setLanguagePreference,
    setAppearancePreference,
  };
}

export function initializeAppPreferences() {
  applyLanguage();
  applyAppearance();

  const colorScheme = window.matchMedia?.("(prefers-color-scheme: dark)");
  colorScheme?.addEventListener?.("change", () => {
    if (appearancePreference.value === "system") applyAppearance();
  });

  window.addEventListener?.("languagechange", () => {
    if (languagePreference.value === "system") applyLanguage();
  });
}
