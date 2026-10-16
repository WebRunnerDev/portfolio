import * as v from "valibot"

// GET /api/admin/me — the owner signed in through Cloudflare Access (ADR-0004).
export const AdminMeResponseSchema = v.object({
  email: v.pipe(v.string(), v.email()),
})

export type AdminMeResponse = v.InferOutput<typeof AdminMeResponseSchema>
