import puppeteer, { type BrowserWorker } from "@cloudflare/puppeteer"

// Browsers from the Browser Rendering binding. An object, so that tests can
// put a fake browser in with `vi.spyOn(browsers, "launch")` (vi.mock doesn't
// work in workerd).
export const browsers = {
  launch: (binding: BrowserWorker) => puppeteer.launch(binding),
}
