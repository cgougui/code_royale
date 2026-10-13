import { useCallback, useEffect, useMemo, useState } from "react";
import { sfx } from "@code-royale/renderer";
import { useContent } from "~/i18n";
import { frameIndex } from "../../domain/battle-replay";
import { usePlayerSession } from "../../hooks/use-player-session";
import { useBattleSession } from "../../hooks/use-battle-session";
import { useDebugger } from "../../hooks/use-debugger";

export type DebugBlocked = "noBattle" | "codeChanged";

/** Coordinates the game use cases. Layout and editor widgets live in GameScreen. */
export function useGameController() {
  const content = useContent();
  const player = usePlayerSession(content.locale);
  const level = content.level(player.progress.current);
  const battle = useBattleSession(
    level.id,
    player.code,
    content.locale,
    player.recordBattle,
  );
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

  /** Why the debugger can't run right now (a key of the `debugBlocked` texts), if it can't. */
  const debugBlocked: DebugBlocked | null = !run?.frames.length
    ? "noBattle"
    : player.code !== run.code
      ? "codeChanged"
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
    next: content.levels[
      content.levels.findIndex((candidate) => candidate.id === level.id) + 1
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
