import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

// eslint.config.js bans curves that aren't in DESIGN.md in Tailwind classes.
// Lints snippets as if they were a file in src/.
const eslint = new ESLint({
  cwd: new URL("../../../..", import.meta.url).pathname.replace(
    /^\/(\w:)/,
    "$1"
  ),
})

const errors = async (code: string) => {
  const [result] = await eslint.lintText(code, {
    filePath: "src/shared/ui/sample.tsx",
  })
  return result.messages
    .filter(
      ({ ruleId }) => ruleId === "better-tailwindcss/no-restricted-classes"
    )
    .map(({ message }) => message)
}

const classes = (className: string) =>
  `export const A = () => <div className="${className}" />\n`

// The first lint loads the Tailwind design system.
describe("easing lint", { timeout: 30_000 }, () => {
  it.each([
    "transition-colors ease-in-out",
    "hover:ease-linear",
    "ease-out",
    "ease-[cubic-bezier(0.4,0,0.2,1)]",
    "ease-(--my-curve)",
    "[transition:opacity_200ms_ease]",
    "[animation-timing-function:linear]",
    "animate-[spin_1s_linear_infinite]",
  ])("flags the class %s", async (className) => {
    expect(await errors(classes(className))).toHaveLength(1)
  })

  it("allows the DESIGN.md curves", async () => {
    expect(
      await errors(
        classes("transition-colors ease-zsd-hover data-closed:ease-zsd-exit")
      )
    ).toEqual([])
  })
})
