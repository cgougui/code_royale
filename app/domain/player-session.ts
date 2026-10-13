import { levelById, type Locale } from "@code-royale/content";
import type { BattleResult } from "@code-royale/engine";
import {
  codeFor,
  completeBattle,
  defaultProgress,
  localizeCode,
  rememberCode,
  type Progress,
} from "./progress";

export interface PlayerSession {
  progress: Progress;
  code: string;
  loaded: boolean;
  locale: Locale;
}

export type PlayerAction =
  | { type: "hydrate"; progress: Progress }
  | { type: "edit"; code: string }
  | { type: "save-code" }
  | { type: "pick-level"; id: string }
  | { type: "complete-battle"; levelId: string; result: BattleResult }
  | { type: "toggle-mute" }
  | { type: "acknowledge-intro" }
  | { type: "set-locale"; locale: Locale };

export function initialSession(locale: Locale): PlayerSession {
  const progress = defaultProgress();
  return {
    progress,
    code: codeFor(progress, progress.current, locale),
    loaded: false,
    locale,
  };
}

export function playerSession(
  state: PlayerSession,
  action: PlayerAction,
): PlayerSession {
  const p = state.progress;
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        progress: action.progress,
        code: codeFor(action.progress, action.progress.current, state.locale),
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
        code: codeFor(saved, action.id, state.locale),
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
    case "set-locale":
      // Untouched starter code follows the language; the player's own code never changes.
      return {
        ...state,
        locale: action.locale,
        code: localizeCode(state.code, action.locale),
      };
  }
}
