/**
 * The debugger: step-by-step execution of a blue fighter's script, with its variables.
 *
 * Battles are deterministic, so the debugger never pauses a live script. It replays the
 * battle up to the tick asked for, then runs one fighter's script instrumented (see
 * `scripting/instrument.ts`) and records every step: where it is, the variables, the order
 * given so far. The UI moves through that recording, backwards too.
 *
 * Breakpoints: a cheap probe runs the instrumented script tick after tick until a blue
 * fighter reaches a breakpoint line, then that tick is replayed and recorded.
 */
import { Battle } from "./battle";
import type { BattleSetup, CompileError, Trace, TraceReply, TraceRequest, TraceStep, TraceVar } from "./protocol";
import type { ScriptInterceptor } from "./scripting/brains";
import { compileInstrumented, type DebugHooks, type InstrumentedBrain, type StepPoint } from "./scripting/instrument";
import { inspect } from "./scripting/inspect";
import { errorLine, friendlyRuntime } from "./scripting/sandbox";
import type { Unit, World } from "./world/state";

/** Steps kept per trace (the script keeps running after that, unrecorded). */
const MAX_STEPS = 2000;
/** Loop rounds per fighter per tick before the debugger calls it an endless loop. */
const MAX_ROUNDS = 1_000_000;
/** Script globals shown as "what the fighter knows" (the first arguments of a script). */
const CONTEXT = ["me", "enemies", "allies", "items", "time"];

interface Compiled {
  brain: InstrumentedBrain;
  points: StepPoint[];
}

class EndlessLoop extends Error {
  constructor() {
    super(`This loop never stops! It went round more than ${MAX_ROUNDS.toLocaleString("en")} times in a single tick.`);
  }
}

/** Traces the request: one fighter's script at one tick, or at the next breakpoint. */
export function debugBattle(setup: BattleSetup, req: TraceRequest): TraceReply {
  const compiled = compileInstrumented(setup.blueCode);
  if (compiled.error) return { kind: "compileError", error: compiled.error };
  const c = compiled as Compiled;
  let { tick, unitId } = req;
  if (req.breakpoints?.length) {
    const hit = findBreakpoint(setup, c, tick, new Set(req.breakpoints), unitId);
    if ("error" in hit) return { kind: "compileError", error: hit.error };
    if (!hit.found) return { kind: "unavailable", reason: "No fighter reached a breakpoint before the end of the battle." };
    ({ tick, unitId } = hit.found);
  }
  return traceTick(setup, c, tick, unitId);
}

function start(setup: BattleSetup): Battle | { error: CompileError } {
  const battle = new Battle(setup);
  const error = battle.prepare();
  return error ? { error } : battle;
}

function traceTick(setup: BattleSetup, c: Compiled, tick: number, unitId: number): TraceReply {
  const b = start(setup);
  if ("error" in b) return { kind: "compileError", error: b.error };
  while (b.tick < tick && !b.result) b.step();
  const u = b.world.units.find((x) => x.id === unitId);
  if (b.result) return { kind: "unavailable", reason: "The battle is already over at this moment." };
  if (!u || u.team !== "blue") return { kind: "unavailable", reason: "Pick one of your blue fighters to debug." };
  if (!u.alive) return { kind: "unavailable", reason: `${u.name} is knocked out at this moment, so its code doesn't run.` };
  const rec = new Recorder(b, u, c);
  b.scripts.interceptor = rec;
  b.step();
  return { kind: "trace", trace: rec.trace() };
}

function findBreakpoint(
  setup: BattleSetup,
  c: Compiled,
  fromTick: number,
  lines: Set<number>,
  prefer: number,
): { found: { tick: number; unitId: number } | null } | { error: CompileError } {
  const b = start(setup);
  if ("error" in b) return b;
  while (b.tick < fromTick && !b.result) b.step();
  const probe = new Probe(b.world, c, lines, prefer);
  b.scripts.interceptor = probe;
  while (!b.result && !probe.hit) b.step();
  return { found: probe.hit };
}

/** Records everything one fighter's script does during one tick. */
class Recorder implements ScriptInterceptor {
  private steps: TraceStep[] = [];
  private context: TraceVar[] = [];
  private truncated = false;
  private finished = false;
  private depth = 0;
  private rounds = 0;
  private outputStart = 0;
  private args: unknown[] = [];
  /** The latest step, and the latest one at the top level: their getters still work after the script is done. */
  private last: { point: number; getters: (() => unknown)[] } | null = null;
  private lastTop: { point: number; getters: (() => unknown)[] } | null = null;

  private hooks: DebugHooks = {
    s: (point, getters = []) => {
      this.last = { point, getters };
      if (this.depth === 0) this.lastTop = this.last;
      if (this.steps.length >= MAX_STEPS) {
        this.truncated = true;
        return;
      }
      const p = this.c.points[point];
      this.steps.push({ kind: "line", line: p.line, col: p.col, endLine: p.endLine, endCol: p.endCol, ...this.state(this.depth, point, getters) });
    },
    i: () => void this.depth++,
    o: () => void this.depth--,
    l: () => {
      if (++this.rounds > MAX_ROUNDS) throw new EndlessLoop();
    },
  };

  constructor(
    private readonly battle: Battle,
    private readonly unit: Unit,
    private readonly c: Compiled,
  ) {}

  run(u: Unit, args: unknown[]): boolean {
    if (u !== this.unit) return false;
    this.args = args;
    this.context = CONTEXT.map((name, i) => ({ name, value: inspect(args[i]) }));
    this.outputStart = this.battle.scripts.logs.length;
    this.c.brain(...args, this.hooks);
    this.finish("end");
    return true;
  }

  failed(u: Unit, e: unknown) {
    if (u === this.unit) this.finish("error", e);
  }

