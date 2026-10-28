import Anthropic from "@anthropic-ai/sdk"
import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import {
  TranslateRequestSchema,
  type TranslateResponse,
} from "@contracts/api/translate"
import { DraftError, translateDraft } from "../../../translate/draft"
import { keptNames } from "../../../translate/names"
import type { AdminEnv } from "../../access"
import { apiError, methodNotAllowed, rejectInvalidFields } from "../../errors"

// /api/admin/translate (worker/README.md › Translation draft): EN fields in,
// the same fields in another Lang out. Nothing is saved.
export const translate = new Hono<AdminEnv>()
  .post(
    "/",
    sValidator("json", TranslateRequestSchema, rejectInvalidFields),
    async (c) => {
      // A secret (`wrangler secret put`); the client never sees it.
      const apiKey = c.env.ANTHROPIC_API_KEY
      if (!apiKey) return apiError(c, 503, "translator_unavailable")
      const { lang, fields } = c.req.valid("json")
      try {
        const translated = await translateDraft(
          apiKey,
          lang,
          fields,
          await keptNames(c.env.DB)
        )
        return c.json({ fields: translated } satisfies TranslateResponse)
      } catch (err) {
        // The SDK's errors (auth, limits, overload, network) and an answer
        // that can't be used alike: details go to Workers Logs.
        if (!(err instanceof DraftError || err instanceof Anthropic.APIError)) {
          throw err
        }
        console.error({ message: "translate", lang, err })
        return apiError(c, 502, "translation_failed")
      }
    }
  )
  .all("/", methodNotAllowed("POST"))
