import { autocompletion, snippetCompletion, type Completion, type CompletionContext } from "@codemirror/autocomplete";
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { forceLinting, linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { Compartment, EditorState, Prec, RangeSet, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, gutter, GutterMarker, hoverTooltip, keymap, type DecorationSet } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { GLOBAL_DOCS, ME_DOCS, UNIT_DOCS, type ApiDoc } from "@code-royale/content";
import { checkSyntax, type TraceStep, type TraceVar } from "@code-royale/engine";

export interface CodeEditorHandle {
  insert: (code: string) => void;
  goToLine: (line: number) => void;
}

/** What the debugger is showing: the current step, and the variables to show on hover. */
export interface EditorDebugInfo {
  step: TraceStep | null;
  vars: TraceVar[];
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  runtimeError: { line?: number; message: string } | null;
  /** Set while debugging: the code is locked and the current step is highlighted. */
  debug?: EditorDebugInfo | null;
  onBreakpointsChange?: (lines: number[]) => void;
}

// ---- debugger: breakpoints, current step, values on hover

class BreakpointMarker extends GutterMarker {
  elementClass = "cm-bp-on";
  toDOM() {
    const dot = document.createElement("span");
    dot.className = "cm-bp-dot";
    return dot;
  }
}
class StepMarker extends GutterMarker {
  constructor(readonly error: boolean) {
    super();
  }
  eq(o: StepMarker) {
    return o.error === this.error;
  }
  toDOM() {
    const arrow = document.createElement("span");
    arrow.className = `cm-step-arrow${this.error ? " error" : ""}`;
    arrow.textContent = this.error ? "💥" : "➜";
    return arrow;
  }
}
const breakpointMarker = new BreakpointMarker();
/** An invisible marker that gives the gutter its width. */
const spacer = new (class extends GutterMarker {
  toDOM() {
    const s = document.createElement("span");
    s.className = "cm-bp-dot";
    s.style.visibility = "hidden";
    return s;
  }
})();

const toggleBreakpointEffect = StateEffect.define<{ pos: number; on: boolean }>({
  map: (v, m) => ({ pos: m.mapPos(v.pos), on: v.on }),
});

/** Breakpoints live in the editor state so they follow the lines when the code is edited. */
const breakpoints = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(set, tr) {
    set = set.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(toggleBreakpointEffect)) continue;
      const line = tr.state.doc.lineAt(e.value.pos);
      set = set.update({ filter: (from) => from < line.from || from > line.to });
      if (e.value.on) set = set.update({ add: [breakpointMarker.range(line.from)] });
    }
    return set;
  },
});

function hasBreakpoint(state: EditorState, line: { from: number; to: number }) {
  let found = false;
  state.field(breakpoints).between(line.from, line.to, () => {
    found = true;
  });
  return found;
}

function toggleBreakpoint(view: EditorView, pos: number) {
  const line = view.state.doc.lineAt(pos);
  view.dispatch({ effects: toggleBreakpointEffect.of({ pos: line.from, on: !hasBreakpoint(view.state, line) }) });
}

function breakpointLines(state: EditorState): number[] {
  const lines = new Set<number>();
  for (let it = state.field(breakpoints).iter(); it.value; it.next()) lines.add(state.doc.lineAt(it.from).number);
  return [...lines].sort((a, b) => a - b);
}

const setStepEffect = StateEffect.define<TraceStep | null>();

