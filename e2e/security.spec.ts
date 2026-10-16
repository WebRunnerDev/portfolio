import { expect, test, type Page } from "@playwright/test"

// Issue #37: security headers and the Report-Only CSP with a nonce, against
// the production build.
const LANGS = ["en", "ru", "kk", "es", "de", "ar"]
const PAGES = ["", "/cv", "/projects", "/gallery", "/blog", "/design"]

const POLICY = "content-security-policy-report-only"

function policyNonce(policy: string | undefined) {
  return /'nonce-([^']+)'/.exec(policy ?? "")?.[1]
}

test("pages carry the security headers, and their scripts the nonce", async ({
  request,
}) => {
  const seen = new Set<string>()
  for (const path of ["/en", "/en", "/ar/cv", "/admin"]) {
    const response = await request.get(path)
    const headers = response.headers()
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin")
    expect(headers["permissions-policy"]).toContain("camera=()")
    expect(headers["content-security-policy"]).toBeUndefined()

    const nonce = policyNonce(headers[POLICY])
    expect(nonce).toBeTruthy()
    seen.add(nonce!)

    const html = await response.text()
    const scripts = [
      ...html.matchAll(
        /<script\b[^>]*>|<link\b[^>]*rel="modulepreload"[^>]*>/g
      ),
    ].map(([tag]) => /nonce="([^"]*)"/.exec(tag)?.[1])
    expect(scripts.length).toBeGreaterThan(1)
    expect(scripts.every((value) => value === nonce)).toBe(true)
  }
  // A new nonce on every request.
  expect(seen.size).toBe(4)
})

test("hashed assets are immutable and nosniff", async ({ request }) => {
  const html = await (await request.get("/en")).text()
  const entry = /src="(\/assets\/[^"]+\.js)"/.exec(html)![1]
  const headers = (await request.get(entry)).headers()
  expect(headers["x-content-type-options"]).toBe("nosniff")
  expect(headers["cache-control"]).toBe("public, max-age=31536000, immutable")
  expect(headers[POLICY]).toBeUndefined()
})

// Every violation of the page, from the browser's own event, and every
// console message about the CSP or the Permissions-Policy.
async function watchViolations(page: Page) {
  const messages: string[] = []
  page.on("console", (message) => {
    const text = message.text()
    if (/Content Security Policy|Permissions-Policy|feature/i.test(text)) {
      messages.push(text)
    }
  })
  // Strings: the e2e project has no DOM types.
  await page.addInitScript(`
    window.__violations = []
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__violations.push(event.effectiveDirective + " " + event.blockedURI)
    })
  `)
  return async () => [
    ...messages.splice(0),
    ...(await page.evaluate<string[]>("window.__violations")),
  ]
}

test("no page breaks the policy, in any Lang", async ({ page }) => {
  test.slow()
  const violations = await watchViolations(page)
  const paths = [
    "/",
    ...LANGS.flatMap((lang) => PAGES.map((path) => `/${lang}${path}`)),
    "/ar/nope",
    "/admin",
  ]
  for (const path of paths) {
    await page.goto(path)
    await page.waitForLoadState("networkidle")
    expect(await violations(), path).toEqual([])
  }

  // Lazy chunks loaded by SPA navigation get the nonce from the csp-nonce meta.
  await page.goto("/en")
  await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("link", { name: "Blog" }).click()
  await expect(page).toHaveURL(/\/en\/blog$/)
  await page.waitForLoadState("networkidle")
  expect(await violations()).toEqual([])
})

// Chrome sends `report-to` batches from outside the page and late, so the
// delivery itself isn't watched here; the endpoint takes what it would send.
test("a violation is reported, and the endpoint takes the report", async ({
  page,
}) => {
  const violations = await watchViolations(page)
  await page.goto("/en")
  // A data: image breaks `img-src 'self'` without leaving the origin.
  await page.evaluate(
    `new Image().src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="`
  )
  await expect.poll(violations).toContainEqual("img-src data")

  const response = await page.request.post("/api/csp-report", {
    headers: { "Content-Type": "application/reports+json" },
    data: JSON.stringify([
      {
        type: "csp-violation",
        body: {
          documentURL: page.url(),
          blockedURL: "data",
          effectiveDirective: "img-src",
          disposition: "report",
        },
      },
    ]),
  })
  expect(response.status()).toBe(204)
})
