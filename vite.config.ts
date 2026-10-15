/// <reference types="vitest/config" />
import { resolve } from "node:path"
import { cloudflare } from "@cloudflare/vite-plugin"
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// Cloudflare Web Analytics beacon. The token is a Workers Builds build variable,
// so only Cloudflare builds (production and previews) report; dev, CI and e2e
// builds stay without the third-party script. The beacon tracks SPA navigations
// through the History API on its own.
function cloudflareWebAnalytics(token: string | undefined): Plugin {
  return {
    name: "cloudflare-web-analytics",
    apply: "build",
    transformIndexHtml() {
      if (!token) return
      return [
        {
          tag: "script",
          attrs: {
            defer: true,
            src: "https://static.cloudflareinsights.com/beacon.min.js",
            "data-cf-beacon": JSON.stringify({ token }),
          },
          injectTo: "body",
        },
      ]
    },
  }
}

const contractsAlias = {
  "@contracts": resolve(import.meta.dirname, "./contracts"),
}

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
    cloudflareWebAnalytics(process.env.CF_WEB_ANALYTICS_TOKEN),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      ...contractsAlias,
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["{src,contracts,migrations}/**/*.test.{ts,tsx}"],
        },
      },
      {
        // worker/ tests run in workerd with the bindings from wrangler.jsonc
        // (local D1, migrated by the setup file).
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: {
                TEST_MIGRATIONS: await readD1Migrations("./migrations"),
                // A test Access application; worker/api/access.test.ts serves
                // its keys.
                ACCESS_TEAM_DOMAIN: "test.cloudflareaccess.com",
                ACCESS_AUD: "test-aud",
              },
            },
          })),
        ],
        resolve: { alias: contractsAlias },
        test: {
          name: "worker",
          include: ["worker/**/*.test.ts"],
          setupFiles: ["worker/test/apply-migrations.ts"],
          // Vitest 5 hands cached modules over as OS paths, which `readFileSync`
          // in workerd rejects on Windows.
          fsModuleCache: false,
        },
      },
    ],
  },
})
