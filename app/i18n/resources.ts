/**
 * The UI text of every locale: one JSON file per language in ./locales.
 * English is the source: every other catalog must have its keys (TypeScript checks it,
 * app/test/i18n.test.ts checks the rest: no extra keys, same placeholders, all plural forms).
 */
import type { Locale } from "@code-royale/content";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

export type UiCatalog = typeof en;

export const UI_TEXT: Record<Locale, UiCatalog> = { en, fr };
