/**
 * @code-royale/content: everything that makes the game a game, as data.
 * Levels (armies, terrain, goals, hints), built-in strategies and the API guide,
 * in every supported language. Depends on the engine's types only; knows nothing about rendering or UI.
 */
export * from "./types";
export { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, isLocale, type Locale } from "./i18n";
export { LEVELS, levelById, starsFor } from "./levels";
export { contentFor, isStarterCode, type Content } from "./content";
export type { ApiGroupId, ApiItemName } from "./api-docs";
export { toBattleSetup } from "./setup";
