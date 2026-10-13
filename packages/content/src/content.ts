/** Joins the language-independent specs with one locale's text: the content as the app shows it. */
import type { ItemKind, SpawnSpec, UnitType } from "@code-royale/engine";
import { API_SPEC, type ApiGroupId } from "./api-docs";
import { goalLabel } from "./goals";
import { LOCALES, type Locale } from "./i18n";
import { LEVELS } from "./levels";
import { CONTENT_TEXT } from "./locales";
import { STRATEGY_TEAMS } from "./strategies";
import type { ApiDoc, ApiGroup, ApiItemText, ContentText, ItemText, Level, LevelSpec, LevelText, Strategy, StrategyId, UnitText } from "./types";

export interface Content {
  locale: Locale;
  /** The campaign, in order. */
  levels: readonly Level[];
  /** A level by id (the first level if the id is unknown). */
  level(id: string): Level;
  strategies: Readonly<Record<StrategyId, Strategy>>;
  /** The code every player starts with. */
  starter: Strategy;
  api: readonly ApiGroup[];
  meDocs: readonly ApiDoc[];
  globalDocs: readonly ApiDoc[];
  unitDocs: readonly ApiDoc[];
  units: Readonly<Record<UnitType, UnitText>>;
  items: Readonly<Record<ItemKind, ItemText>>;
}

const cache = new Map<Locale, Content>();

/** Everything players read, in `locale`. Built once per locale. */
export function contentFor(locale: Locale): Content {
  let content = cache.get(locale);
  if (!content) cache.set(locale, (content = build(locale, CONTENT_TEXT[locale])));
  return content;
}

/** True when `code` is the untouched starter code, in any language (so it can follow a language change). */
export function isStarterCode(code: string): boolean {
  const trimmed = code.trim();
  return LOCALES.some((l) => CONTENT_TEXT[l].strategies.starter.code.trim() === trimmed);
}

function build(locale: Locale, text: ContentText): Content {
  const strategies = Object.fromEntries(
    Object.entries(STRATEGY_TEAMS).map(([id, team]) => [id, { id, team, ...text.strategies[id as StrategyId] }]),
  ) as Record<StrategyId, Strategy>;
  const levels = LEVELS.map((spec) => localizeLevel(spec, text, strategies));
  const api = (Object.keys(API_SPEC) as ApiGroupId[]).map((id): ApiGroup => {
    const spec = API_SPEC[id];
    const groupText = text.api[id];
    const items = groupText.items as Record<string, ApiItemText>;
    return {
      id,
      emoji: spec.emoji,
      owner: spec.owner,
      title: groupText.title,
      intro: groupText.intro,
      items: Object.entries(spec.items).map(([name, kind]) => ({ name, kind, ...items[name] })),
    };
  });
  const docs = (owner: ApiGroup["owner"]) => api.filter((g) => g.owner === owner).flatMap((g) => g.items);
  return {
    locale,
    levels,
    level: (id) => levels.find((l) => l.id === id) ?? levels[0],
    strategies,
    starter: strategies.starter,
    api,
    meDocs: docs("me"),
    globalDocs: docs("global"),
    unitDocs: docs("unit"),
    units: text.units,
    items: text.items,
  };
}

function localizeLevel(spec: LevelSpec, text: ContentText, strategies: Record<StrategyId, Strategy>): Level {
  const { names, ...levelText }: LevelText = text.levels[spec.id];
  const named = (specs: SpawnSpec[]) => specs.map((s) => (s.name ? { ...s, name: names?.[s.name] ?? s.name } : s));
  return {
    ...spec,
    ...levelText,
    blue: named(spec.blue),
    red: named(spec.red),
    waves: spec.waves?.map(named),
    stars: spec.stars.map((goal) => ({ goal, label: goalLabel(goal, text.goals) })) as Level["stars"],
    redStrategy: strategies[spec.redStrategy],
  };
}
