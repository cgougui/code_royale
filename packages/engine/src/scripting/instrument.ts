/**
 * Instrumentation for the debugger: rewrites a player's script so that it reports
 * each statement it is about to run, with getters for the variables in scope.
 *
 *   let enemy = me.nearestEnemy()        __cr.s(0,[()=>enemy]);let enemy = me.nearestEnemy()
 *   if (enemy) me.attack(enemy)    →     __cr.s(1,[()=>enemy]);if (enemy) {__cr.s(2,[()=>enemy]);me.attack(enemy)}
 *
 * Only text is inserted, never a line break, so line numbers (and runtime error lines)
 * stay the same. The instrumented script behaves exactly like the original: the hooks
 * only read variables. Hooks, on the `__cr` parameter:
 *
 *   s(point, getters)  a statement is about to run
 *   i() / o()          a function body is entered / left (call depth)
 *   l()                a loop goes round once more (lets the debugger stop endless loops)
 */
import { parse, type Node } from "acorn";
import { message, type CompileError } from "../protocol";
import { checkSyntax, friendlyRuntime, SCRIPT_GLOBALS, type Brain } from "./sandbox";

/** Where a step is, and which variables can be seen from there. */
export interface StepPoint {
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  vars: string[];
}

export interface DebugHooks {
  s(point: number, getters?: (() => unknown)[]): void;
  i(): void;
  o(): void;
  l(): void;
}

/** The instrumented script: `brain(...script globals, hooks)`. */
export type InstrumentedBrain = (...args: unknown[]) => unknown;

export const HOOKS_NAME = "__cr";

type AstNode = Node & Record<string, unknown>;

interface Scope {
  names: string[];
  parent: Scope | null;
}

interface Insertion {
  pos: number;
  /** Order at the same position: closers, function exit, function entry, then openers. */
  rank: number;
  seq: number;
  text: string;
}

const CLOSE = 0;
const FN_EXIT = 1;
const FN_ENTER = 2;
const OPEN = 3;

const isNode = (v: unknown): v is AstNode => !!v && typeof v === "object" && typeof (v as Node).type === "string";
const isFunction = (n: AstNode) => n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression";
const isStatement = (n: AstNode) => /Statement$|^(Variable|Function|Class)Declaration$/.test(n.type);
const isLoop = (n: AstNode) => /^(For|ForIn|ForOf|While|DoWhile)Statement$/.test(n.type);

function children(n: AstNode): AstNode[] {
  const out: AstNode[] = [];
  for (const key of Object.keys(n)) {
    if (key === "loc") continue;
    const v = n[key];
    if (Array.isArray(v)) for (const x of v) isNode(x) && out.push(x);
    else if (isNode(v)) out.push(v);
  }
  return out;
}

/** Names bound by a declaration pattern: `a`, `{ a, b: c }`, `[a, ...rest]`, `a = 1`. */
function patternNames(p: AstNode | null | undefined, out: string[] = []): string[] {
  if (!p) return out;
  switch (p.type) {
    case "Identifier":
      out.push(p.name as string);
      break;
    case "ObjectPattern":
      for (const prop of p.properties as AstNode[]) patternNames(prop.type === "RestElement" ? prop : (prop.value as AstNode), out);
      break;
    case "ArrayPattern":
      for (const el of p.elements as (AstNode | null)[]) patternNames(el, out);
      break;
    case "AssignmentPattern":
      patternNames(p.left as AstNode, out);
      break;
    case "RestElement":
      patternNames(p.argument as AstNode, out);
      break;
  }
  return out;
}

/** `var` names declared anywhere in a function body (not inside nested functions). */
function varNames(n: AstNode, out: string[] = []): string[] {
  for (const c of children(n)) {
    if (isFunction(c)) continue;
    if (c.type === "VariableDeclaration" && c.kind === "var") for (const d of c.declarations as AstNode[]) patternNames(d.id as AstNode, out);
    varNames(c, out);
  }
  return out;
}

