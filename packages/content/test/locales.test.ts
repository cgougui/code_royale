/**
 * Translations must say the same thing as the source language (English), in another language:
 * same structure, and code that only differs in comments and texts.
 */
import { tokenizer } from "acorn";
import { checkSyntax, runBattle } from "@code-royale/engine";
import { contentFor, DEFAULT_LOCALE, LEVELS, LOCALES, LOCALE_NAMES, toBattleSetup } from "@code-royale/content";
import { describe, expect, it } from "vitest";
import { CONTENT_TEXT } from "../src/locales";

const source = CONTENT_TEXT[DEFAULT_LOCALE];
const translations = LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => [l, CONTENT_TEXT[l]] as const);

/** The code without its comments and with every text emptied: what actually runs. */
function codeShape(code: string): string[] {
  return [...tokenizer(code, { ecmaVersion: "latest", allowReturnOutsideFunction: true })].map((t) =>
    t.type.label === "string" || t.type.label === "template" ? t.type.label : code.slice(t.start, t.end),
  );
}

/** Every string in a catalog, with its path. */
function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") return strings(value(7), `${path}(7)`);
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  return [];
}

describe("locales", () => {
  it("each have a name for the language picker", () => {
    for (const l of LOCALES) expect(LOCALE_NAMES[l]).toBeTruthy();
  });

  it.each(LOCALES)("%s: no text is left empty", (locale) => {
    for (const [path, text] of strings(CONTENT_TEXT[locale])) expect(text.trim(), path).not.toBe("");
  });

  it.each(LOCALES)("%s: star goals mention their number", (locale) => {
    const { goals } = CONTENT_TEXT[locale];
    expect(goals.survivors(4)).toContain("4");
    expect(goals.waves(12)).toContain("12");
  });

  it.each(LOCALES)("%s: names every named fighter, and explains every uneven level", (locale) => {
    for (const spec of LEVELS) {
      const text = CONTENT_TEXT[locale].levels[spec.id];
      expect(!!text.note, `${spec.id}: note`).toBe(!!spec.unevenArmies);
      const named = [spec.blue, spec.red, ...(spec.waves ?? [])].flat().flatMap((s) => (s.name ? [s.name] : []));
      for (const name of named) expect(text.names?.[name], `${spec.id}: ${name}`).toBeTruthy();
    }
  });
});

describe.each(translations)("%s matches the source language", (locale, text) => {
  it("has the same hints, with the same code", () => {
    for (const spec of LEVELS) {
      const ours = text.levels[spec.id].hints;
      const theirs = source.levels[spec.id].hints;
      expect(ours.length, spec.id).toBe(theirs.length);
      ours.forEach((hint, i) => {
        const where = `${spec.id}, hint ${i + 1}`;
        expect(!!hint.code, where).toBe(!!theirs[i].code);
        if (hint.code) {
          expect(checkSyntax(hint.code), where).toBeNull();
          expect(codeShape(hint.code), where).toEqual(codeShape(theirs[i].code!));
        }
      });
    }
  });

  it("has the same strategies: only comments and texts are translated", () => {
    for (const [id, strategy] of Object.entries(text.strategies)) {
      expect(checkSyntax(strategy.code), id).toBeNull();
      expect(codeShape(strategy.code), id).toEqual(codeShape(source.strategies[id as keyof typeof source.strategies].code));
    }
  });

  it("has the same API examples", () => {
    for (const [group, { items }] of Object.entries(text.api))
      for (const [name, item] of Object.entries(items) as [string, { example?: string }][]) {
        const original = (source.api[group as keyof typeof source.api].items as Record<string, { example?: string }>)[name];
        expect(!!item.example, `${group}.${name}`).toBe(!!original.example);
        if (item.example) expect(codeShape(item.example), `${group}.${name}`).toEqual(codeShape(original.example!));
      }
  });

  it("fights exactly the same battles", () => {
    const ours = contentFor(locale);
    const theirs = contentFor(DEFAULT_LOCALE);
    for (const level of ours.levels.filter((l) => !l.endless)) {
      const fight = (c: typeof ours) => runBattle(toBattleSetup(c.level(level.id), c.starter.code, 5)).result;
      const a = fight(ours)!;
      const b = fight(theirs)!;
      expect({ ...a, said: false }, level.id).toEqual({ ...b, said: false });
    }
  });
});
