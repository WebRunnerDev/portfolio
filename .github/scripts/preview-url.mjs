// Waits for the Workers Builds Preview of the PR head commit and prints its URL
// to $GITHUB_OUTPUT as `url`. Prints nothing when the build failed or timed out:
// Lighthouse is a warning, not a gate.
//
// The URL comes from the Cloudflare bot comment on the PR (the row of this
// commit); if the comment has none, it falls back to the Preview URL pattern
// <branch>-<worker>.<subdomain>.workers.dev.
import { appendFileSync } from "node:fs"

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_OUTPUT,
  HEAD_SHA,
  HEAD_REF,
  PR_NUMBER,
  WORKER_NAME,
  WORKERS_SUBDOMAIN,
} = process.env

const CHECK_NAME = `Workers Builds: ${WORKER_NAME}`
const TIMEOUT_MS = 20 * 60 * 1000
const POLL_MS = 20 * 1000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function gh(path) {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    }
  )
  if (!response.ok) throw new Error(`GitHub API ${path}: ${response.status}`)
  return response.json()
}

async function buildConclusion() {
  const { check_runs } = await gh(
    `/commits/${HEAD_SHA}/check-runs?check_name=${encodeURIComponent(CHECK_NAME)}`
  )
  const run = check_runs[0]
  return run?.status === "completed" ? run.conclusion : null
}

async function urlFromComment() {
  const comments = await gh(`/issues/${PR_NUMBER}/comments?per_page=100`)
  const short = HEAD_SHA.slice(0, 7)
  for (const comment of comments) {
    if (!comment.user.login.startsWith("cloudflare-workers-and-pages")) continue
    const row = comment.body
      .split("<tr>")
      .find((cells) => cells.includes(short))
    const url = row?.match(
      /https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/
    )?.[0]
    if (url) return url
  }
  return null
}

function urlFromPattern() {
  const preview = HEAD_REF.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `https://${preview}-${WORKER_NAME}.${WORKERS_SUBDOMAIN}.workers.dev`
}

async function isUp(url) {
  try {
    const response = await fetch(`${url}/api/health`)
    return response.ok
  } catch {
    return false
  }
}

const deadline = Date.now() + TIMEOUT_MS
let conclusion = null
while (Date.now() < deadline) {
  conclusion = await buildConclusion()
  if (conclusion) break
  await sleep(POLL_MS)
}

if (conclusion !== "success") {
  console.log(
    `::warning::${CHECK_NAME} is ${conclusion ?? "not finished"}, skipping Lighthouse`
  )
  process.exit(0)
}

// The bot updates its comment shortly after the check run completes.
let url = null
for (let attempt = 0; attempt < 6 && !url; attempt++) {
  url = await urlFromComment()
  if (!url) await sleep(10 * 1000)
}
url ??= urlFromPattern()

if (!(await isUp(url))) {
  console.log(`::warning::Preview ${url} does not answer, skipping Lighthouse`)
  process.exit(0)
}

console.log(`Preview: ${url}`)
appendFileSync(GITHUB_OUTPUT, `url=${url}\n`)