  trace(): Trace {
    return {
      tick: this.battle.tick - 1,
      unitId: this.unit.id,
      unitName: this.unit.name,
      context: this.context,
      steps: this.steps,
      // A crash is shown by the last step (the battle log only reports each error once).
      output: this.battle.scripts.logs
        .slice(this.outputStart)
        .filter((l) => l.kind !== "error")
        .map((l) => ({ kind: l.kind, text: l.text })),
      truncated: this.truncated,
    };
  }

  private finish(kind: "end" | "error", e?: unknown) {
    if (this.finished) return;
    this.finished = true;
    const at = kind === "end" ? this.lastTop : this.last;
    const step: TraceStep = { kind, ...this.state(0, at?.point, at?.getters ?? []) };
    if (kind === "error") {
      step.error = e instanceof EndlessLoop ? e.message : friendlyRuntime(String((e as Error)?.message ?? e));
      // The statement that crashed is usually the last step; the error's own line is more precise when they differ.
      const p = at ? this.c.points[at.point] : undefined;
      const line = e instanceof EndlessLoop ? p?.line : (errorLine(e) ?? p?.line);
      if (line !== undefined) Object.assign(step, p && p.line === line ? { line, col: p.col, endLine: p.endLine, endCol: p.endCol } : { line });
    }
    this.steps.push(step);
  }

  private state(depth: number, point: number | undefined, getters: (() => unknown)[]) {
    const names = point === undefined ? [] : this.c.points[point].vars;
    const vars: TraceVar[] = names.map((name, i) => ({ name, value: read(getters[i]) }));
    const me = this.args[0] as { memory?: object } | undefined;
    const team = this.args[6] as object | undefined;
    if (me?.memory && Object.keys(me.memory).length) vars.push({ name: "me.memory", value: inspect(me.memory) });
    if (team && Object.keys(team).length) vars.push({ name: "team", value: inspect(team) });
    return {
      depth,
      vars,
      order: describeOrder(this.battle.world, this.unit),
      output: this.battle.scripts.logs.length - this.outputStart,
    };
  }
}

function read(getter: (() => unknown) | undefined): TraceVar["value"] {
  try {
    return inspect(getter?.());
  } catch {
    // A `let`/`const` whose line hasn't run yet.
    return { text: "not created yet", kind: "unset" };
  }
}

/** Finds the first tick at which a blue fighter reaches one of `lines` (preferring `prefer` within that tick). */
class Probe implements ScriptInterceptor {
  hit: { tick: number; unitId: number } | null = null;
  private unit: Unit | null = null;
  private rounds = 0;
  private hooks: DebugHooks = {
    s: (point) => {
      const u = this.unit!;
      if (!this.lines.has(this.c.points[point].line)) return;
      if (!this.hit || (u.id === this.prefer && this.hit.unitId !== this.prefer)) this.hit = { tick: this.world.tick, unitId: u.id };
    },
    i: () => {},
    o: () => {},
    l: () => {
      if (++this.rounds > MAX_ROUNDS) throw new EndlessLoop();
    },
  };

  constructor(
    private readonly world: World,
    private readonly c: Compiled,
    private readonly lines: Set<number>,
    private readonly prefer: number,
  ) {}

  run(u: Unit, args: unknown[]): boolean {
    this.unit = u;
    this.rounds = 0;
    this.c.brain(...args, this.hooks);
    return true;
  }

  failed() {}
}

/** Describes the order a fighter has been given this tick so far, the way the player wrote it. */
function describeOrder(w: World, u: Unit): string | null {
  const name = (id: number) => w.units.find((x) => x.id === id)?.name ?? "someone";
  const r = Math.round;
  const it = u.intent;
  let order: string | null;
  switch (it.k) {
    case "idle":
      order = null;
      break;
    case "attack":
      order = `me.attack(${name(it.target)})`;
      break;
    case "follow":
      order = `me.follow(${name(it.target)})`;
      break;
    case "move":
      order = `me.moveTo(${r(it.x)}, ${r(it.y)})`;
      break;
    case "flee":
      order = `me.moveAwayFrom(${r(it.x)}, ${r(it.y)})`;
      break;
    case "patrol":
      order = `me.patrol(${it.points.length} places)`;
      break;
    case "circle":
      order = it.target !== undefined ? `me.circle(${name(it.target)})` : `me.circle(${r(it.x)}, ${r(it.y)})`;
      break;
    default:
      order = `me.${it.k}()`;
  }
  if (u.specialReq) order = order ? `${order} + me.special()` : "me.special()";
  return order;
}

export type StepMove = "into" | "over" | "out" | "back" | "continue";

/**
 * Where a debugger command leads from step `from` of a trace:
 * a step index, or null when it leaves this tick (the next one, or the previous one for "back").
 *
 *   into      the next step, even inside a function
 *   over      the next step that isn't inside a function called from here
 *   out       the first step after the current function returns
 *   back      the previous step
 *   continue  the next step on a breakpoint line
 */
export function stepTarget(steps: readonly TraceStep[], from: number, move: StepMove, breakpoints: readonly number[] = []): number | null {
  const cur = steps[from];
  const last = steps.length - 1;
  const next = (ok: (s: TraceStep) => boolean) => {
    for (let i = from + 1; i <= last; i++) if (ok(steps[i])) return i;
    return null;
  };
  switch (move) {
    case "back":
      return from > 0 ? from - 1 : null;
    case "into":
      return from < last ? from + 1 : null;
    case "over":
      return next((s) => s.depth <= cur.depth);
    case "out":
      return cur.depth === 0 ? (from < last ? last : null) : next((s) => s.depth < cur.depth);
    case "continue":
      return next((s) => s.kind === "line" && breakpoints.includes(s.line!));
  }
}
