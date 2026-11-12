import { resolve } from "node:path"
import { defineConfig } from "vite"
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        a: resolve(import.meta.dirname, "a/index.html"),
        b: resolve(import.meta.dirname, "b/index.html"),
        c: resolve(import.meta.dirname, "c/index.html"),
        d: resolve(import.meta.dirname, "d/index.html"),
        e: resolve(import.meta.dirname, "e/index.html"),
      },
    },
  },
})
