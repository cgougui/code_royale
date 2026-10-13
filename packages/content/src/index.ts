/**
 * @code-royale/content: everything that makes the game a game, as data.
 * Levels (armies, terrain, goals, hints), built-in strategies and the API guide.
 * Depends on the engine's types only; knows nothing about rendering or UI.
 */
export * from "./types";
export { LEVELS, levelById, starsFor } from "./levels";
export * as strategies from "./strategies";
export { starter } from "./strategies";
export { toBattleSetup } from "./setup";
export { API_GROUPS, ME_DOCS, GLOBAL_DOCS, UNIT_DOCS, type ApiDoc, type ApiGroup } from "./api-docs";
