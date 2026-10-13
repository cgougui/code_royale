/** Turns values passed to log() / me.say() into short readable text. Code-like, so it needs no translation. */
export function formatValue(v: unknown, depth = 0): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "string") return depth === 0 ? v : JSON.stringify(v);
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(1);
  if (typeof v === "boolean") return String(v);
  if (typeof v === "function") return "ƒ()";
  if (Array.isArray(v)) {
    if (depth > 1) return v.length ? `[…×${v.length}]` : "[]";
    const parts = v.slice(0, 6).map((x) => formatValue(x, depth + 1));
    return `[${parts.join(", ")}${v.length > 6 ? `, …+${v.length - 6}` : ""}]`;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.type === "string" && typeof o.health === "number") {
      return `${o.team === "red" ? "🔴" : "🔵"} ${o.type} ${o.name ?? ""} (${Math.ceil(o.health as number)}❤️)`;
    }
    if (typeof o.kind === "string" && typeof o.x === "number") return `💎 ${o.kind} (${Math.round(o.x)}, ${Math.round(o.y as number)})`;
    if (depth > 1) return "{…}";
    const keys = Object.keys(o).slice(0, 8);
    return `{ ${keys.map((k) => `${k}: ${formatValue(o[k], depth + 1)}`).join(", ")} }`;
  }
  return String(v);
}
