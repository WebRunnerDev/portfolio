import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/$lang/")({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <h1 className="text-2xl font-medium">WebRunner</h1>
    </main>
  )
}
