import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { sfx } from "~/game/audio";
import { ARENA_H, ARENA_W, TICKS_PER_SECOND } from "~/game/constants";
import type { Level } from "~/game/levels";
import { ArenaRenderer } from "~/game/render/renderer";
import type { BattleRun } from "~/game/runner";
import { Battle } from "~/game/sim";
import type { BattleResult, UnitInfo } from "~/game/types";

interface Props {
  level: Level;
  run: BattleRun | null;
  /** Changing this restarts playback of the current run from the start. */
  replayKey: number;
  /** Changing this jumps to the end of the battle. */
  skipKey: number;
  speed: number;
  paused: boolean;
  muted: boolean;
  onTick: (tick: number) => void;
  onFinished: (result: BattleResult) => void;
  children?: ReactNode;
}

type Phase = "preview" | "countdown" | "playing" | "ending" | "finished";

export function Arena({ level, run, replayKey, skipKey, speed, paused, muted, onTick, onFinished, children }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ArenaRenderer | null>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [count, setCount] = useState<string | null>(null);

  const preview = useMemo(() => {
    const b = new Battle({ ...level, blueCode: "", seed: 1 });
    return { frame: b.initialFrame(), infos: new Map<number, UnitInfo>(b.unitInfos().map((u) => [u.id, u])) };
  }, [level]);

  // Everything the animation loop reads lives in a ref so the loop never restarts.
  const st = useRef({
    phase: "preview" as Phase,
    playTick: 0,
    lastEventFrame: -1,
    endingAt: 0,
    wave: 1,
    lastTickReport: 0,
    finishedReported: false,
  });
  const props = useRef({ run, speed, paused, muted, onTick, onFinished, preview, level });
  props.current = { run, speed, paused, muted, onTick, onFinished, preview, level };

  // Fit a 16:10 arena into the available space.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const w = Math.floor(Math.min(cw, ch * (ARENA_W / ARENA_H)));
      setSize({ w, h: Math.floor((w * ARENA_H) / ARENA_W) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    rendererRef.current ??= new ArenaRenderer(canvasRef.current);
    rendererRef.current.resize(size.w, size.h);
  }, [size]);

  // Start (or restart) playback with a countdown.
  useEffect(() => {
    const r = rendererRef.current;
    r?.reset();
    const s = st.current;
    s.playTick = 0;
    s.lastEventFrame = -1;
    s.wave = 1;
    s.finishedReported = false;
    if (!run) {
      s.phase = "preview";
      setCount(null);
      return;
    }
    s.phase = "countdown";
    const isReplay = replayKey > 0 && run.done;
    const steps = isReplay ? ["GO!"] : ["3", "2", "1", "FIGHT!"];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((label, i) => {
      timers.push(
        setTimeout(() => {
          setCount(label);
          if (!props.current.muted) sfx.countdown(i === steps.length - 1);
        }, i * 650),
      );
    });
    timers.push(
      setTimeout(() => {
        s.phase = "playing";
      }, (steps.length - 1) * 650 + 250),
    );
    timers.push(setTimeout(() => setCount(null), steps.length * 650));
    return () => timers.forEach(clearTimeout);
  }, [run, replayKey]);

  useEffect(() => {
    const s = st.current;
    const r = props.current.run;
    if (skipKey === 0 || !r || !r.done || s.phase !== "playing") return;
    // Jump to just before the finale, without replaying every sound.
    const target = Math.max(0, r.frames.length - 1 - TICKS_PER_SECOND);
    const renderer = rendererRef.current;
    for (let i = s.lastEventFrame + 1; i <= target; i++) {
      for (const e of r.frames[i].events) {
        if (e.k === "wave") s.wave = e.n;
        if (e.k === "death" || e.k === "spawn") renderer?.handleEvent(e, r.infos, false);
      }
    }
    s.lastEventFrame = target;
    s.playTick = target;
  }, [skipKey]);

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.soundOn = !muted;
  }, [muted]);

  // The animation loop.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const renderer = rendererRef.current;
      if (!renderer) return;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      const s = st.current;
      const { run, speed, paused, preview, level } = props.current;
      const hasWaves = !!(level.waves || level.endless);

      if (!run || s.phase === "preview") {
        renderer.draw(preview.frame, null, 0, preview.infos, dt, { time: 0, timeLimit: level.timeLimit, wave: hasWaves ? 1 : undefined, speed: 1 });
        return;
      }

      let sp = 0;
      if (s.phase === "playing" && run.frames.length > 0) {
        sp = paused ? 0 : speed;
        if (run.finalTick >= 0 && s.playTick > run.finalTick - 10 && s.playTick < run.finalTick + 14 && sp > 0) sp = 0.25;
        const maxTick = Math.max(0, run.frames.length - 1);
        const target = Math.min(maxTick, s.playTick + dt * TICKS_PER_SECOND * sp);
        const loud = sp <= 2;
        for (let i = s.lastEventFrame + 1; i <= Math.floor(target); i++) {
          for (const e of run.frames[i].events) {
            if (e.k === "wave") s.wave = e.n;
            renderer.handleEvent(e, run.infos, loud || e.k === "death" || e.k === "explode");
          }
          if (i === run.finalTick && run.result) {
            const win = run.result.winner === "blue";
            renderer.showBanner(win ? "VICTORY!" : "DEFEAT", win ? "#fde047" : "#fca5a5", undefined, 2.2);
          }
          s.lastEventFrame = i;
        }
        s.playTick = target;
        if (run.done && s.playTick >= maxTick) {
          s.phase = "ending";
          s.endingAt = ts;
          const res = run.result!;
          if (res.winner === "blue") renderer.confetti("blue");
          if (res.winner === "draw") renderer.showBanner("TIME'S UP!", "#fde68a", undefined, 2);
          if (!props.current.muted) (res.winner === "blue" ? sfx.victory() : sfx.defeat());
        }
        if (ts - s.lastTickReport > 120) {
          s.lastTickReport = ts;
          props.current.onTick(Math.floor(s.playTick));
        }
      }
      if (s.phase === "ending" && ts - s.endingAt > 1600 && !s.finishedReported) {
        s.finishedReported = true;
        s.phase = "finished";
        props.current.onTick(run.frames.length);
        props.current.onFinished(run.result!);
      }

      const frames = run.frames;
      if (!frames.length) {
        renderer.draw(preview.frame, null, 0, preview.infos, dt, { time: 0, timeLimit: level.timeLimit, wave: hasWaves ? 1 : undefined, speed: 1 });
        return;
      }
      const i = Math.min(frames.length - 1, Math.floor(s.playTick));
      const alpha = s.playTick - i;
      const effectDt = s.phase === "playing" ? dt * Math.max(sp, 0) : dt;
      renderer.draw(frames[i], frames[i + 1] ?? null, alpha, run.infos, effectDt, {
        time: s.playTick / TICKS_PER_SECOND,
        timeLimit: level.timeLimit,
        wave: hasWaves ? s.wave : undefined,
        speed: s.phase === "playing" ? (sp === 0.25 ? 0.25 : speed) : 1,
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={boxRef} className="cr-arena-box">
      <div className="cr-arena-frame" style={{ width: size.w, height: size.h }}>
        <canvas
          ref={canvasRef}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            rendererRef.current?.setMouse(e.clientX - rect.left, e.clientY - rect.top);
          }}
          onMouseLeave={() => rendererRef.current?.setMouse(null)}
        />
        {count && (
          <div className="cr-overlay">
            <div key={count} className={`cr-countdown ${count.length > 1 ? "go" : ""}`}>
              {count}
            </div>
          </div>
        )}
        {!run && <div className="cr-preview-hint">⚔️ Press FIGHT to start the battle!</div>}
        {children}
      </div>
    </div>
  );
}
