import { LEVELS, STARTER_CODE } from "./levels";

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

const KEY = "code-royale:v1";

export function defaultProgress(): Progress {
  return { stars: {}, code: {}, bestWave: 0, current: LEVELS[0].id, lastCode: STARTER_CODE, muted: false, seenIntro: false, battles: 0 };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage can be unavailable (private mode); the game still works without saving.
  }
}

export function isUnlocked(p: Progress, levelId: string): boolean {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  return i <= 0 || (p.stars[LEVELS[i - 1].id] ?? 0) > 0;
}

/** Code shown when opening a level: what the player wrote there, or their latest code. */
export function codeFor(p: Progress, levelId: string): string {
  return p.code[levelId] ?? p.lastCode ?? STARTER_CODE;
}

export function totalStars(p: Progress): number {
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}
