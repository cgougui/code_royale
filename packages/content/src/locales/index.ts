/**
 * The content text of every locale. Adding a locale to `LOCALES` (../i18n.ts) makes this
 * object fail to type-check until its catalog is added here.
 */
import type { Locale } from "../i18n";
import type { ContentText } from "../types";
import { en } from "./en";
import { fr } from "./fr";

export const CONTENT_TEXT: Record<Locale, ContentText> = { en, fr };
