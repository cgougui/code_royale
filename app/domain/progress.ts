import {
  contentFor,
  isStarterCode,
  LEVELS,
  starsFor,
  type LevelSpec,
  type Locale,
} from "@code-royale/content";
import type { BattleResult } from "@code-royale/engine";

export interface Progress {
  stars: Record<string, number>;
  code: Record<string, string>;
  bestWave: number;
  current: string;
  /** The code written last, on any level (null until the player writes some). */
  lastCode: string | null;
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
    lastCode: null,
    muted: false,
    seenIntro: false,
    battles: 0,
  };
}

export function isUnlocked(p: Progress, levelId: string): boolean {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  return i === 0 || (i > 0 && (p.stars[LEVELS[i - 1].id] ?? 0) > 0);
}

/**
 * Code shown when opening a level: what the player wrote there, or their latest code.
 * The untouched starter code is shown in the player's language, whatever language it was saved in.
 */
export function codeFor(p: Progress, levelId: string, locale: Locale): string {
  return localizeCode(p.code[levelId] ?? p.lastCode, locale);
}

/** `code` itself, unless it is missing or is the untouched starter code: then the starter code in `locale`. */
export function localizeCode(code: string | null, locale: Locale): string {
  return code === null || isStarterCode(code)
    ? contentFor(locale).starter.code
    : code;
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
  level: LevelSpec,
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
