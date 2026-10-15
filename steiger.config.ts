import { defineConfig } from "steiger"
import fsd from "@feature-sliced/steiger-plugin"

// ADR-0009: Feature-Sliced Design boundaries for the frontend.
export default defineConfig([
  ...fsd.configs.recommended,
  {
    // ADR-0009 puts app-wide providers in `app/providers` — the name the FSD
    // docs use for the app layer, even though the rule bans it elsewhere.
    files: ["./src/app/**"],
    rules: {
      "fsd/segments-by-purpose": "off",
    },
  },
])
