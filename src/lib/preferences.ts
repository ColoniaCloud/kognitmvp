export const SUPPORTED_LANGUAGES = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const KEYS = {
  darkMode: "kognit:dark-mode",
  sound: "kognit:sound-enabled",
  vibration: "kognit:vibration-enabled",
  language: "kognit:language",
  calmAnchorPhrase: "kognit:calm-anchor-phrase",
  proTrialJoined: "kognit:pro-trial-joined",
  proTrialSeen: "kognit:pro-trial-seen",
} as const;

export function getDarkMode(): boolean {
  return localStorage.getItem(KEYS.darkMode) === "1";
}

export function setDarkMode(enabled: boolean) {
  localStorage.setItem(KEYS.darkMode, enabled ? "1" : "0");
  document.documentElement.classList.toggle("dark", enabled);
}

export function applyStoredDarkMode() {
  document.documentElement.classList.toggle("dark", getDarkMode());
}

export function getSoundEnabled(): boolean {
  return localStorage.getItem(KEYS.sound) === "1";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(KEYS.sound, enabled ? "1" : "0");
}

export function getVibrationEnabled(): boolean {
  return localStorage.getItem(KEYS.vibration) !== "0";
}

export function setVibrationEnabled(enabled: boolean) {
  localStorage.setItem(KEYS.vibration, enabled ? "1" : "0");
}

export function getLanguage(): LanguageCode {
  const stored = localStorage.getItem(KEYS.language);
  return (SUPPORTED_LANGUAGES.some(l => l.code === stored) ? stored : "es") as LanguageCode;
}

export function setLanguage(code: LanguageCode) {
  localStorage.setItem(KEYS.language, code);
}

export function getCalmAnchorPhrase(): string {
  return localStorage.getItem(KEYS.calmAnchorPhrase) ?? "";
}

export function setCalmAnchorPhrase(phrase: string) {
  localStorage.setItem(KEYS.calmAnchorPhrase, phrase);
}

/**
 * Modal del programa de testers (Pro gratis por 6 meses). Se muestra una vez por
 * sesión del navegador (sessionStorage) para no interrumpir en cada navegación, y deja
 * de aparecer para siempre (localStorage) una vez que el usuario acepta sumarse.
 */
export function hasJoinedProTrial(): boolean {
  return localStorage.getItem(KEYS.proTrialJoined) === "1";
}

export function markProTrialJoined() {
  localStorage.setItem(KEYS.proTrialJoined, "1");
}

export function hasSeenProTrialThisSession(): boolean {
  return sessionStorage.getItem(KEYS.proTrialSeen) === "1";
}

export function markProTrialSeenThisSession() {
  sessionStorage.setItem(KEYS.proTrialSeen, "1");
}
