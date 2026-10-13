/**
 * UI catalogs: every language must say everything English says, with the same placeholders
 * ({{name}}), the same markup (<b>…</b>) and every plural form the language needs.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES } from "@code-royale/content";
import i18n from "../i18n";
import { UI_TEXT } from "../i18n/resources";

const PLURAL = /_(zero|one|two|few|many|other)$/;

/** Every string in a catalog by path, with plural forms grouped under their base key. */
function entries(value: unknown, path = ""): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const walk = (v: unknown, p: string) => {
    if (typeof v === "string") {
      const key = p.replace(PLURAL, "");
      out.set(key, [...(out.get(key) ?? []), v]);
    } else if (v && typeof v === "object")
      for (const [k, child] of Object.entries(v)) walk(child, p ? `${p}.${k}` : k);
  };
  walk(value, path);
  return out;
}

function pluralForms(value: unknown, path = ""): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const walk = (v: unknown, p: string) => {
    if (typeof v === "string") {
      const m = PLURAL.exec(p);
      if (m) {
        const key = p.slice(0, m.index);
        out.set(key, (out.get(key) ?? new Set()).add(m[1]));
      }
    } else if (v && typeof v === "object")
      for (const [k, child] of Object.entries(v)) walk(child, p ? `${p}.${k}` : k);
  };
  walk(value, path);
  return out;
}

const placeholders = (texts: string[]) =>
  [...new Set(texts.flatMap((t) => [...t.matchAll(/\{\{\s*(\w+)[^}]*\}\}|<\/?(\w+)>/g)].map((m) => m[0].replace(/\s/g, ""))))].sort();

const source = entries(UI_TEXT[DEFAULT_LOCALE]);

describe.each(LOCALES)("%s UI catalog", (locale) => {
  const catalog = entries(UI_TEXT[locale]);

  it("has exactly the keys of the source language", () => {
    expect([...catalog.keys()].sort()).toEqual([...source.keys()].sort());
  });

  it("uses the same placeholders and markup", () => {
    for (const [key, texts] of source) expect(placeholders(catalog.get(key) ?? []), key).toEqual(placeholders(texts));
  });

  it("has every plural form the language needs", () => {
    const needed = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
    for (const [key, forms] of pluralForms(UI_TEXT[locale]))
      for (const form of needed) expect(forms.has(form), `${key}_${form}`).toBe(true);
  });

  it("leaves no text empty", () => {
    for (const [key, texts] of catalog) for (const text of texts) expect(text.trim(), key).not.toBe("");
  });
});

describe("the i18next instance", () => {
  it("knows every language and falls back to the source language", () => {
    for (const locale of LOCALES) expect(i18n.hasResourceBundle(locale, "translation")).toBe(true);
    expect(i18n.options.fallbackLng).toEqual([DEFAULT_LOCALE]);
  });

  it("formats plurals, placeholders and nested lists", () => {
    const fr = i18n.getFixedT("fr");
    expect(fr("renderer.teamBar.blue", { count: 1 })).toBe("BLEUS · 1 combattant");
    expect(fr("renderer.teamBar.blue", { count: 3 })).toBe("BLEUS · 3 combattants");
    expect(fr("messages.runtime.notDefined", { name: "enemi" })).toContain('"enemi"');
    const rules = fr("guide.rules", { returnObjects: true, bushDetect: 90, scoutBushDetect: 170 });
    expect(rules.find((r) => r.text.includes("90"))?.text).toContain("170");
  });
});
