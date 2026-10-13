import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  contentFor,
  DEFAULT_LOCALE,
  isLocale,
  type Content,
  type Locale,
} from "@code-royale/content";
import type { Inspected } from "@code-royale/engine";
import type { RendererText } from "@code-royale/renderer";
import type { AppMessage } from "~/domain/messages";

/** The player's language, and a way to change it (remembered for next time). */
export function useLocale(): [Locale, (locale: Locale) => void] {
  const { i18n } = useTranslation();
  const locale = isLocale(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : DEFAULT_LOCALE;
  const setLocale = useCallback(
    (next: Locale) => void i18n.changeLanguage(next),
    [i18n],
  );
  return [locale, setLocale];
}

/** Levels, strategies and API docs in the player's language. */
export function useContent(): Content {
  return contentFor(useLocale()[0]);
}

/** Turns an engine or app message (a code and its parameters) into text. */
export function useFormatMessage(): (message: AppMessage) => string {
  const { t } = useTranslation();
  return useCallback(
    (m: AppMessage) => t(`messages.${m.code}`, m.params),
    [t],
  );
}

/** A debugger value's one-line summary, with the words the engine leaves to the UI. */
export function useFormatInspected(): (value: Inspected) => string {
  const { t } = useTranslation();
  return useCallback(
    (v: Inspected) => {
      if (v.kind === "unset") return t("debugger.unset");
      if (v.circular) return t("debugger.circular");
      if (v.count === 0) return `[] ${t("debugger.emptyList")}`;
      if (v.count !== undefined)
        return `${v.text}  ${t("debugger.listCount", { count: v.count })}`;
      return v.text;
    },
    [t],
  );
}

/** The words drawn on the arena canvas. */
export function useRendererText(): RendererText {
  const { t } = useTranslation();
  const { locale, units } = useContent();
  return useMemo(
    (): RendererText => ({
      teamBar: (team, count) => t(`renderer.teamBar.${team}`, { count }),
      wave: (number) => t("renderer.wave", { number }),
      waveIncoming: t("renderer.waveIncoming"),
      slowMotion: t("renderer.slowMotion"),
      speed: (speed) => t("renderer.speed", { speed }),
      detectionRadius: (radius) => t("renderer.detectionRadius", { radius }),
      unitTitle: (name, type) =>
        t("renderer.unitTitle", { name, type: units[type].name }),
      hidden: t("renderer.hidden"),
      spotted: t("renderer.spotted"),
      acts: t("renderer.acts", { returnObjects: true }),
      pickup: t("renderer.pickup", { returnObjects: true }),
      special: (type) =>
        t("renderer.special", {
          name: units[type].special.name.toLocaleUpperCase(locale),
        }),
      outcome: {
        victory: t("result.victory"),
        defeat: t("result.defeat"),
        timeUp: t("result.timeUp"),
      },
    }),
    [t, locale, units],
  );
}

/** Keeps the page's language, writing direction and title in step with the player's language. */
export function useDocumentLocale(): void {
  const { t, i18n } = useTranslation();
  const [locale] = useLocale();
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = i18n.dir(locale);
    document.title = t("meta.title");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("meta.description"));
  }, [locale, t, i18n]);
}
