import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguage, type LanguageCode } from "./language";

export type Bundle = Record<string, unknown>;
export type Loader = () => Promise<Bundle>;

let loaders: Partial<Record<LanguageCode, Loader>> = {};

/** Une los JSON de un idioma (common + el del scope) en un solo namespace `translation`. */
export async function mergeBundles(
  ...parts: Promise<{ default: Bundle }>[]
): Promise<Bundle> {
  const mods = await Promise.all(parts);
  return Object.assign({}, ...mods.map((m) => m.default));
}

/**
 * Baja el bundle de un idioma y lo registra en i18next. Es idempotente: si el
 * idioma ya está cargado (o es `es`, que viene estático) no hace nada.
 */
export async function loadLanguage(code: LanguageCode): Promise<void> {
  if (code === "es" || i18n.hasResourceBundle(code, "translation")) return;
  const loader = loaders[code];
  if (!loader) return;
  try {
    i18n.addResourceBundle(code, "translation", await loader(), true, true);
  } catch (error) {
    // Si falla la descarga (offline, o un chunk viejo tras un deploy) se sigue en
    // español en vez de romper la pantalla: i18next cae al fallbackLng solo.
    console.error(`[i18n] no se pudo cargar el idioma "${code}"`, error);
  }
}

/** Cambia el idioma activo, bajando su bundle antes para no mostrar un flash en español. */
export async function changeLanguage(code: LanguageCode): Promise<void> {
  await loadLanguage(code);
  await i18n.changeLanguage(code);
}

/**
 * Inicializa i18next con el idioma guardado ya cargado. Cada app llama a esto desde
 * su wrapper de scope (`@kognit/i18n/site` o `@kognit/i18n/app`), que le pasa el
 * bundle español estático y los loaders de los otros 9 idiomas — así el sitio nunca
 * empaqueta el texto de la app ni al revés.
 */
export async function createI18n(esBundle: Bundle, languageLoaders: Partial<Record<LanguageCode, Loader>>) {
  loaders = languageLoaders;
  const lng = getLanguage();
  await i18n.use(initReactI18next).init({
    resources: { es: { translation: esBundle } },
    lng,
    fallbackLng: "es",
    interpolation: { escapeValue: false },
  });
  await loadLanguage(lng);
  return i18n;
}

export default i18n;
