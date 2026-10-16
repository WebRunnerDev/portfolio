// `npm audit --audit-level=high` that skips the advisories listed in
// .github/audit-allowlist.json. Fails on every other high or critical advisory
// and on an allowlist entry past its `expires` date, so an exception gets
// looked at again instead of staying forever.
import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"

const FAILING = new Set(["high", "critical"])

const allowlist = JSON.parse(
  readFileSync(new URL("../audit-allowlist.json", import.meta.url), "utf8")
)
const today = new Date().toISOString().slice(0, 10)
const expired = allowlist.filter((entry) => entry.expires < today)
const allowed = new Set(
  allowlist.filter((entry) => entry.expires >= today).map((entry) => entry.id)
)

// npm audit exits 1 when it finds anything; the report is on stdout either way.
let output
try {
  output = execSync("npm audit --json", {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
} catch (error) {
  if (!error.stdout) throw error
  output = error.stdout
}
const report = JSON.parse(output)
if (report.error) throw new Error(`npm audit: ${report.error.summary}`)

// Advisories sit in `via` as objects; string entries only point at the
// package that brings one in, so collecting the objects covers every path.
const advisories = new Map()
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via) {
    if (typeof via !== "object" || !FAILING.has(via.severity)) continue
    const id = via.url.split("/").pop()
    advisories.set(id, { id, ...via })
  }
}

const failing = [...advisories.values()].filter((a) => !allowed.has(a.id))
const skipped = [...advisories.values()].filter((a) => allowed.has(a.id))

for (const advisory of skipped) {
  console.log(`allowed  ${advisory.id} ${advisory.name}: ${advisory.title}`)
}
for (const advisory of failing) {
  console.error(
    `${advisory.severity.padEnd(8)} ${advisory.id} ${advisory.name} ${advisory.range}: ${advisory.title}`
  )
}
for (const entry of expired) {
  console.error(
    `expired  ${entry.id} ${entry.package} (${entry.expires}): check it again, then remove it or move the date`
  )
}

if (failing.length || expired.length) process.exit(1)
console.log("No high or critical advisories.")
