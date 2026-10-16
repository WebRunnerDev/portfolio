const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

// `npm run dev`, `vite preview` and the e2e tests; never webrunner.dev or a
// Preview.
export function isLocalRequest(url: string) {
  return LOCAL_HOSTS.has(new URL(url).hostname)
}
