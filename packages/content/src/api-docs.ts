/**
 * The kid-facing API reference (guide + editor autocomplete): which commands exist, grouped.
 * Names are code and never translated; titles, usages and descriptions live in the locales.
 * Groups and items are shown in the order written here.
 */
export const API_SPEC = {
  move: {
    emoji: "🧭",
    owner: "me",
    items: { explore: "method", moveTo: "method", follow: "method", patrol: "method", hide: "method", escape: "method", moveAwayFrom: "method", circle: "method", wait: "method" },
  },
  fight: {
    emoji: "⚔️",
    owner: "me",
    items: { attack: "method", special: "method", say: "method" },
  },
  spot: {
    emoji: "👀",
    owner: "me",
    items: { nearestEnemy: "method", weakestEnemy: "method", strongestEnemy: "method", enemiesNear: "method", canSee: "method", distanceTo: "method", inRange: "method" },
  },
  friends: {
    emoji: "🤝",
    owner: "me",
    items: { nearestAlly: "method", weakestAlly: "method", nearestItem: "method", nearestBush: "method" },
  },
  me: {
    emoji: "🙋",
    owner: "me",
    items: {
      type: "property",
      health: "property",
      maxHealth: "property",
      sight: "property",
      isSpotted: "property",
      isHidden: "property",
      inBush: "property",
      specialReady: "property",
      specialCooldown: "property",
      range: "property",
      x: "property",
      y: "property",
      name: "property",
      index: "property",
      isRaging: "property",
      hasShield: "property",
      memory: "property",
    },
  },
  world: {
    emoji: "🌍",
    owner: "global",
    items: { enemies: "variable", allies: "variable", items: "variable", time: "variable", arena: "variable", team: "variable", log: "function", distance: "function", random: "function" },
  },
  others: {
    emoji: "🔍",
    owner: "unit",
    items: {
      type: "property",
      health: "property",
      maxHealth: "property",
      x: "property",
      specialReady: "property",
      isHidden: "property",
      isSpotted: "property",
      index: "property",
      id: "property",
      name: "property",
    },
  },
} as const satisfies Record<string, { emoji: string; owner: "me" | "global" | "unit"; items: Record<string, "method" | "property" | "variable" | "function"> }>;

export type ApiGroupId = keyof typeof API_SPEC;
export type ApiItemName<G extends ApiGroupId> = keyof (typeof API_SPEC)[G]["items"] & string;
