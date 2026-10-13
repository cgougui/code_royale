import type { ItemKind, UnitType } from "@code-royale/engine";
import type { GoalText, ItemText, UnitText } from "../../types";

export const goals: GoalText = {
  win: "Win the battle",
  survivors: (count) => `Win with ${count}+ fighters alive`,
  flawless: "Nobody on your team falls",
  battleCry: "Make a knight shout a battle cry (hint 1)",
  waves: (count) => `Clear ${count} waves`,
};

export const units: Record<UnitType, UnitText> = {
  knight: {
    name: "Knight",
    description: "Tough melee fighter. Gets close and hits hard.",
    special: { name: "Whirlwind", description: "Spins around, hitting every enemy close by for big damage." },
  },
  archer: {
    name: "Archer",
    description: "Shoots arrows from far away, but is fragile up close.",
    special: { name: "Power Shot", description: "A huge arrow that flies through everyone in its path." },
  },
  scout: {
    name: "Scout",
    description: "Super fast with the biggest detection radius. Can even spot enemies hiding in bushes from far away!",
    special: { name: "Smoke Bomb", description: "Vanishes in a cloud of smoke: invisible and extra fast for 3 seconds. Attacking breaks it." },
  },
  mage: {
    name: "Mage",
    description: "Throws fireballs that also burn enemies nearby.",
    special: { name: "Meteor", description: "Calls a giant meteor that crashes down on a spot." },
  },
  goblin: {
    name: "Goblin",
    description: "Small, quick and sneaky.",
    special: { name: "Frenzy", description: "Gets angry and attacks super fast for a moment." },
  },
  ogre: {
    name: "Ogre",
    description: "A giant. Slow, but each hit hurts a lot.",
    special: { name: "Stomp", description: "Stomps the ground, hurting everyone around." },
  },
};

export const items: Record<ItemKind, ItemText> = {
  potion: { name: "Potion", description: "Heals 60 health." },
  rage: { name: "Rage Gem", description: "Double damage for 8 seconds." },
  shield: { name: "Shield Orb", description: "Blocks the next 60 damage." },
};
