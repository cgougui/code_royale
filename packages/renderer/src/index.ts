/**
 * @code-royale/renderer: turns engine Frames into pixels and sounds.
 * Canvas 2D + Web Audio. Depends on the engine's data contract only; knows nothing about React.
 */
export { ArenaRenderer } from "./arena-renderer";
export { ACT_LABELS, VIS, type HudInfo, type ViewOptions } from "./view";
export { drawUnit, TEAM_COLORS, type UnitPose } from "./sprites";
export { sfx } from "./audio";
