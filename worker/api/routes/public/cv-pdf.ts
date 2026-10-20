import { Hono } from "hono"
import type { CvPdfLink } from "@contracts/api/public"
import { findCvPdfLink } from "../../../cv-pdf/store"
import { apiError, methodNotAllowed } from "../../errors"
import type { PublicEnv } from "../../public"

// The CV PDF the Web CV links: the Lang's own, else EN's; 404 while neither
// exists.
export const cvPdf = new Hono<PublicEnv>()
  .get("/", async (c) => {
    const link = await findCvPdfLink(c.env.DB, c.var.lang)
    if (!link) return apiError(c, 404, "not_found")
    return c.json(link satisfies CvPdfLink)
  })
  .all("/", methodNotAllowed("GET, HEAD"))
