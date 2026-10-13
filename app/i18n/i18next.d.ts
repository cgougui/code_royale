// Typed translation keys: t("header.guide") is checked against the English catalog.
import "i18next";
import type { UiCatalog } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: UiCatalog };
  }
}
