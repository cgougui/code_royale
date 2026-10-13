import { Battle, debugBattle, stepTarget, type Frame, type Trace, type TraceReply } from "@code-royale/engine";
import { describe, expect, it } from "vitest";
import { compileInstrumented, instrument } from "../src/scripting/instrument";
import type { ScriptInterceptor } from "../src/scripting/brains";
import { setup, unit } from "./helpers";

const STARTER = `let enemy = me.nearestEnemy()
if (enemy) {
  me.attack(enemy)
} else {
  me.explore()
}`;

function traced(reply: TraceReply): Trace {
  if (reply.kind !== "trace") throw new Error(`no trace: ${JSON.stringify(reply)}`);
  return reply.trace;
}

/** Fighter ids in the small test battle (ids start at 1, blue first). */
const BLUE = 1;
const RED = 2;

const lines = (t: Trace) => t.steps.map((s) => (s.kind === "line" ? s.line : s.kind));
const varOf = (t: Trace, step: number, name: string) => t.steps[step].vars.find((v) => v.name === name)?.value.text;

/** Every frame of a battle, with blue scripts run either normally or instrumented (hooks that do nothing). */
function framesOf(blueCode: string, instrumented: boolean): Frame[] {
  const s = setup({
    blue: [unit("knight", 150, 250), unit("archer", 120, 350)],
    red: [unit("knight", 600, 250), unit("archer", 650, 350)],
    blueCode,
    redCode: STARTER,
    timeLimit: 12,
  });
  const b = new Battle(s);
  if (b.prepare()) throw new Error("compile error");
  if (instrumented) {
    const { brain, error } = compileInstrumented(blueCode);
    if (error) throw new Error(error.message);
    const noop = { s() {}, i() {}, o() {}, l() {} };
    const interceptor: ScriptInterceptor = { run: (_, args) => (brain!(...args, noop), true), failed() {} };
    b.scripts.interceptor = interceptor;
  }
  const out: Frame[] = [];
  while (!b.result) out.push(b.step());
  return out;
}

// Scripts that use the trickier parts of JavaScript: the instrumented version must behave exactly the same.
const CORPUS: Record<string, string> = {
  starter: STARTER,
  "functions, closures, recursion": `
function score(e) { return e.health + me.distanceTo(e) / 10 }
const fib = (n) => n < 2 ? n : fib(n - 1) + fib(n - 2)
let best = null
for (const e of enemies) { if (!best || score(e) < score(best)) best = e }
const pick = enemies.filter(e => { const s = score(e); return s < 1000 }).sort((a, b) => score(a) - score(b))[0]
if (fib(6) === 8 && pick) me.attack(pick)
else if (best) me.attack(best)
else me.explore()`,
  "labels, switch, loops, hoisting": `
total = 0
var later
outer: for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) { if (j === 2) continue outer; if (i === 3) break outer; total += j }
}
let k = 0
while (k < 3) k++
do { k-- } while (k > 0)
for (const key in { a: 1, b: 2 }) later = key
switch (me.index) {
  case 0: { let tmp = "lead"; me.say(tmp) } break
  case 1: me.say("two")
  default: later = "fell"
}
if (time > 2) me.moveTo(400, 300 + total)
else me.wait()`,
  "try/catch, classes, destructuring, memory": `
class Plan { constructor(t) { this.t = t } get go() { return this.t > 1 } static { this.n = 1 } }
const { x, y } = me
const [first = null, ...rest] = enemies
me.memory.ticks = (me.memory.ticks || 0) + 1
team.calls = (team.calls || 0) + 1
try { null.boom } catch ({ message }) { me.memory.err = message.length > 0 }
finally { me.memory.ok = true }
if (new Plan(time).go && first) me.attack(first)
else if (me.memory.ticks % 40 < 20) me.moveTo(x + 50, y)
else me.circle(400, 300, 80 + random() * 10 + rest.length)`,
  "runtime errors": `
if (time > 1) me.nearestEnemy().health
me.explore()`,
};

describe("debugger: instrumented scripts", () => {
  for (const [name, code] of Object.entries(CORPUS)) {
    it(`behaves exactly like the original: ${name}`, () => {
      expect(framesOf(code, true)).toEqual(framesOf(code, false));
    });
  }

  it("keeps every line where it was", () => {
    for (const code of Object.values(CORPUS)) expect(instrument(code).code.split("\n")).toHaveLength(code.split("\n").length);
  });

  it("refuses names it uses itself", () => {
    expect(compileInstrumented("let __cr = 1").error?.message).toMatch(/__cr/);
  });
});

