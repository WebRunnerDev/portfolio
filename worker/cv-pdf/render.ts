import type { Browser, BrowserWorker } from "@cloudflare/puppeteer"
import { PRINT_READY_ATTRIBUTE } from "@contracts/cv-pdf"
import { browsers } from "./browser"

// ADR-0003: Browser Rendering opens the Print CV, waits for its ready flag
// and prints it. The Print CV fits one A4 page itself (`@page cv` in
// src/index.css), so the size here only has to match.

// The page has its data and fonts well within this; a slower one is broken.
const READY_TIMEOUT_MS = 30_000

// Why there is no PDF: no browser (the binding refused, Browser Rendering's
// limits, a local Chrome that won't start), or the page never got ready.
export class RenderError extends Error {
  readonly code: "browser_unavailable" | "render_failed"

  constructor(code: RenderError["code"], cause: unknown) {
    super(code, { cause })
    this.code = code
  }
}

export async function renderPdf(binding: BrowserWorker, url: string) {
  let browser: Browser
  try {
    browser = await browsers.launch(binding)
  } catch (cause) {
    throw new RenderError("browser_unavailable", cause)
  }
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: "load", timeout: READY_TIMEOUT_MS })
    // A poll rather than waitForSelector, which never saw the flag with the
    // local Chrome of `npm run dev`. A string: the Worker has no DOM types.
    await page.waitForFunction(
      `document.documentElement.hasAttribute(${JSON.stringify(PRINT_READY_ATTRIBUTE)})`,
      { polling: 100, timeout: READY_TIMEOUT_MS }
    )
    // `@page cv` sets the margins; A4 is its size too.
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    })
  } catch (cause) {
    throw new RenderError("render_failed", cause)
  } finally {
    await browser.close().catch(() => {})
  }
}
