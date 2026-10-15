import { Hono } from "hono"
import type { HealthResponse } from "@contracts/api/health"
import type { ApiEnv } from "../app"
import { methodNotAllowed } from "../errors"

// Hono answers HEAD with the GET handler.
export const health = new Hono<ApiEnv>()
  .get("/", (c) => c.json({ status: "ok" } satisfies HealthResponse))
  .all("/", methodNotAllowed("GET, HEAD"))
