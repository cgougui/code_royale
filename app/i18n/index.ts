/**
 * The app's i18next instance. Importing this module sets it up, synchronously:
 * every catalog is bundled, so the first render is already in the right language.
 *
 * Language choice: what the player picked last (localStorage), else the browser's
 * languages ("fr-CA" → "fr"), else English.
 */
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, LOCALES } from "@code-royale/content";
import { UI_TEXT } from "./resources";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(
      LOCALES.map((locale) => [locale, { translation: UI_TEXT[locale] }]),
    ),
    supportedLngs: LOCALES,
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    fallbackLng: DEFAULT_LOCALE,
    initAsync: false,
    // React already escapes what it renders.
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "code-royale:locale",
      caches: ["localStorage"],
    },
  });

export default i18n;
export * from "./hooks";
