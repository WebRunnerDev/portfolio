import type { Lang } from "@contracts/lang"

import { ar } from "./ar"
import { de } from "./de"
import { en, type Messages } from "./en"
import { es } from "./es"
import { kk } from "./kk"
import { ru } from "./ru"

export type { MessageKey, Messages } from "./en"

export const MESSAGES: Record<Lang, Messages> = { en, ru, kk, es, de, ar }