/** Highlights the statement about to run (or the line that crashed). */
const currentStep = StateField.define<{ deco: DecorationSet; arrow: RangeSet<GutterMarker> }>({
  create: () => ({ deco: Decoration.none, arrow: RangeSet.empty }),
  update(v, tr) {
    let next = { deco: v.deco.map(tr.changes), arrow: v.arrow.map(tr.changes) };
    for (const e of tr.effects) {
      if (!e.is(setStepEffect)) continue;
      const step = e.value;
      const doc = tr.state.doc;
      if (!step?.line || step.line > doc.lines) {
        next = { deco: Decoration.none, arrow: RangeSet.empty };
        continue;
      }
      const error = step.kind === "error";
      const line = doc.line(step.line);
      const ranges = [Decoration.line({ class: error ? "cm-step-line error" : "cm-step-line" }).range(line.from)];
      if (step.col !== undefined && step.endLine && step.endLine <= doc.lines) {
        const from = Math.min(line.to, line.from + step.col);
        const end = doc.line(step.endLine);
        const to = Math.min(end.to, end.from + (step.endCol ?? 0));
        if (to > from) ranges.push(Decoration.mark({ class: "cm-step-range" }).range(from, to));
      }
      next = { deco: Decoration.set(ranges, true), arrow: RangeSet.of([new StepMarker(error).range(line.from)]) };
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco),
});

function debuggerExtensions(vars: () => TraceVar[] | null): Extension[] {
  return [
    breakpoints,
    currentStep,
    gutter({
      class: "cm-bp-gutter",
      markers: (v) => [v.state.field(breakpoints), v.state.field(currentStep).arrow],
      initialSpacer: () => spacer,
      renderEmptyElements: true,
      domEventHandlers: {
        mousedown(view, line) {
          toggleBreakpoint(view, line.from);
          return true;
        },
      },
    }),
    keymap.of([
      {
        key: "F9",
        run: (view) => {
          toggleBreakpoint(view, view.state.selection.main.head);
          return true;
        },
      },
    ]),
    hoverTooltip((view, pos) => {
      const list = vars();
      const word = list && view.state.wordAt(pos);
      if (!list || !word) return null;
      const name = view.state.sliceDoc(word.from, word.to);
      // `me.health`, `enemy.x`...: look inside the variable before the dot.
      const owner = /(\w+)\.$/.exec(view.state.sliceDoc(Math.max(0, word.from - 40), word.from))?.[1];
      const value = owner
        ? list.find((v) => v.name === owner)?.value.children?.find((c) => c.key === name)?.value
        : list.find((v) => v.name === name)?.value;
      if (!value) return null;
      return {
        pos: word.from,
        end: word.to,
        above: true,
        create() {
          const dom = document.createElement("div");
          dom.className = "cm-var-tip";
          const label = document.createElement("b");
          label.textContent = `${owner ? `${owner}.` : ""}${name} = `;
          const text = document.createElement("span");
          text.className = `cm-var-tip-${value.kind}`;
          text.textContent = value.text;
          dom.append(label, text);
          return { dom };
        },
      };
    }),
  ];
}

const ARRAY_DOCS: Completion[] = [
  { label: "find", type: "method", detail: "list.find(x => ...)", info: "The first one that matches, or undefined." },
  { label: "filter", type: "method", detail: "list.filter(x => ...)", info: "A new list with only the ones that match." },
  { label: "some", type: "method", detail: "list.some(x => ...)", info: "true if at least one matches." },
  { label: "forEach", type: "method", detail: "list.forEach(x => ...)", info: "Do something with each one." },
  { label: "length", type: "property", detail: "list.length", info: "How many there are." },
];
const ARENA_DOCS: Completion[] = [
  ...["width", "height", "centerX", "centerY"].map((label) => ({ label, type: "property", info: "Arena size" })),
  { label: "bushes", type: "property", info: "List of bushes to hide in (x, y, radius)" },
  { label: "rocks", type: "property", info: "List of rocks that block moving and seeing (x, y, radius)" },
];

function toCompletion(d: ApiDoc, boost = 0): Completion {
  const base = { label: d.name, detail: d.usage, info: d.description, boost };
  if (d.kind !== "method" && d.kind !== "function") return { ...base, type: d.kind === "variable" ? "variable" : "property" };
  const first = d.usage.split("  or  ")[0].replace(/^me\./, "");
  const snippet = first.replace(/\(([^)]*)\)/, (_, args: string) => (args ? `(${args.split(", ").map((a) => `\${${a}}`).join(", ")})` : "()${}"));
  return snippetCompletion(snippet, { ...base, type: d.kind === "method" ? "method" : "function" });
}

