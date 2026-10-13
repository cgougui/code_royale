/**
 * Global rules of the game world: arena size, time step and vision constants.
 * Pure data, shared by the simulation, the renderer and the UI.
 */
import type { ItemKind } from "./protocol";

export const ARENA_W = 960;
export const ARENA_H = 600;
export const WALL = 28; // thickness of the arena wall (units can't go inside)
export const TICKS_PER_SECOND = 20;
export const DT = 1 / TICKS_PER_SECOND;

export const ITEM_INFO: Record<ItemKind, { label: string; description: string }> = {
  potion: { label: "Potion", description: "Heals 60 health." },
  rage: { label: "Rage Gem", description: "Double damage for 8 seconds." },
  shield: { label: "Shield Orb", description: "Blocks the next 60 damage." },
};

export const ITEM_RADIUS = 12;

/** Fighters in a bush can only be spotted by enemies this close… */
export const BUSH_DETECT = 90;
/** …except scouts, who have sharp eyes. */
export const SCOUT_BUSH_DETECT = 170;
/** Attacking from a bush gives you away for this long (seconds). */
export const REVEAL_TIME = 0.8;
