/// <reference types="vitest/config" />
import { resolve } from "node:path"
import { cloudflare } from "@cloudflare/vite-plugin"
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

import { ROUTE_ATTRIBUTE, routePattern } from "./contracts/route-preloads.ts"

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

// contracts/route-preloads.ts: a modulepreload in index.html for each chunk a
// page's route component needs beyond the entry's own, marked with the
// routes that need it; the Worker keeps those of the page it serves. The
// router splits each route's component into a chunk of its own
// (`?tsr-split=component`).
function routePreloads(): Plugin {
  const ROUTE_FILE = /\/src\/app\/routes\/(.+)\.tsx\?tsr-split=component$/
  return {
    name: "route-preloads",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, { bundle, chunk: entry }) {
        if (!bundle || !entry) return
        const chunks = new Map(
          Object.values(bundle).flatMap((output) =>
            output.type === "chunk" ? [[output.fileName, output]] : []
          )
        )
        // A chunk and every chunk it imports statically.
        const graph = (fileName: string, seen = new Set<string>()) => {
          if (seen.has(fileName)) return seen
          seen.add(fileName)
          for (const next of chunks.get(fileName)?.imports ?? []) {
            graph(next, seen)
          }
          return seen
        }
        const initial = graph(entry.fileName)

        const routes = new Map<string, Set<string>>()
        for (const chunk of chunks.values()) {
          const file = ROUTE_FILE.exec(
            chunk.facadeModuleId?.replaceAll("\\", "/") ?? ""
          )?.[1]
          const pattern = file && routePattern(file)
          if (!pattern) continue
          for (const fileName of graph(chunk.fileName)) {
            if (initial.has(fileName)) continue
            routes.set(
              fileName,
              (routes.get(fileName) ?? new Set()).add(pattern)
            )
          }
        }
        return [...routes].map(([fileName, patterns]) => ({
          tag: "link",
          attrs: {
            rel: "modulepreload",
            crossorigin: true,
            href: `/${fileName}`,
            [ROUTE_ATTRIBUTE]: [...patterns].join(" "),
          },
          injectTo: "head" as const,
        }))
      },
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
    // The e2e tests of the Admin keep its D1 and R2 apart (scripts/e2e-dev.mjs).
    !process.env.VITEST &&
      cloudflare({
        persistState: process.env.E2E_STATE
          ? { path: process.env.E2E_STATE }
          : true,
      }),
    cloudflareWebAnalytics(process.env.CF_WEB_ANALYTICS_TOKEN),
    routePreloads(),
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
          // Vitest empties CSS; the motion tokens test reads this one raw.
          css: { include: [/src\/styles\/tokens\.css/] },
        },
      },
      {
        // worker/ tests (and scripts/seed-cv/) run in workerd with the bindings from wrangler.jsonc
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
          include: ["worker/**/*.test.ts", "scripts/**/*.test.ts"],
          setupFiles: ["worker/test/apply-migrations.ts"],
          // Vitest 5 hands cached modules over as OS paths, which `readFileSync`
          // in workerd rejects on Windows.
          fsModuleCache: false,
        },
      },
    ],
  },
})
