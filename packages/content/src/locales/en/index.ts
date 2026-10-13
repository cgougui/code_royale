/** English: the source language. Every other locale has exactly this shape. */
import type { ContentText } from "../../types";
import { api } from "./api";
import { goals, items, units } from "./game";
import { levels } from "./levels";
import { strategies } from "./strategies";

export const en: ContentText = { levels, goals, strategies, api, units, items };
