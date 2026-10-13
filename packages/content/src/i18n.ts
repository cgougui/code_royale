/**
 * The languages the game speaks. To add one, append its code here: TypeScript then lists
 * every catalog that still needs a translation (see docs/i18n.md).
 */
export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

/** The source language: other locales are checked against it, and it is the fallback. */
export const DEFAULT_LOCALE: Locale = "en";

/** Each language's name, written in that language (for the language picker). */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

