import { LEVELS } from "@code-royale/content";
import { defaultProgress, type Progress } from "../domain/progress";

const KEY = "code-royale:v1";
type StoragePort = Pick<Storage, "getItem" | "setItem">;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

/** Treat persisted JSON as untrusted input, keeping valid fields from older saves. */
export function decodeProgress(raw: string): Progress {
  const data = record(JSON.parse(raw));
  const defaults = defaultProgress();
  const known = new Set(LEVELS.map((level) => level.id));
  return {
    stars: Object.fromEntries(
      Object.entries(record(data.stars))
        .filter(([id]) => known.has(id))
        .map(([id, value]) => [id, Math.min(3, count(value))]),
    ),
    code: Object.fromEntries(
      Object.entries(record(data.code)).filter(
        ([id, value]) => known.has(id) && typeof value === "string",
      ),
    ) as Record<string, string>,
    current:
      typeof data.current === "string" && known.has(data.current)
        ? data.current
        : defaults.current,
    lastCode:
      typeof data.lastCode === "string" ? data.lastCode : defaults.lastCode,
    bestWave: count(data.bestWave),
    battles: count(data.battles),
    muted: data.muted === true,
    seenIntro: data.seenIntro === true,
  };
}

export function loadProgress(storage?: StoragePort): Progress {
  try {
    const raw = (storage ?? localStorage).getItem(KEY);
    return raw ? decodeProgress(raw) : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: Progress, storage?: StoragePort): void {
  try {
    (storage ?? localStorage).setItem(KEY, JSON.stringify(progress));
  } catch {
    // Private mode and quota errors must not prevent play.
  }
}
