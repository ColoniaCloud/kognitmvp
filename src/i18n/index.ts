import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";
import en from "./locales/en.json";
import pt from "./locales/pt.json";
import it from "./locales/it.json";
import hi from "./locales/hi.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import zhCN from "./locales/zh-CN.json";
import zhTW from "./locales/zh-TW.json";
import ja from "./locales/ja.json";
import { getLanguage } from "@/lib/preferences";

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    pt: { translation: pt },
    it: { translation: it },
    hi: { translation: hi },
    fr: { translation: fr },
    de: { translation: de },
    "zh-CN": { translation: zhCN },
    "zh-TW": { translation: zhTW },
    ja: { translation: ja },
  },
  lng: getLanguage(),
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

export default i18n;
