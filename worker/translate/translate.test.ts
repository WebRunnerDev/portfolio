// Runs in workerd (the `worker` project in vite.config.ts) against the local
// D1. The Claude API is replaced by a fake answer (`vi.spyOn(claude, "send")`);
// admin calls go through the dev bypass (localhost + ACCESS_DEV_EMAIL).
import Anthropic from "@anthropic-ai/sdk"
import { env } from "cloudflare:workers"
import * as v from "valibot"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest"
import { ApiErrorSchema, ValidationErrorSchema } from "@contracts/api/errors"
import { BRAND } from "@contracts/meta"
import {
  TranslateResponseSchema,
  type TranslateRequest,
} from "@contracts/api/translate"
import { api } from "../api"
import { claude, MODEL } from "./draft"
import { protect, restore } from "./markdown"

const KEY = "sk-ant-test-key"

const adminEnv = {
  ...env,
  ACCESS_DEV_EMAIL: "owner@example.com",
  ANTHROPIC_API_KEY: KEY,
}

let send: MockInstance<typeof claude.send>

beforeEach(() => {
  send = vi.spyOn(claude, "send")
})

afterEach(() => {
  vi.restoreAllMocks()
})

function translate(body: TranslateRequest, workerEnv: Env = adminEnv) {
  return api.request(
    "http://localhost/api/admin/translate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    workerEnv
  )
}

type Params = Parameters<typeof claude.send>[1]

// What the call was asked: the system prompt and the fields as sent.
function sent() {
  const params = send.mock.lastCall![1] as Params
  return {
    params,
    system: params.system as string,
    fields: JSON.parse(params.messages[0].content as string) as Record<
      string,
      string | string[]
    >,
  }
}

// The model's answer: `fields` as its JSON text.
function answer(
  fields: Record<string, unknown>,
  stop_reason: Anthropic.Beta.BetaStopReason = "end_turn"
) {
  send.mockResolvedValue({
    stop_reason,
    content: [{ type: "text", text: JSON.stringify(fields) }],
  } as Anthropic.Beta.BetaMessage)
}

// Answers what was sent, each string run through `change`: a translation
// that keeps the placeholders.
function echo(change: (text: string) => string) {
  send.mockImplementation(async (_, params) => {
    const fields = JSON.parse(params.messages[0].content as string) as Record<
      string,
      string | string[]
    >
    const changed = Object.fromEntries(
      Object.entries(fields).map(([name, value]) => [
        name,
        Array.isArray(value) ? value.map(change) : change(value),
      ])
    )
    return {
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(changed) }],
    } as Anthropic.Beta.BetaMessage
  })
}

async function translated(response: Response) {
  expect(response.status).toBe(200)
  return v.parse(TranslateResponseSchema, await response.json()).fields
}

async function failed(response: Response, status: number) {
  expect(response.status).toBe(status)
  return v.parse(ApiErrorSchema, await response.json()).error
}

