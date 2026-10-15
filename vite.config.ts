/// <reference types="vitest/config" />
import { resolve } from "node:path"
import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/app/routes",
      generatedRouteTree: "./src/app/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    // Runs worker/ in workerd for `dev` and `preview`; unit tests don't need it.
    !process.env.VITEST && cloudflare(),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      "@contracts": resolve(import.meta.dirname, "./contracts"),
    },
  },
  test: {
    include: ["{src,contracts}/**/*.test.{ts,tsx}"],
  },
})