const ME_COMPLETIONS = ME_DOCS.map((d) => toCompletion(d));
const GLOBAL_COMPLETIONS = [
  { label: "me", type: "variable", detail: "your fighter", info: "The fighter running this code. Type me. to see what it can do!", boost: 10 } as Completion,
  ...GLOBAL_DOCS.map((d) => toCompletion(d, 5)),
];
const UNIT_COMPLETIONS = UNIT_DOCS.map((d) => toCompletion(d));

function royaleCompletions(ctx: CompletionContext) {
  const member = ctx.matchBefore(/[\w$]+\.\w*/);
  if (member) {
    const dot = member.text.indexOf(".");
    const obj = member.text.slice(0, dot);
    const from = member.from + dot + 1;
    if (obj === "me") return { from, options: ME_COMPLETIONS, validFor: /^\w*$/ };
    if (obj === "enemies" || obj === "allies" || obj === "items") return { from, options: ARRAY_DOCS, validFor: /^\w*$/ };
    if (obj === "arena") return { from, options: ARENA_DOCS, validFor: /^\w*$/ };
    if (["team", "memory", "Math", "console"].includes(obj)) return null;
    return { from, options: UNIT_COMPLETIONS, validFor: /^\w*$/ };
  }
  const word = ctx.matchBefore(/\w+/);
  if (!word || (word.from === word.to && !ctx.explicit)) return null;
  return { from: word.from, options: GLOBAL_COMPLETIONS, validFor: /^\w*$/ };
}

