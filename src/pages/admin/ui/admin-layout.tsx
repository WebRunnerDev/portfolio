import { useLayoutEffect } from "react"
import { Link, Outlet, useLocation } from "@tanstack/react-router"
import { cn } from "cn"
import { Direction as RadixDirection } from "radix-ui"

import { getMe } from "../api/admin-api"
import { adminTitle, SECTIONS } from "../model/sections"
import { useResource } from "../model/use-resource"
import { ApiErrorNotice } from "./api-error-notice"
import { SectionLink } from "./section-link"

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"

// The Admin (ADR-0004): EN only and never mirrored, whatever Lang the site
// was on. Outside `/$lang`, so none of the site's header, footer or hreflang.
// It shares as little as it can with the public pages (no theme switcher, no
// useDirection): every shared module splits a public chunk in two.
export function AdminLayout() {
  const me = useResource("me", getMe)
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    document.documentElement.lang = "en"
    document.documentElement.dir = "ltr"
  }, [])

  return (
    <RadixDirection.Provider dir="ltr">
      <title>{adminTitle(pathname)}</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        <header className="border-b border-border bg-card">
          <div className="flex h-14 items-center gap-zsd-md px-zsd-lg">
            <Link
              to="/admin"
              className={`shrink-0 font-heading text-zsd-headline-sm ${FOCUS_RING}`}
            >
              Admin
            </Link>
            <span
              data-testid="admin-email"
              className="ms-auto min-w-0 truncate text-zsd-body-sm text-muted-foreground"
            >
              {me.data?.email ?? (me.loading ? "…" : "")}
            </span>
            <a
              href="/"
              className={`shrink-0 text-zsd-body-sm underline-offset-4 hover:underline ${FOCUS_RING}`}
            >
              Site
            </a>
          </div>
        </header>
        <div className="flex flex-1 flex-col lg:flex-row">
          <nav
            aria-label="Admin"
            className="border-b border-border lg:w-56 lg:shrink-0 lg:border-e lg:border-b-0"
          >
            <div className="flex flex-wrap gap-x-zsd-lg gap-y-zsd-sm p-zsd-sm lg:flex-col">
              {SECTIONS.map((section) => (
                <div key={section.id} className="flex flex-col gap-zsd-xs">
                  {section.label && (
                    <h2
                      id={`admin-nav-${section.id}`}
                      className="px-zsd-sm pt-zsd-xs text-zsd-body-sm text-muted-foreground"
                    >
                      {section.label}
                    </h2>
                  )}
                  <ul
                    aria-labelledby={
                      section.label ? `admin-nav-${section.id}` : undefined
                    }
                    className="flex flex-wrap gap-zsd-xs lg:flex-col"
                  >
                    {section.items.map((item) => (
                      <li key={item.path}>
                        <SectionLink
                          item={item}
                          className={cn(
                            `block rounded-md px-zsd-sm py-zsd-xs text-zsd-body-sm hover:bg-muted ${FOCUS_RING}`,
                            item.nested && "lg:ms-zsd-md"
                          )}
                          activeClassName="bg-muted font-medium"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
          <main
            id="main"
            className="flex min-w-0 flex-1 flex-col gap-zsd-lg p-zsd-lg"
          >
            {me.error && <ApiErrorNotice error={me.error} />}
            <Outlet />
          </main>
        </div>
      </div>
    </RadixDirection.Provider>
  )
}
