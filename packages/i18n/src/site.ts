import esCommon from "./locales/es/common.json";
import esSite from "./locales/es/site.json";
import { createI18n, mergeBundles, type Loader } from "./core";
import type { LanguageCode } from "./language";

/** Loaders del scope "site": cada idioma baja su `common` + su `site` en un chunk aparte. */
const loaders: Record<Exclude<LanguageCode, "es">, Loader> = {
  en: () => mergeBundles(import("./locales/en/common.json"), import("./locales/en/site.json")),
  pt: () => mergeBundles(import("./locales/pt/common.json"), import("./locales/pt/site.json")),
  it: () => mergeBundles(import("./locales/it/common.json"), import("./locales/it/site.json")),
  hi: () => mergeBundles(import("./locales/hi/common.json"), import("./locales/hi/site.json")),
  fr: () => mergeBundles(import("./locales/fr/common.json"), import("./locales/fr/site.json")),
  de: () => mergeBundles(import("./locales/de/common.json"), import("./locales/de/site.json")),
  "zh-CN": () => mergeBundles(import("./locales/zh-CN/common.json"), import("./locales/zh-CN/site.json")),
  "zh-TW": () => mergeBundles(import("./locales/zh-TW/common.json"), import("./locales/zh-TW/site.json")),
  ja: () => mergeBundles(import("./locales/ja/common.json"), import("./locales/ja/site.json")),
};

export const initI18n = () => createI18n({ ...esCommon, ...esSite }, loaders);

export { changeLanguage, loadLanguage } from "./core";
export { default } from "./core";
export { SUPPORTED_LANGUAGES, getLanguage, setLanguage, type LanguageCode } from "./language";