/** `let`, `const` and `class` names declared directly in a list of statements. */
function lexicalNames(list: AstNode[]): string[] {
  const out: string[] = [];
  for (const s of list) {
    if (s.type === "VariableDeclaration" && s.kind !== "var") for (const d of s.declarations as AstNode[]) patternNames(d.id as AstNode, out);
    if (s.type === "ClassDeclaration" && s.id) out.push((s.id as AstNode).name as string);
  }
  return out;
}

function visible(scope: Scope | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let s = scope; s; s = s.parent) {
    for (const name of s.names) {
      if (seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/**
 * Rewrites `code` so it reports every step to the `__cr` hooks.
 * The code must be syntactically valid (see `checkSyntax`).
 */
export function instrument(code: string): { code: string; points: StepPoint[] } {
  const program = parse(code, { ecmaVersion: "latest", allowReturnOutsideFunction: true, sourceType: "script", locations: true }) as unknown as AstNode;
  const points: StepPoint[] = [];
  const insertions: Insertion[] = [];
  const insert = (pos: number, rank: number, text: string) => insertions.push({ pos, rank, seq: insertions.length, text });

  /** End of a statement's "head": `if (x) `, `for (...) `, `while (x) `... or the whole statement. */
  const headEnd = (s: AstNode): number => {
    const inner = children(s).find((c) => isStatement(c) && c.type !== "VariableDeclaration");
    if (!inner) return s.end;
    let end = inner.start;
    while (end > s.start && /\s/.test(code[end - 1])) end--;
    return end;
  };

  const stepCall = (s: AstNode, scope: Scope) => {
    const vars = visible(scope);
    const loc = s.loc!;
    const end = headEnd(s);
    const endLine = code.slice(0, end).split("\n").length;
    const endCol = end - (code.lastIndexOf("\n", end - 1) + 1);
    points.push({ line: loc.start.line, col: loc.start.column, endLine, endCol, vars });
    const getters = vars.length ? `,[${vars.map((v) => `()=>${v}`).join(",")}]` : "";
    return `${HOOKS_NAME}.s(${points.length - 1}${getters});`;
  };

  /** A statement in a list (block, program, switch case): steps go just before it. */
  const visitListed = (s: AstNode, scope: Scope) => {
    if (stepsAt(s)) insert(s.start, OPEN, stepCall(s, scope));
    visitInside(s, scope);
  };

  /** A statement standing alone (`if (x) <here>`): wrapped in braces so the step stays attached. */
  const visitSingle = (s: AstNode, scope: Scope) => {
    if (!stepsAt(s)) return visitInside(s, scope);
    insert(s.start, OPEN, `{${stepCall(s, scope)}`);
    visitInside(s, scope);
    insert(s.end, CLOSE, "}");
  };

  const stepsAt = (s: AstNode) =>
    s.type !== "BlockStatement" && s.type !== "EmptyStatement" && s.type !== "FunctionDeclaration" && !(s.type === "ExpressionStatement" && s.directive);

  const visitList = (list: AstNode[], scope: Scope) => {
    for (const s of list) visitListed(s, scope);
  };

  const visitFunction = (f: AstNode, outer: Scope): void => {
    const params = (f.params as AstNode[]).flatMap((p) => patternNames(p));
    const own = f.type === "FunctionExpression" && f.id ? [(f.id as AstNode).name as string] : [];
    const scope: Scope = { names: [...params, ...own], parent: outer };
    for (const p of f.params as AstNode[]) visitExpression(p, scope);
    const body = f.body as AstNode;
    if (body.type !== "BlockStatement") return visitExpression(body, scope);
    const list = body.body as AstNode[];
    scope.names.push(...varNames(body), ...lexicalNames(list));
    if (list.length === 0) return;
    insert(body.start + 1, FN_ENTER, `${HOOKS_NAME}.i();try{`);
    visitList(list, scope);
    insert(body.end - 1, FN_EXIT, `}finally{${HOOKS_NAME}.o()}`);
  };

  /** Expressions can hold functions (callbacks), whose bodies have steps too. */
  const visitExpression = (n: AstNode, scope: Scope): void => {
    if (isFunction(n)) return visitFunction(n, scope);
    if (n.type === "StaticBlock") return visitInside(n, scope);
    for (const c of children(n)) {
      if (isStatement(c)) visitSingle(c, scope);
      else visitExpression(c, scope);
    }
  };

  const loopBody = (body: AstNode, scope: Scope) => {
    // `{__cr.l();...}` counts rounds, even for loops with an empty body.
    insert(body.start, OPEN, `{${HOOKS_NAME}.l();`);
    visitSingle(body, scope);
    insert(body.end, CLOSE, "}");
  };

  const visitInside = (s: AstNode, scope: Scope): void => {
    switch (s.type) {
      case "BlockStatement":
      case "StaticBlock": {
        const list = s.body as AstNode[];
        return visitList(list, { names: lexicalNames(list), parent: scope });
      }
      case "FunctionDeclaration":
        return visitFunction(s, scope);
      case "ForStatement":
      case "ForInStatement":
      case "ForOfStatement": {
        const head = (s.init ?? s.left) as AstNode | null;
        const names = head?.type === "VariableDeclaration" && head.kind !== "var" ? (head.declarations as AstNode[]).flatMap((d) => patternNames(d.id as AstNode)) : [];
        const loopScope: Scope = { names, parent: scope };
        for (const key of ["init", "left", "test", "update", "right"]) if (isNode(s[key])) visitExpression(s[key] as AstNode, loopScope);
        return loopBody(s.body as AstNode, loopScope);
      }
      case "WhileStatement":
      case "DoWhileStatement":
        visitExpression(s.test as AstNode, scope);
        return loopBody(s.body as AstNode, scope);
      case "LabeledStatement": {
        // A label must sit right on its loop (for `continue label`), so its body isn't wrapped.
        const body = s.body as AstNode;
        return isLoop(body) ? visitInside(body, scope) : visitSingle(body, scope);
      }
      case "SwitchStatement": {
        visitExpression(s.discriminant as AstNode, scope);
        const cases = s.cases as AstNode[];
        const caseScope: Scope = { names: lexicalNames(cases.flatMap((c) => c.consequent as AstNode[])), parent: scope };
        for (const c of cases) {
          if (c.test) visitExpression(c.test as AstNode, caseScope);
          visitList(c.consequent as AstNode[], caseScope);
        }
        return;
      }
      case "TryStatement": {
        visitInside(s.block as AstNode, scope);
        const handler = s.handler as AstNode | null;
        if (handler) visitInside(handler.body as AstNode, { names: patternNames(handler.param as AstNode | null), parent: scope });
        if (s.finalizer) visitInside(s.finalizer as AstNode, scope);
        return;
      }
      default:
        return visitExpression(s, scope);
    }
  };

  const body = program.body as AstNode[];
  const top: Scope = { names: [...varNames(program), ...lexicalNames(body)], parent: null };
  visitList(body, top);

  insertions.sort((a, b) => a.pos - b.pos || a.rank - b.rank || a.seq - b.seq);
  let out = "";
  let at = 0;
  for (const ins of insertions) {
    out += code.slice(at, ins.pos) + ins.text;
    at = ins.pos;
  }
  out += code.slice(at);
  return { code: out, points };
}

/** Checks, instruments and compiles a player's script for the debugger. */
export function compileInstrumented(code: string): { brain?: InstrumentedBrain; points?: StepPoint[]; error?: CompileError } {
  const syntax = checkSyntax(code);
  if (syntax) return { error: syntax };
  if (new RegExp(`\\b${HOOKS_NAME}`).test(code)) return { error: { message: message("debug.reservedName", { prefix: HOOKS_NAME }) } };
  const { code: traced, points } = instrument(code);
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const brain = new Function(...SCRIPT_GLOBALS, HOOKS_NAME, traced) as Brain;
    return { brain, points };
  } catch (e) {
    return { error: { message: friendlyRuntime(String((e as Error).message)) } };
  }
}
