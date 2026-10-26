import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

// eslint.config.js bans curves that aren't in DESIGN.md, in Tailwind classes
// and in Motion transitions. Lints snippets as if they were a file in src/.
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
    .filter(({ ruleId }) =>
      [
        "better-tailwindcss/no-restricted-classes",
        "no-restricted-syntax",
      ].includes(ruleId ?? "")
    )
    .map(({ message }) => message)
}

const classes = (className: string) =>
  `export const A = () => <div className="${className}" />\n`

const motion = (transition: string) =>
  `import { m } from "motion/react"
import { EASE } from "@/shared/lib/motion"
export const A = () => <m.div animate={{ y: 0 }} transition={${transition}} />
`

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

  it.each([
    `{ ease: "easeInOut", duration: 0.2 }`,
    `{ ease: "linear" }`,
    `{ ease: [0.4, 0, 0.2, 1] }`,
    `{ duration: 0.2 }`,
  ])("flags the Motion transition %s", async (transition) => {
    expect(await errors(motion(transition))).toHaveLength(1)
  })

  it("allows a Motion transition with an EASE curve", async () => {
    expect(await errors(motion("{ ease: EASE.enter, duration: 0.2 }"))).toEqual(
      []
    )
  })
})
