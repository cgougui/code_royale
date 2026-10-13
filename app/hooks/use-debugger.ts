// The debugger's state: which moment and fighter are traced, and where we are in the trace.
import { stepTarget, type StepMove, type Trace } from "@code-royale/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BattleReplay } from "../domain/battle-replay";
import { blueFightersAt, lastTick } from "../domain/battle-replay";
import { appMessage, type AppMessage } from "../domain/messages";
import { requestTrace } from "../runtime/trace-client";

export interface DebugState {
  /** The tick whose scripts are traced. The arena shows the world as those scripts see it. */
  tick: number;
  unitId: number;
  trace: Trace | null;
  /** Index of the current step in `trace.steps`. */
  step: number;
  /** Waiting for a trace from the worker. */
  busy: boolean;
  /** Why there is no trace, or why a command did nothing. */
  notice: AppMessage | null;
}

export interface Debugger {
  state: DebugState | null;
  /** Starts debugging (or jumps) at `tick`, with `unitId` or the fighter already picked. */
  open(tick: number, unitId?: number): void;
  close(): void;
  move(m: StepMove): void;
  goToStep(i: number): void;
  setTick(tick: number): void;
  selectUnit(id: number): void;
}

type Landing = "first" | "last" | "breakpoint";

export function useDebugger(
  run: BattleReplay | null,
  breakpoints: readonly number[],
): Debugger {
  const [state, setState] = useState<DebugState | null>(null);
  const current = useRef(state);
  current.current = state;
  const bps = useRef(breakpoints);
  bps.current = breakpoints;
  const pending = useRef<AbortController | null>(null);

  const load = useCallback(
    async (tick: number, unitId: number, landing: Landing) => {
      if (!run) return;
      pending.current?.abort();
      const ctl = new AbortController();
      pending.current = ctl;
      const search = landing === "breakpoint";
      // While searching, stay on the current moment until a breakpoint is found.
      setState((s) =>
        search && s
          ? { ...s, busy: true, notice: null }
          : {
              tick,
              unitId,
              trace: s?.trace ?? null,
              step: s?.step ?? 0,
              busy: true,
              notice: null,
            },
      );
      try {
        const reply = await requestTrace(
          {
            levelId: run.levelId,
            locale: run.locale,
            blueCode: run.code,
            seed: run.seed,
            request: {
              tick,
              unitId,
              breakpoints: search ? [...bps.current] : undefined,
            },
          },
          ctl.signal,
        );
        if (ctl.signal.aborted) return;
        if (reply.kind === "trace") {
          const t = reply.trace;
          const hit = t.steps.findIndex(
            (s) => s.kind === "line" && bps.current.includes(s.line!),
          );
          const step =
            landing === "last"
              ? t.steps.length - 1
              : search
                ? Math.max(0, hit)
                : 0;
          setState({
            tick: t.tick,
            unitId: t.unitId,
            trace: t,
            step,
            busy: false,
            notice: null,
          });
        } else {
          const notice =
            reply.kind === "compileError" ? reply.error.message : reply.reason;
          setState(
            (s) =>
              s && {
                ...s,
                trace: search ? s.trace : null,
                busy: false,
                notice,
              },
          );
        }
      } catch (e) {
        if (!ctl.signal.aborted)
          setState(
            (s) =>
              s && {
                ...s,
                busy: false,
                notice: appMessage("app.unexpected", { detail: String(e) }),
              },
          );
      }
    },
    [run],
  );

  /** The fighter to show at `tick`: the one picked if it's still standing, else the first one. */
  const pickUnit = useCallback(
    (tick: number, wanted?: number): number | undefined => {
      if (!run) return undefined;
      const ids = blueFightersAt(run, tick);
      const prev = wanted ?? current.current?.unitId;
      return prev !== undefined && ids.includes(prev) ? prev : ids[0];
    },
    [run],
  );

  const setTick = useCallback(
    (tick: number) => {
      if (!run) return;
      const t = Math.max(0, Math.min(lastTick(run), tick));
      const id = pickUnit(t);
      if (id === undefined) {
        pending.current?.abort();
        setState({
          tick: t,
          unitId: -1,
          trace: null,
          step: 0,
          busy: false,
          notice: appMessage("app.noFighterStanding"),
        });
      } else void load(t, id, "first");
    },
    [run, load, pickUnit],
  );

  const open = useCallback(
    (tick: number, unitId?: number) => {
      if (!run) return;
      const t = Math.max(0, Math.min(lastTick(run), tick));
      const id = pickUnit(t, unitId) ?? unitId;
      if (id === undefined) setTick(t);
      else void load(t, id, "first");
    },
    [run, load, pickUnit, setTick],
  );

  const close = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    setState(null);
  }, []);

  const move = useCallback(
    (m: StepMove) => {
      const s = current.current;
      if (!run || !s) return;
      if (m === "continue" && bps.current.length === 0) {
        setState({
          ...s,
          notice: appMessage("app.needBreakpoint"),
        });
        return;
      }
      const target = s.trace
        ? stepTarget(s.trace.steps, s.step, m, bps.current)
        : null;
      if (target !== null)
        return setState({ ...s, step: target, notice: null });
      // Leaving this tick: on to the next one (or back to the previous one).
      if (m === "back") {
        if (s.tick > 0) void load(s.tick - 1, s.unitId, "last");
        return;
      }
      if (s.tick >= lastTick(run))
        return setState({ ...s, notice: appMessage("app.battleEnd") });
      void load(
        s.tick + 1,
        s.unitId,
        m === "continue" ? "breakpoint" : "first",
      );
    },
    [run, load],
  );

  const goToStep = useCallback(
    (i: number) => setState((s) => s && { ...s, step: i, notice: null }),
    [],
  );
  const selectUnit = useCallback(
    (id: number) =>
      current.current && void load(current.current.tick, id, "first"),
    [load],
  );

  // A new battle ends the debugging session.
  useEffect(() => close, [run, close]);

  return useMemo(
    () => ({ state, open, close, move, goToStep, setTick, selectUnit }),
    [state, open, close, move, goToStep, setTick, selectUnit],
  );
}
