import type { ItemKind, Team, UnitSnap, UnitType } from "@code-royale/engine";

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

export type Act = UnitSnap["act"];

/**
 * Every word the renderer draws. The renderer speaks no language of its own:
 * the app gives it these, in the player's language.
 */
export interface RendererText {
  /** A team's health bar: "BLUE · 3 fighters". */
  teamBar(team: Team, alive: number): string;
  /** The survival clock, and the banner when a wave arrives: "WAVE 3". */
  wave(n: number): string;
  /** Under the wave banner: "Here they come!". */
  waveIncoming: string;
  slowMotion: string;
  /** Playback speed: "2× speed". */
  speed(speed: number): string;
  detectionRadius(radius: number): string;
  /** A fighter's tooltip title: "Ace the Knight". */
  unitTitle(name: string, type: UnitType): string;
  hidden: string;
  spotted: string;
  /** What a fighter is doing, in its tooltip: "attacking". */
  acts: Record<Act, string>;
  /** Pops up when an item is picked up: "RAGE!". */
  pickup: Record<ItemKind, string>;
  /** Pops up when one of your fighters uses its special move: "WHIRLWIND!". */
  special(type: UnitType): string;
  /** Banners at the end of a battle (shown by the app through `showBanner`). */
  outcome: Record<BattleOutcome, string>;
}

export type BattleOutcome = "victory" | "defeat" | "timeUp";
