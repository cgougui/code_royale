import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { toBattleSetup, type Level } from "@code-royale/content";
import { Battle, type BattleResult } from "@code-royale/engine";
import { sfx, type ArenaRenderer } from "@code-royale/renderer";
import { BattlePlayback, type PlaybackEffect } from "../domain/battle-playback";
import type { BattleReplay } from "../domain/battle-replay";

export interface ArenaPlaybackProps {
  level: Level;
  run: BattleReplay | null;
  replayKey: number;
  skipKey: number;
  speed: number;
  paused: boolean;
  muted: boolean;
  fog: boolean;
  onTick(tick: number): void;
  onFinished(result: BattleResult): void;
  inspect?: { frame: number; unitId: number } | null;
}

function applyEffects(
  renderer: ArenaRenderer,
  effects: PlaybackEffect[],
  run: BattleReplay,
  muted: boolean,
): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case "reset":
        renderer.reset();
        break;
      case "event":
        renderer.handleEvent(effect.event, run.infos, effect.sound);
        break;
      case "banner":
        renderer.showBanner(
          renderer.text.outcome[effect.outcome],
          effect.color,
          undefined,
          effect.duration,
        );
        break;
      case "confetti":
        renderer.confetti(effect.team);
        break;
      case "finish-sound":
        if (!muted) effect.winner === "blue" ? sfx.victory() : sfx.defeat();
        break;
    }
  }
}

/** The countdown before a battle: numbers, then a shout (worded by the UI). */
export type Countdown = "3" | "2" | "1" | "fight" | "go";

/** Schedules browser animation and adapts pure playback updates to the renderer. */
export function useArenaPlayback(
  rendererRef: RefObject<ArenaRenderer | null>,
  input: ArenaPlaybackProps,
) {
  const [count, setCount] = useState<Countdown | null>(null);
  const playback = useRef(new BattlePlayback());
  const preview = useMemo(() => {
    const battle = new Battle(toBattleSetup(input.level, "", 1));
    return {
      frame: battle.initialFrame(),
      infos: new Map(battle.unitInfos().map((unit) => [unit.id, unit])),
    };
  }, [input.level]);
  const latest = useRef({ ...input, preview });
  latest.current = { ...input, preview };

  useEffect(() => {
    rendererRef.current?.reset();
    playback.current.reset(!!input.run);
    setCount(null);
    if (!input.run) return;
    const steps: Countdown[] =
      input.replayKey > 0 && input.run.done
        ? ["go"]
        : ["3", "2", "1", "fight"];
    const timers = steps.map((label, index) =>
      setTimeout(() => {
        setCount(label);
        if (!latest.current.muted) sfx.countdown(index === steps.length - 1);
      }, index * 650),
    );
    timers.push(
      setTimeout(() => playback.current.play(), (steps.length - 1) * 650 + 250),
    );
    timers.push(setTimeout(() => setCount(null), steps.length * 650));
    return () => timers.forEach(clearTimeout);
  }, [input.run, input.replayKey, rendererRef]);

  useEffect(() => {
    const { run, muted } = latest.current;
    const renderer = rendererRef.current;
    if (input.skipKey && run && renderer)
      applyEffects(renderer, playback.current.skip(run), run, muted);
  }, [input.skipKey, rendererRef]);

  const inspectFrame = input.inspect?.frame;
  useEffect(() => {
    const { run, muted } = latest.current;
    const renderer = rendererRef.current;
    if (inspectFrame === undefined || !run || !renderer) return;
    applyEffects(
      renderer,
      playback.current.seek(run, inspectFrame),
      run,
      muted,
    );
    setCount(null);
  }, [inspectFrame, input.run, rendererRef]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const renderer = rendererRef.current;
      if (!renderer) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const {
        run,
        speed,
        paused,
        muted,
        level,
        fog,
        inspect,
        preview,
        onTick,
        onFinished,
      } = latest.current;
      renderer.soundOn = !muted;
      renderer.setTerrain(level.id, level.bushes ?? [], level.rocks ?? []);
      const update = playback.current.advance(
        run,
        dt,
        now,
        speed,
        paused || !!inspect,
      );
      if (run) applyEffects(renderer, update.effects, run, muted);
      if (update.reportTick !== undefined) onTick(update.reportTick);
      if (update.finished) onFinished(update.finished);
      const hasWaves = !!(level.waves || level.endless);
      if (!run || update.frame === null) {
        renderer.draw(
          preview.frame,
          null,
          0,
          preview.infos,
          dt,
          {
            time: 0,
            timeLimit: level.timeLimit,
            wave: hasWaves ? 1 : undefined,
            speed: 1,
          },
          { fog, preview: true },
        );
      } else {
        renderer.draw(
          run.frames[update.frame],
          run.frames[update.frame + 1] ?? null,
          update.alpha,
          run.infos,
          update.effectDt,
          {
            time: update.time,
            timeLimit: level.timeLimit,
            wave: hasWaves ? update.wave : undefined,
            speed: update.speed,
          },
          { fog, preview: false, focus: inspect?.unitId },
        );
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rendererRef]);

  return count;
}
