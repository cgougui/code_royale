import {
  TICKS_PER_SECOND,
  type BattleResult,
  type GameEvent,
  type Team,
} from "@code-royale/engine";
import type { BattleReplay } from "./battle-replay";

type Phase = "preview" | "countdown" | "playing" | "ending" | "finished";
/** Which banner to show; its text is the presentation's business. */
export type BattleOutcome = "victory" | "defeat" | "timeUp";
export type PlaybackEffect =
  | { kind: "reset" }
  | { kind: "event"; event: GameEvent; sound: boolean }
  | {
      kind: "banner";
      outcome: BattleOutcome;
      color: string;
      duration: number;
    }
  | { kind: "confetti"; team: Team }
  | { kind: "finish-sound"; winner: BattleResult["winner"] };

export interface PlaybackUpdate {
  frame: number | null;
  alpha: number;
  effectDt: number;
  time: number;
  speed: number;
  wave: number;
  effects: PlaybackEffect[];
  reportTick?: number;
  finished?: BattleResult;
}

/** Playback clock and event cursor. No React, timers, audio or canvas. */
export class BattlePlayback {
  private phase: Phase = "preview";
  private playTick = 0;
  private lastEventFrame = -1;
  private endingAt = 0;
  private wave = 1;
  private lastTickReport = 0;

  reset(hasRun: boolean): void {
    this.phase = hasRun ? "countdown" : "preview";
    this.playTick = 0;
    this.lastEventFrame = -1;
    this.wave = 1;
    this.lastTickReport = 0;
  }

  play(): void {
    this.phase = "playing";
  }

  /** Reconstruct persistent effects when seeking, without replaying combat sounds. */
  seek(run: BattleReplay, frame: number): PlaybackEffect[] {
    if (!run.frames.length) return [];
    const target = Math.max(
      0,
      Math.min(Math.floor(frame), run.frames.length - 1),
    );
    const effects: PlaybackEffect[] = [];
    if (target < this.lastEventFrame) {
      effects.push({ kind: "reset" });
      this.lastEventFrame = -1;
      this.wave = 1;
    }
    for (let i = this.lastEventFrame + 1; i <= target; i++) {
      for (const event of run.frames[i].events) {
        if (event.k === "wave") this.wave = event.n;
        if (event.k === "death" || event.k === "spawn")
          effects.push({ kind: "event", event, sound: false });
      }
    }
    this.lastEventFrame = target;
    this.playTick = target;
    this.phase = "playing";
    return effects;
  }

  skip(run: BattleReplay): PlaybackEffect[] {
    if (!run.done || this.phase !== "playing") return [];
    return this.seek(
      run,
      Math.max(
        Math.floor(this.playTick),
        run.frames.length - 1 - TICKS_PER_SECOND,
      ),
    );
  }

  advance(
    run: BattleReplay | null,
    dt: number,
    now: number,
    speed: number,
    paused: boolean,
  ): PlaybackUpdate {
    const effects: PlaybackEffect[] = [];
    let sp = 0;
    let reportTick: number | undefined;
    let finished: BattleResult | undefined;
    if (run && this.phase === "playing" && run.frames.length) {
      sp = paused ? 0 : speed;
      if (
        run.finalTick >= 0 &&
        this.playTick > run.finalTick - 10 &&
        this.playTick < run.finalTick + 14 &&
        sp > 0
      )
        sp = 0.25;
      const maxTick = run.frames.length - 1;
      const target = Math.min(
        maxTick,
        this.playTick + dt * TICKS_PER_SECOND * sp,
      );
      for (let i = this.lastEventFrame + 1; i <= Math.floor(target); i++) {
        for (const event of run.frames[i].events) {
          if (event.k === "wave") this.wave = event.n;
          effects.push({
            kind: "event",
            event,
            sound: sp <= 2 || event.k === "death" || event.k === "explode",
          });
        }
        if (i === run.finalTick && run.result) {
          const win = run.result.winner === "blue";
          effects.push({
            kind: "banner",
            outcome: win ? "victory" : "defeat",
            color: win ? "#fde047" : "#fca5a5",
            duration: 2.2,
          });
        }
        this.lastEventFrame = i;
      }
      this.playTick = target;
      if (run.done && run.result && target >= maxTick) {
        this.phase = "ending";
        this.endingAt = now;
        if (run.result.winner === "blue")
          effects.push({ kind: "confetti", team: "blue" });
        if (run.result.winner === "draw")
          effects.push({
            kind: "banner",
            outcome: "timeUp",
            color: "#fde68a",
            duration: 2,
          });
        effects.push({ kind: "finish-sound", winner: run.result.winner });
      }
      if (now - this.lastTickReport > 120) {
        this.lastTickReport = now;
        reportTick = Math.floor(this.playTick);
      }
    }
    if (run?.result && this.phase === "ending" && now - this.endingAt > 1600) {
      this.phase = "finished";
      reportTick = run.frames.length;
      finished = run.result;
    }
    const frame =
      !run?.frames.length || this.phase === "preview"
        ? null
        : Math.min(run.frames.length - 1, Math.floor(this.playTick));
    return {
      frame,
      alpha: frame === null ? 0 : this.playTick - frame,
      effectDt: this.phase === "playing" ? dt * sp : dt,
      time: this.playTick / TICKS_PER_SECOND,
      speed: this.phase === "playing" ? (sp === 0.25 ? 0.25 : speed) : 1,
      wave: this.wave,
      effects,
      reportTick,
      finished,
    };
  }
}
