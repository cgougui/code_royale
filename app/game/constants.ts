import type { ItemKind, UnitStats, UnitType } from "./types";

export const ARENA_W = 960;
export const ARENA_H = 600;
export const WALL = 28; // thickness of the arena wall (units can't go inside)
export const TICKS_PER_SECOND = 20;
export const DT = 1 / TICKS_PER_SECOND;

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  knight: {
    label: "Knight",
    emoji: "🛡️",
    hp: 160,
    speed: 72,
    radius: 15,
    range: 10,
    damage: 14,
    cooldown: 0.8,
    special: { name: "Whirlwind", cooldown: 8, description: "Spins around, hitting every enemy close by for big damage." },
    description: "Tough melee fighter. Gets close and hits hard.",
  },
  archer: {
    label: "Archer",
    emoji: "🏹",
    hp: 80,
    speed: 76,
    radius: 13,
    range: 190,
    damage: 11,
    cooldown: 1.0,
    projectile: "arrow",
    special: { name: "Power Shot", cooldown: 7, description: "A huge arrow that flies through everyone in its path." },
    description: "Shoots arrows from far away, but is fragile up close.",
  },
  healer: {
    label: "Healer",
    emoji: "✨",
    hp: 85,
    speed: 70,
    radius: 13,
    range: 130,
    damage: 5,
    cooldown: 1.0,
    projectile: "bolt",
    heal: 14,
    healRange: 150,
    special: { name: "Blessing", cooldown: 10, description: "Heals every ally around the healer at once." },
    description: "Heals friends. Very weak attack.",
  },
  mage: {
    label: "Mage",
    emoji: "🔥",
    hp: 70,
    speed: 64,
    radius: 13,
    range: 170,
    damage: 15,
    cooldown: 1.6,
    projectile: "fireball",
    splash: 45,
    special: { name: "Meteor", cooldown: 10, description: "Calls a giant meteor that crashes down on a spot." },
    description: "Throws fireballs that also burn enemies nearby.",
  },
  goblin: {
    label: "Goblin",
    emoji: "👺",
    hp: 55,
    speed: 88,
    radius: 11,
    range: 8,
    damage: 7,
    cooldown: 0.7,
    special: { name: "Frenzy", cooldown: 9, description: "Gets angry and attacks super fast for a moment." },
    description: "Small, quick and sneaky.",
  },
  ogre: {
    label: "Ogre",
    emoji: "👹",
    hp: 1100,
    speed: 44,
    radius: 30,
    range: 14,
    damage: 34,
    cooldown: 1.6,
    special: { name: "Stomp", cooldown: 6, description: "Stomps the ground, hurting everyone around." },
    description: "A giant. Slow, but each hit hurts a lot.",
  },
};

export const ITEM_INFO: Record<ItemKind, { label: string; description: string }> = {
  potion: { label: "Potion", description: "Heals 60 health." },
  rage: { label: "Rage Gem", description: "Double damage for 8 seconds." },
  shield: { label: "Shield Orb", description: "Blocks the next 60 damage." },
};

export const ITEM_RADIUS = 12;

export const BLUE_NAMES = ["Ace", "Bolt", "Comet", "Dash", "Echo", "Flash", "Gizmo", "Hero", "Iggy", "Jinx", "Kiwi", "Luna"];
export const RED_NAMES = ["Grub", "Snik", "Rotz", "Mogg", "Zug", "Krak", "Blort", "Fang", "Gnash", "Skab", "Vex", "Wort"];
