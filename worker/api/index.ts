import { createApp } from "./app"
import { health } from "./routes/health"

// One route module per endpoint (worker/README.md › API).
export const api = createApp().basePath("/api").route("/health", health)
