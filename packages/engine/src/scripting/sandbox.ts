/**
 * Script sandbox: syntax checking (acorn), compilation with `new Function`,
 * error line mapping and kid-friendly error messages.
 *
 * Isolation note: compiled scripts can only reach the globals passed as parameters.
 * They still run in the host JS realm, so the app runs battles in a Web Worker
 * (no DOM, killable on infinite loops).
 */
import { parse } from "acorn";
import type { CompileError } from "../protocol";

/** Names of the variables a player's script can use directly. */
export const SCRIPT_GLOBALS = [
  "me",
  "enemies",
  "allies",
  "items",
  "time",
  "arena",
  "team",
  "log",
  "distance",
  "random",
] as const;

export type Brain = (...args: unknown[]) => unknown;

/** Checks the syntax of a player's script. Returns null when the code is fine. */
export function checkSyntax(code: string): CompileError | null {
  try {
    parse(code, { ecmaVersion: "latest", allowReturnOutsideFunction: true, sourceType: "script" });
    return null;
  } catch (e) {
    const err = e as SyntaxError & { loc?: { line: number; column: number }; pos?: number };
    const raw = err.message.replace(/\s*\(\d+:\d+\)\s*$/, "");
    if (err.pos !== undefined && err.pos >= code.trimEnd().length && /Unexpected token/.test(raw)) {
      // The code ended while something was still open: point at the last real line.
      const lines = code.trimEnd().split("\n");
      return { message: `Something was opened but never closed. Look for a missing ")" or "}".`, line: lines.length };
    }
    return { message: friendlySyntax(raw), line: err.loc?.line, col: err.loc ? err.loc.column + 1 : undefined };
  }
}

export function compile(code: string): { brain?: Brain; error?: CompileError } {
  const syntax = checkSyntax(code);
  if (syntax) return { error: syntax };
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const brain = new Function(...SCRIPT_GLOBALS, code) as Brain;
    return { brain };
  } catch (e) {
    return { error: { message: friendlyRuntime(String((e as Error).message)) } };
  }
}

const STACK_RE = /(?:<anonymous>|Function|eval):(\d+):(\d+)/;
let lineOffset: number | null = null;

/** `new Function` adds a header before the body; find out how many lines it adds in this engine. */
function getLineOffset(): number {
  if (lineOffset !== null) return lineOffset;
  lineOffset = 2;
  try {
    new Function("throw new Error('x')")();
  } catch (e) {
    const m = STACK_RE.exec(String((e as Error).stack));
    if (m) lineOffset = Number(m[1]) - 1;
  }
  return lineOffset;
}

/** Extracts the line number (in the player's code) of a runtime error. */
export function errorLine(e: unknown): number | undefined {
  const stack = String((e as Error)?.stack ?? "");
  const m = STACK_RE.exec(stack);
  if (!m) return undefined;
  const line = Number(m[1]) - getLineOffset();
  return line >= 1 ? line : undefined;
}

function friendlySyntax(msg: string): string {
  if (/Unexpected token/i.test(msg)) return `Oops! Something is written in a way I don't understand here. Check for a missing ( ) { } or a typo.`;
  if (/Unterminated string/i.test(msg)) return `A text in "quotes" is not closed. Add the missing quote!`;
  if (/Unexpected character/i.test(msg)) return `There's a strange character here that doesn't belong in code.`;
  if (/Identifier .* has already been declared/i.test(msg)) return `${msg}. Use a different name, or remove "let" the second time.`;
  return `Syntax problem: ${msg}`;
}

export function friendlyRuntime(msg: string): string {
  let m = /^(\w+) is not defined$/.exec(msg);
  if (m) return `I don't know what "${m[1]}" is. Is it spelled right? (Capital letters matter!)`;
  m = /Cannot read propert(?:y|ies) of (undefined|null) \(reading '(\w+)'\)/.exec(msg) ?? /can't access property "(\w+)", \w+ is (undefined|null)/.exec(msg);
  if (m) {
    const prop = /reading/.test(msg) ? m[2] : m[1];
    return `Tried to use ".${prop}" on something that doesn't exist (it's ${/null/.test(msg) ? "null" : "undefined"}). Maybe there is no enemy left? Try checking with if (thing) { ... }`;
  }
  m = /(\S+) is not a function/.exec(msg);
  if (m) return `"${m[1]}" is not something I can run. Check the spelling, and look in the 📖 Guide for the right name.`;
  if (/Maximum call stack/i.test(msg)) return `Your code calls itself forever! (Maximum call stack exceeded)`;
  return msg;
}
