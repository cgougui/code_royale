import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@code-royale/content";
import type { BattleResult } from "@code-royale/engine";
import type { AppMessage, ConsoleEntry } from "../domain/messages";
import type { BattleOutcome } from "../domain/progress";
import { BattleRun, type RunError } from "../runtime/battle-run";

/** Owns one worker run and its playback controls, including cleanup and stale-message guards. */
export function useBattleSession(
  levelId: string,
  code: string,
  locale: Locale,
  recordBattle: (levelId: string, result: BattleResult) => BattleOutcome,
) {
  const active = useRef<BattleRun | null>(null);
  const awarded = useRef<BattleOutcome | null>(null);
  const [run, setRun] = useState<BattleRun | null>(null);
  const [starting, setStarting] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [skipKey, setSkipKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const [visibleTick, setVisibleTick] = useState(0);
  const [runError, setRunError] = useState<RunError | null>(null);
  const [lineError, setLineError] = useState<{
    line?: number;
    message: AppMessage;
  } | null>(null);
  const [result, setResult] = useState<BattleOutcome | null>(null);

  const dispose = useCallback(() => {
    const previous = active.current;
    active.current = null;
    previous?.stop();
  }, []);
  useEffect(() => dispose, [dispose]);

  const stop = useCallback(() => {
    dispose();
    awarded.current = null;
    setRun(null);
    setStarting(false);
    setResult(null);
    setPaused(false);
    setLogs([]);
    setVisibleTick(0);
    setRunError(null);
    setLineError(null);
  }, [dispose]);

  const start = useCallback(() => {
    stop();
    setReplayKey(0);
    setSkipKey(0);
    setStarting(true);
    const battle = new BattleRun(
      levelId,
      locale,
      code,
      Math.floor(Math.random() * 1e9),
      {
        onInit: () => {
          if (active.current !== battle) return;
          setStarting(false);
          setRun(battle);
        },
        onLogs: (entries) => {
          if (active.current !== battle) return;
          setLogs((previous) => [...previous, ...entries]);
          const error = entries.find((entry) => entry.kind === "error");
          if (error?.kind === "error") {
            setLineError(
              (current) =>
                current ?? { line: error.line, message: error.message },
            );
            setRunError(
              (current) =>
                current ?? {
                  kind: "runtime",
                  line: error.line,
                  message: error.message,
                  unit: error.unit,
                },
            );
          }
        },
        onError: (error) => {
          if (active.current !== battle) return;
          setStarting(false);
          setRunError(error);
          setRun(null);
          setLogs((previous) => [
            ...previous,
            {
              tick: -1,
              kind: "error",
              message: error.message,
              line: error.line,
            },
          ]);
          if (error.line)
            setLineError({ line: error.line, message: error.message });
        },
      },
    );
    active.current = battle;
  }, [code, levelId, locale, stop]);

  const onFinished = useCallback(
    (res: BattleResult) => {
      if (!run || active.current !== run) return;
      // Replays and debugger seeks display the same award, without counting another battle.
      awarded.current ??= recordBattle(run.levelId, res);
      setResult(awarded.current);
    },
    [run, recordBattle],
  );
  const replay = useCallback(() => {
    setResult(null);
    setReplayKey((key) => key + 1);
  }, []);
  const skip = useCallback(() => setSkipKey((key) => key + 1), []);
  const dismissResult = useCallback(() => setResult(null), []);
  const closeResult = useCallback(() => {
    dispose();
    setRun(null);
    setResult(null);
    setPaused(false);
  }, [dispose]);
  const dismissError = useCallback(() => setRunError(null), []);
  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    run,
    starting,
    replayKey,
    skipKey,
    speed,
    setSpeed,
    paused,
    setPaused,
    logs,
    visibleTick,
    setVisibleTick,
    runError,
    lineError,
    result,
    start,
    stop,
    onFinished,
    replay,
    skip,
    dismissResult,
    closeResult,
    dismissError,
    clearLogs,
  };
}
