import { cn } from "cn"
import { LANGS } from "@contracts/lang"

import { listCvPdfs } from "../api/admin-api"
import { cvPdfSummary, rowsSummary } from "../lib/summary"
import { loadRows } from "../model/load-rows"
import { SECTIONS, type SectionItem } from "../model/sections"
import { useResource } from "../model/use-resource"
import { ApiErrorNotice } from "./api-error-notice"
import { SectionLink } from "./section-link"

const ITEMS = SECTIONS.flatMap((section) => section.items)

async function summarize(item: SectionItem) {
  return item.kind === "entity"
    ? rowsSummary(item.entity, await loadRows(item.entity))
    : cvPdfSummary(await listCvPdfs(), LANGS.length)
}

// The state of every page by path. One that fails only goes without; all
// failing is the API's failure.
async function loadSummaries(): Promise<Map<string, string>> {
  const settled = await Promise.allSettled(ITEMS.map(summarize))
  const failed = settled.find((result) => result.status === "rejected")
  if (failed && settled.every((result) => result.status === "rejected")) {
    throw failed.reason
  }
  return new Map(
    settled.flatMap((result, index) =>
      result.status === "fulfilled" ? [[ITEMS[index].path, result.value]] : []
    )
  )
}

// Every page of the Admin by section, each with a line on what it manages
// and one on what it has. A section's id is its anchor: the breadcrumbs
// link to it.
export function AdminHomePage() {
  const summaries = useResource("summaries", loadSummaries)

  return (
    <>
      <h1 className="font-heading text-zsd-headline-md">Admin</h1>
      {summaries.error && (
        <ApiErrorNotice error={summaries.error} onRetry={summaries.reload} />
      )}
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={section.label && `${section.id}-heading`}
          className="flex scroll-mt-zsd-lg flex-col gap-zsd-sm"
        >
          {section.label && (
            <div>
              <h2
                id={`${section.id}-heading`}
                className="font-heading text-zsd-headline-sm"
              >
                {section.label}
              </h2>
              <p className="text-zsd-body-sm text-muted-foreground">
                {section.hint}
              </p>
            </div>
          )}
          <ul
            aria-busy={summaries.loading}
            className="grid gap-zsd-sm sm:grid-cols-2 xl:grid-cols-3"
          >
            {section.items.map((item) => (
              <li key={item.path}>
                <SectionLink
                  item={item}
                  className={cn(
                    "flex h-full flex-col gap-zsd-xs border border-border bg-card px-zsd-md py-zsd-sm outline-offset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
                    item.nested && "border-dashed"
                  )}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-zsd-sm">
                    <span className="font-medium">{item.label}</span>
                    <span
                      data-testid={`summary-${item.path}`}
                      className="text-zsd-body-sm tabular-nums"
                    >
                      {summaries.data?.get(item.path) ??
                        (summaries.loading ? "…" : "")}
                    </span>
                  </span>
                  <span className="text-zsd-body-sm text-muted-foreground">
                    {item.hint}
                  </span>
                </SectionLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
