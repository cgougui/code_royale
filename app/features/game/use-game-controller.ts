import { useCallback, useEffect, useMemo, useState } from "react";
import { LEVELS, levelById } from "@code-royale/content";
import { sfx } from "@code-royale/renderer";
import { frameIndex } from "../../domain/battle-replay";
import { usePlayerSession } from "../../hooks/use-player-session";
import { useBattleSession } from "../../hooks/use-battle-session";
import { useDebugger } from "../../hooks/use-debugger";

/** Coordinates the game use cases. Layout and editor widgets live in GameScreen. */
export function useGameController() {
  const player = usePlayerSession();
  const level = levelById(player.progress.current);
  const battle = useBattleSession(level.id, player.code, player.recordBattle);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [previewTick, setPreviewTick] = useState<number | null>(null);
  const dbg = useDebugger(battle.run, breakpoints);
  const run = battle.run;

  useEffect(() => {
    sfx.muted = player.progress.muted;
  }, [player.progress.muted]);
  useEffect(() => {
    setPreviewTick(null);
  }, [dbg.state?.tick, run]);

  const debugBlocked = !run?.frames.length
    ? "Press FIGHT first: the debugger replays a battle."
    : player.code !== run.code
      ? "Your code changed since this battle. Press FIGHT to debug the new code."
      : null;
  const openDebugger = useCallback(
    (tick?: number, unitName?: string) => {
      if (!run || debugBlocked) return;
      const unitId = unitName
        ? [...run.infos.values()].find(
            (unit) => unit.team === "blue" && unit.name === unitName,
          )?.id
        : undefined;
      battle.setPaused(true);
      battle.dismissResult();
      battle.dismissError();
      setPreviewTick(null);
      dbg.open(tick ?? battle.visibleTick + 1, unitId);
    },
    [
      run,
      debugBlocked,
      battle.setPaused,
      battle.dismissResult,
      battle.dismissError,
      battle.visibleTick,
      dbg.open,
    ],
  );

  const debugInfo = useMemo(() => {
    if (!dbg.state) return null;
    const step = dbg.state.trace?.steps[dbg.state.step] ?? null;
    return {
      step,
      vars: step ? [...step.vars, ...dbg.state.trace!.context] : [],
    };
  }, [dbg.state]);

  const startBattle = useCallback(() => {
    sfx.unlock();
    battle.start();
  }, [battle.start]);
  const selectLevel = useCallback(
    (id: string) => {
      battle.stop();
      player.pickLevel(id);
    },
    [battle.stop, player.pickLevel],
  );
  const acknowledgeIntro = useCallback(() => {
    sfx.unlock();
    player.acknowledgeIntro();
  }, [player.acknowledgeIntro]);

  return {
    player,
    battle,
    level,
    next: LEVELS[
      LEVELS.findIndex((candidate) => candidate.id === level.id) + 1
    ],
    dbg,
    debugBlocked,
    debugInfo,
    firstError: battle.logs.find(
      (entry) => entry.kind === "error" && entry.tick >= 0,
    ),
    inspect:
      dbg.state && run
        ? {
            frame: frameIndex(run, previewTick ?? dbg.state.tick),
            unitId: dbg.state.unitId,
          }
        : null,
    openDebugger,
    setPreviewTick,
    setBreakpoints,
    startBattle,
    selectLevel,
    acknowledgeIntro,
  };
}