describe("debugger: traces", () => {
  const trace = (blueCode: string, tick = 0, over = {}) => traced(debugBattle(setup({ blueCode, ...over }), { tick, unitId: BLUE }));

  it("records each statement, the variables and the order given so far", () => {
    const t = trace(STARTER);
    expect(lines(t)).toEqual([1, 2, 5, "end"]);
    expect(varOf(t, 0, "enemy")).toBe("not created yet");
    expect(varOf(t, 1, "enemy")).toBe("null");
    expect(t.steps[2].order).toBeNull();
    expect(t.steps[3].order).toBe("me.explore()");
    expect(t.steps[1]).toMatchObject({ line: 2, col: 0, endLine: 2, endCol: 10 });
    expect(t.context.map((c) => c.name)).toEqual(["me", "enemies", "allies", "items", "time"]);
  });

  it("replays the real battle: the traced fighter is where the battle frames say", () => {
    const s = setup({ blueCode: STARTER });
    const b = new Battle(s);
    b.prepare();
    for (let i = 0; i < 30; i++) b.step();
    const t = traced(debugBattle(s, { tick: 30, unitId: BLUE }));
    const me = Object.fromEntries(t.context[0].value.children!.map((c) => [c.key, c.value.text]));
    expect(Number(me.x)).toBeCloseTo(b.world.units.find((u) => u.id === BLUE)!.x, 0);
  });

  it("tracks function calls, so you can step over and out of them", () => {
    const t = trace(`function hi(n) {\n  let twice = n * 2\n  return twice\n}\nlet a = hi(1)\nme.wait()`);
    expect(lines(t)).toEqual([5, 2, 3, 6, "end"]);
    expect(t.steps.map((s) => s.depth)).toEqual([0, 1, 1, 0, 0]);
    expect(stepTarget(t.steps, 0, "into")).toBe(1);
    expect(stepTarget(t.steps, 0, "over")).toBe(3);
    expect(stepTarget(t.steps, 1, "out")).toBe(3);
    expect(stepTarget(t.steps, 3, "back")).toBe(2);
    expect(stepTarget(t.steps, 4, "into")).toBeNull();
    expect(stepTarget(t.steps, 0, "back")).toBeNull();
    expect(stepTarget(t.steps, 0, "continue", [3])).toBe(2);
    expect(varOf(t, 4, "a")).toBe("2");
  });

  it("shows what was logged and where the script crashed", () => {
    const t = trace(`log("hello", 42)\nlet a = null\nlet b = a.health`);
    expect(t.output).toEqual([{ kind: "log", text: "hello 42" }]);
    const last = t.steps.at(-1)!;
    expect(last).toMatchObject({ kind: "error", line: 3 });
    expect(last.error).toMatch(/doesn't exist/);
    expect(t.steps[1].output).toBe(1);
  });

  it("stops endless loops instead of freezing", () => {
    const t = trace(`let n = 0\nwhile (true) { n++ }`);
    expect(t.truncated).toBe(true);
    expect(t.steps.at(-1)).toMatchObject({ kind: "error", line: 2 });
    expect(t.steps.at(-1)!.error).toMatch(/never stops/);
  });

  it("says when a fighter can't be traced", () => {
    expect(debugBattle(setup({ blueCode: STARTER }), { tick: 0, unitId: RED })).toMatchObject({ kind: "unavailable" });
    expect(debugBattle(setup({ blueCode: "me.attack(" }), { tick: 0, unitId: BLUE })).toMatchObject({ kind: "compileError" });
  });
});

describe("debugger: breakpoints", () => {
  const s = setup({ blueCode: STARTER, red: [unit("knight", 450, 300)] });

  it("finds the first tick where a fighter reaches a breakpoint line", () => {
    const t = traced(debugBattle(s, { tick: 0, unitId: BLUE, breakpoints: [3] }));
    expect(t.tick).toBeGreaterThan(0);
    expect(lines(t)).toContain(3);
    // The tick before, the knight couldn't see the enemy yet.
    expect(lines(traced(debugBattle(s, { tick: t.tick - 1, unitId: BLUE })))).not.toContain(3);
  });

  it("says so when no fighter ever gets there", () => {
    expect(debugBattle(s, { tick: 0, unitId: BLUE, breakpoints: [99] })).toMatchObject({ kind: "unavailable" });
  });
});
