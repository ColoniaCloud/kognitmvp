import esCommon from "./locales/es/common.json";
import esApp from "./locales/es/app.json";
import { createI18n, mergeBundles, type Loader } from "./core";
import type { LanguageCode } from "./language";

/** Loaders del scope "app": cada idioma baja su `common` + su `app` en un chunk aparte. */
const loaders: Record<Exclude<LanguageCode, "es">, Loader> = {
  en: () => mergeBundles(import("./locales/en/common.json"), import("./locales/en/app.json")),
  pt: () => mergeBundles(import("./locales/pt/common.json"), import("./locales/pt/app.json")),
  it: () => mergeBundles(import("./locales/it/common.json"), import("./locales/it/app.json")),
  hi: () => mergeBundles(import("./locales/hi/common.json"), import("./locales/hi/app.json")),
  fr: () => mergeBundles(import("./locales/fr/common.json"), import("./locales/fr/app.json")),
  de: () => mergeBundles(import("./locales/de/common.json"), import("./locales/de/app.json")),
  "zh-CN": () => mergeBundles(import("./locales/zh-CN/common.json"), import("./locales/zh-CN/app.json")),
  "zh-TW": () => mergeBundles(import("./locales/zh-TW/common.json"), import("./locales/zh-TW/app.json")),
  ja: () => mergeBundles(import("./locales/ja/common.json"), import("./locales/ja/app.json")),
};

export const initI18n = () => createI18n({ ...esCommon, ...esApp }, loaders);

export { changeLanguage, loadLanguage } from "./core";
export { default } from "./core";
export { SUPPORTED_LANGUAGES, getLanguage, setLanguage, type LanguageCode } from "./language";
