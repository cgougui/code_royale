import { LEVELS, starter, starsFor, type Level } from "@code-royale/content";
import type { BattleResult } from "@code-royale/engine";

export interface Progress {
  stars: Record<string, number>;
  code: Record<string, string>;
  bestWave: number;
  current: string;
  lastCode: string;
  muted: boolean;
  seenIntro: boolean;
  battles: number;
}

export interface BattleOutcome {
  res: BattleResult;
  earned: boolean[];
  newRecord: boolean;
}

export function defaultProgress(): Progress {
  return {
    stars: {},
    code: {},
    bestWave: 0,
    current: LEVELS[0].id,
    lastCode: starter.code,
    muted: false,
    seenIntro: false,
    battles: 0,
  };
}

export function isUnlocked(p: Progress, levelId: string): boolean {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  return i === 0 || (i > 0 && (p.stars[LEVELS[i - 1].id] ?? 0) > 0);
}

/** Code shown when opening a level: what the player wrote there, or their latest code. */
export function codeFor(p: Progress, levelId: string): string {
  return p.code[levelId] ?? p.lastCode;
}

export function totalStars(p: Progress): number {
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}

export function rememberCode(
  p: Progress,
  levelId: string,
  code: string,
): Progress {
  return { ...p, code: { ...p.code, [levelId]: code }, lastCode: code };
}

/** Award a completed battle. Playback and storage are deliberately absent here. */
export function completeBattle(
  p: Progress,
  level: Level,
  res: BattleResult,
): { progress: Progress; outcome: BattleOutcome } {
  const earned = starsFor(level, res);
  return {
    outcome: {
      res,
      earned,
      newRecord: !!level.endless && res.wave > p.bestWave && p.bestWave > 0,
    },
    progress: {
      ...p,
      battles: p.battles + 1,
      stars: {
        ...p.stars,
        [level.id]: Math.max(
          p.stars[level.id] ?? 0,
          earned.filter(Boolean).length,
        ),
      },
      bestWave: level.endless ? Math.max(p.bestWave, res.wave) : p.bestWave,
    },
  };
}
