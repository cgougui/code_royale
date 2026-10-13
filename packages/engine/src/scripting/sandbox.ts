/**
 * Script sandbox: syntax checking (acorn), compilation with `new Function`,
 * error line mapping and kid-friendly error messages (as language-neutral `Message`s).
 *
 * Isolation note: compiled scripts can only reach the globals passed as parameters.
 * They still run in the host JS realm, so the app runs battles in a Web Worker
 * (no DOM, killable on infinite loops).
 */
import { parse } from "acorn";
import { message, type CompileError, type Message } from "../protocol";

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
      return { message: message("syntax.unclosed"), line: lines.length };
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

function friendlySyntax(msg: string): Message {
  if (/Unexpected token/i.test(msg)) return message("syntax.unexpectedToken");
  if (/Unterminated string/i.test(msg)) return message("syntax.unterminatedString");
  if (/Unexpected character/i.test(msg)) return message("syntax.unexpectedCharacter");
  const m = /Identifier '?(\S+?)'? has already been declared/i.exec(msg);
  if (m) return message("syntax.alreadyDeclared", { name: m[1] });
  return message("syntax.other", { detail: msg });
}

/** Turns a JavaScript error message into a message a kid can act on. */
export function friendlyRuntime(msg: string): Message {
  let m = /^(\w+) is not defined$/.exec(msg);
  if (m) return message("runtime.notDefined", { name: m[1] });
  m = /Cannot read propert(?:y|ies) of (undefined|null) \(reading '(\w+)'\)/.exec(msg) ?? /can't access property "(\w+)", \w+ is (undefined|null)/.exec(msg);
  if (m) {
    const property = /reading/.test(msg) ? m[2] : m[1];
    return message("runtime.missingProperty", { property, value: /null/.test(msg) ? "null" : "undefined" });
  }
  m = /(\S+) is not a function/.exec(msg);
  if (m) return message("runtime.notAFunction", { name: m[1] });
  if (/Maximum call stack/i.test(msg)) return message("runtime.stackOverflow");
  return message("runtime.other", { detail: msg });
}