const royaleTheme = EditorView.theme(
  {
    "&": { backgroundColor: "transparent", color: "#ede9fe", fontSize: "15px" },
    ".cm-content": { fontFamily: "'JetBrains Mono', monospace", caretColor: "#fbbf24", padding: "10px 0" },
    ".cm-scroller": { fontFamily: "'JetBrains Mono', monospace", lineHeight: "1.65" },
    ".cm-gutters": { backgroundColor: "rgba(0,0,0,0.18)", color: "#5d5584", border: "none", paddingRight: "4px" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(139,92,246,0.18)", color: "#c4b5fd" },
    ".cm-activeLine": { backgroundColor: "rgba(139,92,246,0.08)" },
    ".cm-cursor": { borderLeftColor: "#fbbf24", borderLeftWidth: "2px" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "rgba(139,92,246,0.35) !important" },
    ".cm-matchingBracket": { backgroundColor: "rgba(251,191,36,0.25)", outline: "none" },
    ".cm-tooltip": { backgroundColor: "#231b3d", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", overflow: "hidden" },
    ".cm-tooltip-autocomplete > ul": { fontFamily: "'JetBrains Mono', monospace", maxHeight: "260px" },
    ".cm-tooltip-autocomplete > ul > li": { padding: "3px 10px !important" },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "#6d28d9", color: "white" },
    ".cm-completionDetail": { color: "#a59cc4", fontStyle: "normal", marginLeft: "10px" },
    ".cm-completionInfo": { fontFamily: "Fredoka, sans-serif", fontSize: "14px", padding: "8px 10px", maxWidth: "260px" },
    ".cm-diagnostic": { fontFamily: "Fredoka, sans-serif", fontSize: "14px" },
    ".cm-lintRange-error": { backgroundImage: "none", textDecoration: "underline wavy #f87171", textUnderlineOffset: "3px" },
    ".cm-lint-marker-error": { content: "none" },
    ".cm-panels": { backgroundColor: "#231b3d" },
  },
  { dark: true },
);

const royaleHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#f472b6", fontWeight: "600" },
  { tag: [t.string, t.special(t.string)], color: "#86efac" },
  { tag: [t.number, t.bool, t.null], color: "#fdba74" },
  { tag: t.comment, color: "#7c739f", fontStyle: "italic" },
  { tag: t.propertyName, color: "#93c5fd" },
  { tag: t.function(t.propertyName), color: "#fde68a" },
  { tag: t.function(t.variableName), color: "#fde68a" },
  { tag: t.variableName, color: "#ede9fe" },
  { tag: t.definition(t.variableName), color: "#c4b5fd" },
  { tag: [t.operator, t.compareOperator, t.logicOperator], color: "#f9a8d4" },
  { tag: [t.paren, t.brace, t.squareBracket], color: "#a5b4fc" },
]);

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor({ value, onChange, onRun, runtimeError, debug, onBreakpointsChange }, ref) {
  const cm = useRef<ReactCodeMirrorRef>(null);
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const errRef = useRef(runtimeError);
  errRef.current = runtimeError;
  const varsRef = useRef<TraceVar[] | null>(null);
  varsRef.current = debug?.vars ?? null;
  const bpRef = useRef(onBreakpointsChange);
  bpRef.current = onBreakpointsChange;
  const readOnly = useMemo(() => new Compartment(), []);

  useImperativeHandle(ref, () => ({
    insert(code: string) {
      const view = cm.current?.view;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      // Insert on a fresh line, keeping the current indentation.
      const indent = /^\s*/.exec(line.text)?.[0] ?? "";
      const atEmptyLine = line.text.trim() === "";
      const text = (atEmptyLine ? "" : "\n") + code.split("\n").map((l, i) => (i === 0 && atEmptyLine ? l : indent + l)).join("\n") + "\n";
      const pos = atEmptyLine ? from : line.to;
      view.dispatch({ changes: { from: pos, to: atEmptyLine ? to : pos, insert: text }, selection: { anchor: pos + text.length } });
      view.focus();
    },
    goToLine(n: number) {
      const view = cm.current?.view;
      if (!view || n < 1 || n > view.state.doc.lines) return;
      const line = view.state.doc.line(n);
      view.dispatch({ selection: { anchor: line.from, head: line.to }, scrollIntoView: true });
      view.focus();
    },
  }));

  const extensions = useMemo(
    () => [
      javascript(),
      javascriptLanguage.data.of({ autocomplete: royaleCompletions }),
      autocompletion({ activateOnTyping: true, icons: true }),
      syntaxHighlighting(royaleHighlight),
      royaleTheme,
      lintGutter(),
      linter(
        (view) => {
          const diags: Diagnostic[] = [];
          const doc = view.state.doc;
          const lineRange = (n: number) => {
            const l = doc.line(Math.max(1, Math.min(doc.lines, n)));
            return { from: l.from, to: Math.max(l.from, l.to) };
          };
          const syntax = checkSyntax(doc.toString());
          if (syntax?.line) diags.push({ ...lineRange(syntax.line), severity: "error", message: `🤔 ${syntax.message}` });
          const rt = errRef.current;
          if (!syntax && rt?.line) diags.push({ ...lineRange(rt.line), severity: "error", message: `💥 ${rt.message}` });
          return diags;
        },
        { delay: 400 },
      ),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              runRef.current();
              return true;
            },
          },
          {
            key: "Mod-s",
            run: () => {
              runRef.current();
              return true;
            },
          },
        ]),
      ),
      EditorView.lineWrapping,
      debuggerExtensions(() => varsRef.current),
      readOnly.of(EditorState.readOnly.of(false)),
      EditorView.updateListener.of((u) => {
        if (u.startState.field(breakpoints) !== u.state.field(breakpoints)) bpRef.current?.(breakpointLines(u.state));
      }),
    ],
    [readOnly],
  );

  // Debugging: lock the code and follow the current step.
  const debugging = !!debug;
  useEffect(() => {
    cm.current?.view?.dispatch({ effects: readOnly.reconfigure(EditorState.readOnly.of(debugging)) });
  }, [debugging, readOnly]);
  const step = debug?.step ?? null;
  useEffect(() => {
    const view = cm.current?.view;
    if (!view) return;
    const effects: StateEffect<unknown>[] = [setStepEffect.of(step)];
    if (step?.line && step.line <= view.state.doc.lines) effects.push(EditorView.scrollIntoView(view.state.doc.line(step.line).from, { y: "nearest", yMargin: 40 }));
    view.dispatch({ effects });
  }, [step]);

  useEffect(() => {
    const view = cm.current?.view;
    if (view) forceLinting(view);
  }, [runtimeError]);

  return (
    <CodeMirror
      ref={cm}
      className="cr-editor"
      value={value}
      onChange={onChange}
      theme="none"
      height="100%"
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        autocompletion: false,
        bracketMatching: true,
        closeBrackets: true,
        indentOnInput: true,
        tabSize: 2,
      }}
    />
  );
});
