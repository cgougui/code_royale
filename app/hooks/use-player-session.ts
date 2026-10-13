import { useCallback, useEffect, useReducer } from "react";
import { levelById } from "@code-royale/content";
import type { BattleResult } from "@code-royale/engine";
import { completeBattle } from "../domain/progress";
import { loadProgress, saveProgress } from "../runtime/progress-store";
import { initialSession, playerSession } from "../domain/player-session";

/** React adapter for the pure player session; persistence runs only in effects. */
export function usePlayerSession() {
  const [state, dispatch] = useReducer(
    playerSession,
    undefined,
    initialSession,
  );

  useEffect(() => dispatch({ type: "hydrate", progress: loadProgress() }), []);

  useEffect(() => {
    if (state.loaded) saveProgress(state.progress);
  }, [state.loaded, state.progress]);

  useEffect(() => {
    if (!state.loaded) return;
    const timer = setTimeout(() => dispatch({ type: "save-code" }), 300);
    return () => clearTimeout(timer);
  }, [state.loaded, state.code, state.progress.current]);

  const setCode = useCallback(
    (code: string) => dispatch({ type: "edit", code }),
    [],
  );
  const pickLevel = useCallback(
    (id: string) => dispatch({ type: "pick-level", id }),
    [],
  );
  const toggleMute = useCallback(() => dispatch({ type: "toggle-mute" }), []);
  const acknowledgeIntro = useCallback(
    () => dispatch({ type: "acknowledge-intro" }),
    [],
  );
  const recordBattle = useCallback(
    (levelId: string, result: BattleResult) => {
      const outcome = completeBattle(
        state.progress,
        levelById(levelId),
        result,
      ).outcome;
      dispatch({ type: "complete-battle", levelId, result });
      return outcome;
    },
    [state.progress],
  );

  return {
    ...state,
    setCode,
    pickLevel,
    toggleMute,
    acknowledgeIntro,
    recordBattle,
  };
}
