import { describe, expect, it } from "vitest"

import { highlight } from "./highlight"
import { LANGUAGE_NAMES } from "./languages"

// The block's background, `surface-raised` in DESIGN.md.
const BACKGROUND = { light: "#E5E7EB", dark: "#1E1E1E" }

const SAMPLES: Record<string, string> = {
  ts: `// A comment\nimport { a } from "./a"\nexport type T<K extends string> = Record<K, number>\n@decorator class C implements I { private x = 1n; get y(): string { return \`t\${this.x}\` } }\nconst re = /a+b/gi, n = 0x1f, ok = true ?? null\nenum E { A = 1 }`,
  tsx: `/** Doc @param x */\nexport function App({ x }: { x: number }) {\n  return <div className="a" onClick={() => x + 1}>{x} &amp; text</div>\n}`,
  js: `// c\nasync function* f(a = 1, ...rest) { yield await import("x"); throw new Error('e' + \`t\${a}\`) }\nconst o = { k: /r/g, n: 1e3, b: false, u: undefined, [Symbol.iterator]: null }\nconsole.log(this, super.x, typeof o)`,
  jsx: `const El = () => <Foo.Bar prop={1} str="s" {...rest}><b>bold</b>{/* c */}</Foo.Bar>`,
  json: `{\n  "key": "value",\n  "n": 1.5,\n  "b": true,\n  "nil": null,\n  "a": [1, "x"]\n}`,
  css: `/* c */\n@media (min-width: 40rem) { .a > #b:hover::after, [data-x="y"] { color: #fff !important; margin: calc(1px + 2em); --v: var(--w); font: 1rem/1.5 "Fira Code" } }\n@import url("x.css");\n@keyframes k { from { opacity: 0 } }`,
  html: `<!DOCTYPE html>\n<!-- c -->\n<html lang="en"><head><style>a { color: red }</style><script>let a = 1</script></head>\n<body><a href="/x" data-y='z'>Link &amp;</a></body></html>`,
  bash: `#!/usr/bin/env bash\n# comment\nset -euo pipefail\nfor f in *.txt; do echo "$f \${HOME}" | grep -q 'x' && exit 1; done\nexport A=$(date +%s)\nif [[ -n "$A" ]]; then npm ci --prefer-offline; fi`,
  sql: `-- c\nSELECT p.id, COUNT(*) AS n FROM posts p LEFT JOIN tags t ON t.id = p.tag_id WHERE p.title LIKE 'a%' AND p.n > 10 GROUP BY p.id;\nCREATE TABLE x (id INTEGER PRIMARY KEY, name TEXT NOT NULL DEFAULT '');`,
  yaml: `# c\nname: CI\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    env: { A: 1, B: true, C: null }\n    steps:\n      - uses: actions/checkout@v4\n      - run: |\n          npm ci\nanchor: &a "s"\nref: *a`,
  diff: `diff --git a/x b/x\nindex 1..2 100644\n--- a/x\n+++ b/x\n@@ -1,3 +1,3 @@\n context\n-removed\n+added`,
  md: `# Heading\n\nSome **bold**, _italic_, \`code\` and a [link](https://x.y "t").\n\n> Quote\n\n- item\n1. one\n\n---\n\n![img](/media/a.png)`,
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

describe("highlight", () => {
  it("has a sample for every language", () => {
    expect(Object.keys(SAMPLES).sort()).toEqual([...LANGUAGE_NAMES].sort())
  })

  it.each(LANGUAGE_NAMES)(
    "colours %s at AA against the block in both themes",
    async (language) => {
      const lines = await highlight(SAMPLES[language], language)
      expect(lines).not.toBeNull()
      const colors = new Set(
        lines!
          .flat()
          .flatMap((token) => [`light ${token.light}`, `dark ${token.dark}`])
      )
      // More than one colour: the language is really highlighted.
      expect(colors.size).toBeGreaterThan(4)
      for (const entry of colors) {
        const [theme, color] = entry.split(" ") as ["light" | "dark", string]
        expect(color, entry).toMatch(/^#[0-9a-f]{6}$/i)
        expect(
          contrast(color, BACKGROUND[theme]),
          `${entry} in ${language}`
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  )

  it("keeps the text and lines of the code", async () => {
    const code = 'const a = "x"\n\nlet b = 1'
    const lines = await highlight(code, "TypeScript")
    expect(lines!.map((line) => line.map((t) => t.content).join(""))).toEqual(
      code.split("\n")
    )
  })

  it("leaves other languages alone", async () => {
    expect(await highlight("x", "brainfuck")).toBeNull()
    expect(await highlight("x", "constructor")).toBeNull()
  })
})
