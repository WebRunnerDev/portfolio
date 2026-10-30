import { expect, type Page } from "@playwright/test"

// The page's width against the body's, not the html's clientWidth: Playwright
// hides scrollbars, yet `scrollbar-gutter` keeps their place, and clientWidth
// counts that place as room. Polled: a page change's view transition spans
// the whole window until it ends.
export const expectNoPageOverflow = (page: Page, message?: string) =>
  expect
    .poll(
      () =>
        page.evaluate(
          "document.documentElement.scrollWidth - document.body.clientWidth"
        ),
      { message, intervals: [100] }
    )
    .toBe(0)
