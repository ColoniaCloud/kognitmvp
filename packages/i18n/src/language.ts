/**
 * Idiomas soportados y la preferencia guardada del usuario.
 *
 * Vive acá y no en `@kognit/ui/lib/preferences` para no crear un ciclo entre
 * packages: el selector de idioma (que es UI) necesita disparar la carga del
 * bundle del idioma (que es i18n), así que la dependencia tiene que ir en una
 * sola dirección — ui → i18n.
 */
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

const KEY = "kognit:language";

export function getLanguage(): LanguageCode {
  const stored = localStorage.getItem(KEY);
  return (SUPPORTED_LANGUAGES.some((l) => l.code === stored) ? stored : "es") as LanguageCode;
}

export function setLanguage(code: LanguageCode) {
  localStorage.setItem(KEY, code);
}
