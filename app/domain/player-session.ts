import { levelById } from "@code-royale/content";
import type { BattleResult } from "@code-royale/engine";
import {
  codeFor,
  completeBattle,
  defaultProgress,
  rememberCode,
  type Progress,
} from "./progress";

export interface PlayerSession {
  progress: Progress;
  code: string;
  loaded: boolean;
}

export type PlayerAction =
  | { type: "hydrate"; progress: Progress }
  | { type: "edit"; code: string }
  | { type: "save-code" }
  | { type: "pick-level"; id: string }
  | { type: "complete-battle"; levelId: string; result: BattleResult }
  | { type: "toggle-mute" }
  | { type: "acknowledge-intro" };

export function initialSession(): PlayerSession {
  const progress = defaultProgress();
  return { progress, code: codeFor(progress, progress.current), loaded: false };
}

export function playerSession(
  state: PlayerSession,
  action: PlayerAction,
): PlayerSession {
  const p = state.progress;
  switch (action.type) {
    case "hydrate":
      return {
        progress: action.progress,
        code: codeFor(action.progress, action.progress.current),
        loaded: true,
      };
    case "edit":
      return { ...state, code: action.code };
    case "save-code":
      return { ...state, progress: rememberCode(p, p.current, state.code) };
    case "pick-level": {
      // Commit the outgoing draft before choosing the next level's code.
      const saved = rememberCode(p, p.current, state.code);
      return {
        ...state,
        progress: { ...saved, current: action.id },
        code: codeFor(saved, action.id),
      };
    }
    case "complete-battle":
      return {
        ...state,
        progress: completeBattle(p, levelById(action.levelId), action.result)
          .progress,
      };
    case "toggle-mute":
      return { ...state, progress: { ...p, muted: !p.muted } };
    case "acknowledge-intro":
      return { ...state, progress: { ...p, seenIntro: true } };
  }
}
