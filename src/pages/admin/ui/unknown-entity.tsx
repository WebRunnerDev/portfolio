import { Link } from "@tanstack/react-router"

export function UnknownEntity({ path }: { path: string }) {
  return (
    <>
      <h1 className="font-heading text-zsd-headline-md">Not found</h1>
      <p className="text-zsd-body-md text-muted-foreground">
        There is no “{path}” in the admin.{" "}
        <Link to="/admin" className="underline underline-offset-4">
          All content
        </Link>
      </p>
    </>
  )
}
