/**
 * Runs each team's script once per fighter per tick and collects what scripts
 * produce for the player: log() messages, friendly errors and warnings.
 */
import { message, type CompileError, type LogEntry, type Message, type Team } from "../protocol";
import { makeRng } from "../math/rng";
import { ARENA_H, ARENA_W, DT, TICKS_PER_SECOND } from "../rules";
import type { Unit, World } from "../world/state";
import { distanceFn, Me, viewOf, type ScriptHost } from "./api";
import { formatValue } from "./format";
import { compile, errorLine, friendlyRuntime, type Brain } from "./sandbox";

const MAX_LOGS = 400;

/** Lets the debugger run blue fighters' scripts itself (instrumented). See `debug.ts`. */
export interface ScriptInterceptor {
  /** Runs the fighter's script with `args` (the script globals) and returns true, or returns false to let the runner do it. */
  run(u: Unit, args: unknown[]): boolean;
  /** The script it ran threw `e`. */
  failed(u: Unit, e: unknown): void;
}

export class ScriptRunner implements ScriptHost {
  /** Messages for the player since the last drain. */
  logs: LogEntry[] = [];
  /** A blue fighter used me.say() (for a star goal). */
  blueSaid = false;
  /** Errors thrown by the red (built-in) script: content bugs, checked by tests. */
  readonly redErrors: string[] = [];
  /** Set by the debugger only; never during a normal battle. */
  interceptor: ScriptInterceptor | null = null;
  private brains: Partial<Record<Team, Brain>> = {};
  private teamMemory: Record<Team, Record<string, unknown>> = { blue: {}, red: {} };
  /** Scripts get their own random generator, so they can't disturb the simulation's. */
  private random: () => number;
  private seenErrors = new Set<string>();
  private warnedOnce = new Set<string>();
  private logCount = 0;
  private currentUnit: Unit | null = null;
  private blueBlindTicks = 0;

  constructor(
    readonly world: World,
    seed: number,
  ) {
    this.random = makeRng(seed ^ 0x9e3779b9);
  }

  /** Compiles both scripts. Returns the blue compile error if there is one. */
  load(blueCode: string, redCode: string): CompileError | null {
    const blue = compile(blueCode);
    if (blue.error) return blue.error;
    this.brains.blue = blue.brain;
    const red = compile(redCode);
    if (red.error) throw new Error(`Red script broken: ${JSON.stringify(red.error.message)} (line ${red.error.line})`);
    this.brains.red = red.brain;
    return null;
  }

  /** Lets every fighter of `team` decide what to do this tick. */
  run(team: Team) {
    const w = this.world;
    const brain = this.brains[team];
    if (!brain) return;
    const mine = w.units.filter((u) => u.alive && u.team === team);
    const visible = w.units.filter((u) => u.alive && u.team !== team && w.spotted[team].has(u.id));
    const enemyViews = visible.map((u) => viewOf(w, u));
    const allyViews = mine.map((u) => viewOf(w, u));
    const itemViews = w.items.map((i) => Object.freeze({ id: i.id, kind: i.kind, x: i.x, y: i.y }));
    const time = Math.round(w.tick * DT * 100) / 100;
    const arena = Object.freeze({
      width: ARENA_W,
      height: ARENA_H,
      centerX: ARENA_W / 2,
      centerY: ARENA_H / 2,
      bushes: w.bushes.map((b) => Object.freeze({ x: b.x, y: b.y, radius: b.r })),
      rocks: w.rocks.map((b) => Object.freeze({ x: b.x, y: b.y, radius: b.r })),
    });
    const teamMem = this.teamMemory[team];
    const log = (...args: unknown[]) => this.log(team, args);
    for (const u of mine) {
      const allies = allyViews.filter((v) => v.id !== u.id);
      const me = new Me(this, u, enemyViews, allies, itemViews);
      this.currentUnit = u;
      const args = [me, enemyViews, allies, itemViews, time, arena, teamMem, log, distanceFn, this.random];
      const interceptor = team === "blue" ? this.interceptor : null;
      try {
        if (!interceptor?.run(u, args)) brain(...args);
      } catch (e) {
        interceptor?.failed(u, e);
        this.reportError(team, u, e);
      }
    }
    this.currentUnit = null;
  }

  /** Gentle nudge when the player's fighters stand around because they can't see anyone. */
  checkBlind() {
    const w = this.world;
    const blue = w.units.filter((u) => u.alive && u.team === "blue");
    const blind = w.spotted.blue.size === 0 && blue.every((u) => u.intent.k === "idle");
    this.blueBlindTicks = blind ? this.blueBlindTicks + 1 : 0;
    if (this.blueBlindTicks === TICKS_PER_SECOND * 3 && !this.warnedOnce.has("blind")) {
      this.warnedOnce.add("blind");
      this.logs.push({ tick: w.tick, kind: "warn", message: message("warn.blind") });
    }
  }

  warn(warning: Message) {
    if (this.warnedOnce.has(warning.code) || this.currentUnit?.team !== "blue") return;
    this.warnedOnce.add(warning.code);
    this.logs.push({ tick: this.world.tick, kind: "warn", message: warning, unit: this.currentUnit?.name });
  }

  noteSay(u: Unit) {
    if (u.team === "blue") this.blueSaid = true;
  }

  private reportError(team: Team, u: Unit, e: unknown) {
    if (team !== "blue") {
      if (this.redErrors.length < 10) this.redErrors.push(`${u.name}: ${String((e as Error)?.message ?? e)} (line ${errorLine(e)})`);
      return;
    }
    const line = errorLine(e);
    const error = friendlyRuntime(String((e as Error)?.message ?? e));
    const key = `${line}:${JSON.stringify(error)}`;
    if (this.seenErrors.has(key)) return;
    this.seenErrors.add(key);
    this.logs.push({ tick: this.world.tick, kind: "error", message: error, line, unit: u.name });
  }

  private log(team: Team, args: unknown[]) {
    if (team !== "blue") return;
    if (this.logCount >= MAX_LOGS) return;
    this.logCount++;
    const u = this.currentUnit;
    if (this.logCount === MAX_LOGS) {
      this.logs.push({ tick: this.world.tick, kind: "warn", message: message("warn.tooManyLogs", { max: MAX_LOGS }) });
      return;
    }
    this.logs.push({ tick: this.world.tick, kind: "log", text: args.map((a) => formatValue(a)).join(" "), unit: u?.name });
  }
}
