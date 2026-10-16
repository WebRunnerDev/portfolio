import { Hono } from "hono"
import type { AdminMeResponse } from "@contracts/api/admin"
import type { AdminEnv } from "../access"
import { methodNotAllowed } from "../errors"

// For the admin header: who is signed in.
export const adminMe = new Hono<AdminEnv>()
  .get("/", (c) => c.json({ email: c.var.email } satisfies AdminMeResponse))
  .all("/", methodNotAllowed("GET, HEAD"))
