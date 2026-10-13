/**
 * Turns any script value into plain data the debugger can show (and send across
 * a worker boundary): a short summary, plus what's inside lists and objects.
 *
 * It never runs player code: getters are listed, not called.
 */
import type { Inspected } from "../protocol";
import { formatValue } from "./format";

const MAX_DEPTH = 3;
const MAX_CHILDREN = 40;
const MAX_STRING = 120;

function number(n: number): string {
  return Number.isInteger(n) || !Number.isFinite(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function inspect(v: unknown, depth = 0, seen = new Set<object>()): Inspected {
  if (v === null) return { text: "null", kind: "empty" };
  if (v === undefined) return { text: "undefined", kind: "empty" };
  if (typeof v === "number") return { text: number(v), kind: "number" };
  if (typeof v === "string") return { text: JSON.stringify(v.length > MAX_STRING ? `${v.slice(0, MAX_STRING)}…` : v), kind: "string" };
  if (typeof v === "boolean") return { text: String(v), kind: "boolean" };
  if (typeof v === "function") return { text: `function ${v.name || ""}()`.replace(" ()", "()"), kind: "function" };
  if (typeof v !== "object") return { text: String(v), kind: "object" };
  if (seen.has(v)) return { text: "(itself, again)", kind: "object" };

  const list = Array.isArray(v);
  const entries: [string, unknown][] = [];
  let getters = 0;
  if (v instanceof Map) for (const [k, x] of v) entries.push([formatValue(k), x]);
  else if (v instanceof Set) [...v].forEach((x, i) => entries.push([String(i), x]));
  else {
    for (const key of Object.keys(v)) {
      const d = Object.getOwnPropertyDescriptor(v, key);
      if (d && "value" in d) entries.push([key, d.value]);
      else getters++;
    }
  }

  const size = v instanceof Map || v instanceof Set ? v.size : entries.length;
  const text = list || v instanceof Set ? listSummary(v as unknown[] | Set<unknown>) : summary(v);
  const kind = list || v instanceof Set ? "list" : "object";
  if (depth >= MAX_DEPTH) return { text, kind, more: size || undefined };

  seen.add(v);
  const shown = entries.slice(0, MAX_CHILDREN).map(([key, x]) => ({ key, value: inspect(x, depth + 1, seen) }));
  seen.delete(v);
  const more = entries.length - shown.length + getters;
  return { text, kind, children: shown, ...(more > 0 ? { more } : {}) };
}

function listSummary(v: unknown[] | Set<unknown>): string {
  const n = Array.isArray(v) ? v.length : v.size;
  if (n === 0) return "[] (empty)";
  return `${formatValue(dataOnly(Array.isArray(v) ? v : [...v]))}  (${n} ${n === 1 ? "thing" : "things"})`;
}

function summary(v: object): string {
  try {
    if (v instanceof Map) return `Map (${v.size})`;
    return formatValue(dataOnly(v));
  } catch {
    return "{…}";
  }
}

/** A copy of what `formatValue` looks at (first items and keys), without getters. */
function dataOnly(v: unknown, depth = 0): unknown {
  if (!v || typeof v !== "object" || depth > 2) return v;
  if (Array.isArray(v)) return v.slice(0, 7).map((x) => dataOnly(x, depth + 1)).concat(v.length > 7 ? Array(v.length - 7) : []);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(v).slice(0, 9)) {
    const d = Object.getOwnPropertyDescriptor(v, key);
    out[key] = d && "value" in d ? dataOnly(d.value, depth + 1) : "(getter)";
  }
  return out;
}