describe("POST /api/admin/translate", () => {
  it("translates text and line fields into the Lang", async () => {
    answer({ role: "Разработчик", bullets: ["Сделал сайт", "Сделал API"] })
    const fields = await translated(
      await translate({
        lang: "ru",
        fields: [
          { name: "role", value: "Developer" },
          { name: "bullets", value: ["Built the site", "Built the API"] },
        ],
      })
    )
    expect(fields).toEqual({
      role: "Разработчик",
      bullets: ["Сделал сайт", "Сделал API"],
    })

    const { params, system, fields: input } = sent()
    expect(send.mock.lastCall![0]).toBe(KEY)
    expect(params.model).toBe(MODEL)
    expect(system).toContain("Russian")
    expect(input).toEqual({
      role: "Developer",
      bullets: ["Built the site", "Built the API"],
    })
    // The answer is held to the same fields, a list as a list.
    expect(params.output_config?.format).toEqual({
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          role: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["role", "bullets"],
        additionalProperties: false,
      },
    })
  })

  it("names the Kazakh script and Arabic variety", async () => {
    answer({ title: "Жоба" })
    await translate({
      lang: "kk",
      fields: [{ name: "title", value: "Project" }],
    })
    expect(sent().system).toContain("Kazakh (Cyrillic script)")
    answer({ title: "مشروع" })
    await translate({
      lang: "ar",
      fields: [{ name: "title", value: "Project" }],
    })
    expect(sent().system).toContain("Modern Standard Arabic")
  })

  it("keeps code, links and URLs of Markdown out of the model's reach", async () => {
    const body = [
      "# Setup",
      "",
      'Run `npm install` and read [the docs](https://example.com/docs "Docs").',
      "",
      "```ts",
      "// a comment to keep",
      'const url = "https://api.example.com"',
      "```",
      "",
      "![Diagram](/media/diagram.png) More on https://webrunner.dev.",
    ].join("\n")
    echo((text) =>
      text.replace("Setup", "Установка").replace("Run", "Запустите")
    )

    const fields = await translated(
      await translate({
        lang: "ru",
        fields: [
          { name: "title", value: "Setup" },
          { name: "body", value: body, markdown: true },
        ],
      })
    )

    const input = sent().fields.body as string
    for (const hidden of [
      "npm install",
      "https://example.com/docs",
      "a comment to keep",
      "/media/diagram.png",
      "https://webrunner.dev",
    ]) {
      expect(input).not.toContain(hidden)
    }
    // Link text and alt text are still there to translate.
    expect(input).toContain("[the docs](⟦")
    expect(input).toContain("![Diagram](⟦")
    expect(fields.body).toBe(
      body.replace("Setup", "Установка").replace("Run", "Запустите")
    )
    // A field without `markdown` goes as it is.
    expect(fields.title).toBe("Установка")
  })

  it("fails rather than lose code or links the model dropped", async () => {
    echo((text) => text.replace(/⟦0⟧/, ""))
    const response = await translate({
      lang: "de",
      fields: [{ name: "body", value: "Use `x` here.", markdown: true }],
    })
    expect(await failed(response, 502)).toBe("translation_failed")
  })

  describe("kept names", () => {
    beforeAll(async () => {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO profile (id) VALUES (1)"),
        env.DB.prepare(
          `INSERT INTO profile_translation (profile_id, lang, name, headline)
           VALUES (1, 'en', 'Dana Owner', 'Web developer'),
                  (1, 'ru', 'Дана Овнер', 'Веб-разработчик')`
        ),
        env.DB.prepare(
          "INSERT INTO technology (name, category) VALUES ('TanStack Router', 'frontend')"
        ),
        env.DB.prepare(
          "INSERT INTO experience (id, start_month) VALUES (1, '2024-01')"
        ),
        env.DB.prepare(
          `INSERT INTO experience_translation (experience_id, lang, company, role)
           VALUES (1, 'en', 'Acme Corp', 'Developer')`
        ),
      ])
    })

    it("tells the model to keep the Brand, the owner, technologies and companies", async () => {
      answer({ about: "…" })
      await translate({
        lang: "es",
        fields: [{ name: "about", value: "About me" }],
      })
      const { system } = sent()
      for (const name of [
        BRAND,
        "Dana Owner",
        "TanStack Router",
        "Acme Corp",
      ]) {
        expect(system).toContain(name)
      }
      // The owner's name in another Lang is not a name to keep.
      expect(system).not.toContain("Дана Овнер")
    })
  })

  it("answers 502 when the Claude API fails", async () => {
    send.mockRejectedValue(
      new Anthropic.APIConnectionError({ message: "Connection error." })
    )
    const response = await translate({
      lang: "ru",
      fields: [{ name: "title", value: "Project" }],
    })
    expect(await failed(response, 502)).toBe("translation_failed")
  })

  it("answers 502 on a refusal, a cut-off answer or the wrong fields", async () => {
    const body: TranslateRequest = {
      lang: "ru",
      fields: [{ name: "title", value: "Project" }],
    }
    answer({ title: "Проект" }, "refusal")
    expect(await failed(await translate(body), 502)).toBe("translation_failed")
    answer({ title: "Проект" }, "max_tokens")
    expect(await failed(await translate(body), 502)).toBe("translation_failed")
    answer({ heading: "Проект" })
    expect(await failed(await translate(body), 502)).toBe("translation_failed")
  })

  it("answers 503 without a key, and never sends it to the client", async () => {
    const response = await translate(
      { lang: "ru", fields: [{ name: "title", value: "Project" }] },
      { ...adminEnv, ANTHROPIC_API_KEY: "" }
    )
    expect(await failed(response, 503)).toBe("translator_unavailable")
    expect(send).not.toHaveBeenCalled()

    answer({ title: "Проект" })
    const ok = await translate({
      lang: "ru",
      fields: [{ name: "title", value: "Project" }],
    })
    expect(await ok.text()).not.toContain(KEY)
  })

  it("refuses EN as the target and a body that isn't fields", async () => {
    const en = await translate({
      lang: "en" as "ru",
      fields: [{ name: "title", value: "Project" }],
    })
    expect(
      v.parse(ValidationErrorSchema, await en.json()).fields
    ).toHaveProperty("lang")
    const empty = await translate({ lang: "ru", fields: [] })
    expect(empty.status).toBe(422)
    expect(send).not.toHaveBeenCalled()
  })

  it("is behind the Access check", async () => {
    const response = await translate(
      { lang: "ru", fields: [{ name: "title", value: "Project" }] },
      { ...env, ANTHROPIC_API_KEY: KEY }
    )
    expect(response.status).toBe(401)
    expect(send).not.toHaveBeenCalled()
  })
})

describe("protect and restore", () => {
  it("round-trips Markdown untouched", () => {
    const markdown =
      "Text `a` and ``b ` c`` [l](u) <https://x.y> https://z.w/p?q=1\n\n[ref]: https://r.s\n\n~~~\nraw https://in.code\n~~~"
    const { text, slots } = protect(markdown)
    expect(text).not.toContain("https://")
    expect(restore(text, slots)).toBe(markdown)
  })

  it("refuses a placeholder missing, repeated or unknown", () => {
    const { text, slots } = protect("`a` and `b`")
    expect(restore(text.replace("⟦1⟧", ""), slots)).toBeUndefined()
    expect(restore(`${text} ⟦0⟧`, slots)).toBeUndefined()
    expect(restore(`${text} ⟦7⟧`, slots)).toBeUndefined()
  })
})
