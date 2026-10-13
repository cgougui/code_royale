import { describe, expect, it } from "vitest";
import { LEVELS } from "@code-royale/content";
import type { BattleResult } from "@code-royale/engine";
import {
  completeBattle,
  defaultProgress,
  isUnlocked,
} from "../domain/progress";
import { initialSession, playerSession } from "../domain/player-session";
import {
  decodeProgress,
  loadProgress,
  saveProgress,
} from "../runtime/progress-store";

const victory: BattleResult = {
  winner: "blue",
  time: 10,
  blueAlive: 3,
  blueTotal: 3,
  redAlive: 0,
  redTotal: 3,
  redKilled: 3,
  damageDealt: 100,
  wave: 1,
  said: true,
};

describe("player session", () => {
  it("commits a draft before a quick level change and restores each level's code", () => {
    let state = playerSession(initialSession(), {
      type: "hydrate",
      progress: defaultProgress(),
    });
    state = playerSession(state, { type: "edit", code: "first draft" });
    state = playerSession(state, { type: "pick-level", id: LEVELS[1].id });
    expect(state.code).toBe("first draft");
    state = playerSession(state, { type: "edit", code: "second draft" });
    state = playerSession(state, { type: "pick-level", id: LEVELS[0].id });
    expect(state.code).toBe("first draft");
    expect(state.progress.code[LEVELS[1].id]).toBe("second draft");
  });

  it("never reduces earned stars and leaves the original progress intact", () => {
    const original = defaultProgress();
    const won = completeBattle(original, LEVELS[0], victory);
    expect(won.outcome.earned).toEqual([true, true, true]);
    expect(won.progress.battles).toBe(1);
    const lost = completeBattle(won.progress, LEVELS[0], {
      ...victory,
      winner: "red",
    });
    expect(lost.progress.stars[LEVELS[0].id]).toBe(3);
    expect(original.stars).toEqual({});
    expect(isUnlocked(lost.progress, LEVELS[1].id)).toBe(true);
    expect(isUnlocked(lost.progress, "removed-level")).toBe(false);
  });

  it("updates endless records only for endless battles", () => {
    const progress = { ...defaultProgress(), bestWave: 5 };
    const endless = LEVELS.find((level) => level.endless)!;
    expect(
      completeBattle(progress, endless, { ...victory, wave: 6 }).outcome
        .newRecord,
    ).toBe(true);
    expect(
      completeBattle(progress, endless, { ...victory, wave: 2 }).progress
        .bestWave,
    ).toBe(5);
    expect(
      completeBattle(progress, LEVELS[0], { ...victory, wave: 6 }).progress
        .bestWave,
    ).toBe(5);
    expect(
      completeBattle(defaultProgress(), endless, { ...victory, wave: 6 })
        .outcome.newRecord,
    ).toBe(false);
  });
});

describe("progress storage", () => {
  it("round trips the existing storage format, preserving empty code", () => {
    let raw: string | null = null;
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    const progress = {
      ...defaultProgress(),
      code: { [LEVELS[0].id]: "" },
      muted: true,
      battles: 4,
    };
    saveProgress(progress, storage);
    expect(loadProgress(storage)).toEqual(progress);
  });

  it("repairs invalid fields without throwing away valid saved code", () => {
    const progress = decodeProgress(
      JSON.stringify({
        current: "removed",
        stars: { [LEVELS[0].id]: 8 },
        code: { [LEVELS[0].id]: "me.explore()", [LEVELS[1].id]: null },
        battles: "8",
        bestWave: -1,
        muted: "yes",
      }),
    );
    expect(progress.current).toBe(LEVELS[0].id);
    expect(progress.stars[LEVELS[0].id]).toBe(3);
    expect(progress.code).toEqual({ [LEVELS[0].id]: "me.explore()" });
    expect(progress.battles).toBe(0);
    expect(progress.bestWave).toBe(0);
    expect(progress.muted).toBe(false);
  });

  it("handles malformed JSON, old partial saves and unavailable storage", () => {
    expect(loadProgress({ getItem: () => "{", setItem: () => {} })).toEqual(
      defaultProgress(),
    );
    expect(decodeProgress("null")).toEqual(defaultProgress());
    expect(decodeProgress('{"seenIntro":true}').seenIntro).toBe(true);
    const unavailable = {
      getItem: () => {
        throw new Error("disabled");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(loadProgress(unavailable)).toEqual(defaultProgress());
    expect(() => saveProgress(defaultProgress(), unavailable)).not.toThrow();
  });
});
