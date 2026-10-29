// Writes the Lighthouse CI results (representative runs) as a table to the job
// summary, marking values outside the thresholds in lighthouserc.json.
import { appendFileSync, existsSync, readFileSync } from "node:fs"

const { GITHUB_STEP_SUMMARY } = process.env

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))
const { assertions } = readJson("lighthouserc.json").ci.assert

const MANIFEST = ".lighthouseci/reports/manifest.json"
// No reports when the run broke before collecting.
if (!existsSync(MANIFEST)) process.exit(0)
const manifest = readJson(MANIFEST)
const categories = ["performance", "accessibility", "best-practices", "seo"]

const mark = (ok) => (ok ? "" : " ⚠️")

const rows = manifest
  .filter((run) => run.isRepresentativeRun)
  .map((run) => {
    const lhr = readJson(run.jsonPath)
    const path = new URL(run.url).pathname
    const budget = (key) => assertions[key][1]
    const scores = categories.map((category) => {
      const score = run.summary[category]
      return `${Math.round(score * 100)}${mark(score >= budget(`categories:${category}`).minScore)}`
    })
    const lcp = lhr.audits["largest-contentful-paint"].numericValue
    const js = lhr.audits["resource-summary"].details.items.find(
      (item) => item.resourceType === "script"
    ).transferSize
    return [
      path,
      ...scores,
      `${(lcp / 1000).toFixed(2)} s${mark(lcp <= budget("largest-contentful-paint").maxNumericValue)}`,
      `${Math.round(js / 1024)} KB${mark(js <= budget("resource-summary:script:size").maxNumericValue)}`,
    ]
  })

const header = [
  "Page",
  "Perf",
  "A11y",
  "Best pr.",
  "SEO",
  "LCP",
  "JS (transfer)",
]
const table = [header, header.map(() => "---"), ...rows]
  .map((cells) => `| ${cells.join(" | ")} |`)
  .join("\n")

appendFileSync(
  GITHUB_STEP_SUMMARY,
  `## Lighthouse (mobile)\n\n${table}\n\n` +
    "A value marked ⚠️ fails the job: every page holds the budget (scores ≥ 90, " +
    "LCP ≤ 2.5 s, JS ≤ 150 KB). Full reports are in the `lighthouse` artifact.\n"
)
