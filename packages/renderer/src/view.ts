export interface ViewOptions {
  /** Hide what the blue team can't see. */
  fog: boolean;
  /** Before the battle: everything visible, detection circles shown. */
  preview: boolean;
  /** A fighter to spotlight (the one being debugged): a gold ring plus its sight, range and target. */
  focus?: number;
}

export interface HudInfo {
  time: number;
  timeLimit: number;
  wave?: number;
  speed: number;
}

export const FONT = "Fredoka, system-ui, sans-serif";
/** Fighters are drawn a bit bigger than their hit circle so kids can see them well. */
export const VIS = 1.35;

export const ACT_ICONS: Record<string, string> = {
  attack: "⚔️",
  explore: "🔍",
  follow: "👣",
  patrol: "🔁",
  hide: "🌿",
  escape: "💨",
  wait: "✋",
  circle: "🌀",
  move: "📍",
  idle: "💤",
};

export const ACT_LABELS: Record<string, string> = {
  attack: "attacking",
  explore: "exploring",
  follow: "following",
  patrol: "patrolling",
  hide: "hiding",
  escape: "escaping",
  wait: "waiting",
  circle: "circling",
  move: "moving",
  idle: "no orders",
};
