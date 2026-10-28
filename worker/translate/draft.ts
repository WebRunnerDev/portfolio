import Anthropic from "@anthropic-ai/sdk"
import * as v from "valibot"
import type {
  DraftLang,
  TranslateRequestSchema,
  TranslateResponse,
} from "@contracts/api/translate"
import { protect, restore } from "./markdown"

// The draft Translation behind POST /api/admin/translate (worker/README.md ›
// Translation draft): one Messages API call to Claude, the fields as JSON in,
// the same fields as JSON out (structured outputs).

// Quality on kk and ar matters more than the price (issue #121).
export const MODEL = "claude-sonnet-5-5"

type Params = Anthropic.Beta.MessageCreateParamsNonStreaming

// The API call. An object, so that tests put a fake answer in with
// `vi.spyOn(claude, "send")` (vi.mock doesn't work in workerd).
export const claude = {
  send: async (apiKey: string, params: Params) =>
    new Anthropic({ apiKey, maxRetries: 1 }).beta.messages.create(params),
}

// Why there is no draft, for Workers Logs; the admin only learns that it
// failed.
export class DraftError extends Error {}

type Field = v.InferOutput<typeof TranslateRequestSchema>["fields"][number]

const LANGUAGE: Record<DraftLang, string> = {
  ru: "Russian",
  kk: "Kazakh (Cyrillic script)",
  es: "Spanish",
  de: "German",
  ar: "Modern Standard Arabic",
}

function system(lang: DraftLang, names: string[]) {
  return [
    `You translate the content of a web developer's portfolio site from English into ${LANGUAGE[lang]}.`,
    "The user message is a JSON object of fields; answer with the same fields, each translated. A list stays a list with one item per line it had.",
    "Write natural, concise text a native reader would expect on a professional site; keep the tone and the meaning, don't add or drop content.",
    "Keep Markdown as it is: headings, lists, emphasis, tables and line breaks stay where they are. Only the words change.",
    "Placeholders like ⟦0⟧ stand for code or links: keep each one exactly once, unchanged, where it belongs in the sentence.",
    `Never translate or transliterate these names; write them exactly as given: ${names.join(", ")}.`,
    "The same goes for any other name of a technology, product or company.",
  ].join("\n")
}

// The answer's shape: every field, a list where the field is one.
function outputSchema(fields: Field[]) {
  return {
    type: "object",
    properties: Object.fromEntries(
      fields.map((field) => [
        field.name,
        Array.isArray(field.value)
          ? { type: "array", items: { type: "string" } }
          : { type: "string" },
      ])
    ),
    required: fields.map((field) => field.name),
    additionalProperties: false,
  }
}

function answerSchema(fields: Field[]) {
  return v.object(
    Object.fromEntries(
      fields.map((field) => [
        field.name,
        Array.isArray(field.value)
          ? v.array(v.pipe(v.string(), v.trim(), v.nonEmpty()))
          : v.pipe(v.string(), v.trim(), v.nonEmpty()),
      ])
    )
  )
}

export async function translateDraft(
  apiKey: string,
  lang: DraftLang,
  fields: Field[],
  names: string[]
): Promise<TranslateResponse["fields"]> {
  const slots: Record<string, string[]> = {}
  const input = Object.fromEntries(
    fields.map((field) => {
      if (!field.markdown || typeof field.value !== "string") {
        return [field.name, field.value]
      }
      const masked = protect(field.value)
      slots[field.name] = masked.slots
      return [field.name, masked.text]
    })
  )

  const message = await claude.send(apiKey, {
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: outputSchema(fields) },
    },
    // A declined request is tried again on the model Anthropic picks.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: system(lang, names),
    messages: [{ role: "user", content: JSON.stringify(input) }],
  })
  if (message.stop_reason !== "end_turn") {
    throw new DraftError(`Stopped: ${message.stop_reason}`)
  }

  const text = message.content.find((block) => block.type === "text")?.text
  let json: unknown
  try {
    json = JSON.parse(text ?? "")
  } catch {
    throw new DraftError("Not JSON")
  }
  const answer = v.safeParse(answerSchema(fields), json)
  if (!answer.success) throw new DraftError("Not the fields asked for")

  const result: TranslateResponse["fields"] = {}
  for (const field of fields) {
    const value = answer.output[field.name] as string | string[]
    if (!slots[field.name]) {
      result[field.name] = value
      continue
    }
    const restored = restore(value as string, slots[field.name])
    if (restored === undefined) {
      throw new DraftError(`Placeholders lost in ${field.name}`)
    }
    result[field.name] = restored
  }
  return result
}
