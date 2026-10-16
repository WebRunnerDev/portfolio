import { useCallback, useEffect, useEffectEvent, useState } from "react"

import { AdminApiError } from "../api/admin-api"

type State<T> = {
  key: string
  version: number
  data?: T
  error?: AdminApiError
}

export type Resource<T> = {
  data: T | undefined
  error: AdminApiError | undefined
  loading: boolean
  reload: () => void
}

function asAdminError(error: unknown) {
  if (error instanceof AdminApiError) return error
  console.error(error)
  return new AdminApiError(0, "bad_response")
}

// Loads `load()` for `key` and again on `reload()`. While reloading the same
// key, the last data stays, so a list doesn't blink after a change.
export function useResource<T>(key: string, load: () => Promise<T>) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<State<T>>()
  const run = useEffectEvent(load)

  useEffect(() => {
    let current = true
    run().then(
      (data) => current && setState({ key, version, data }),
      (error: unknown) =>
        current &&
        setState((previous) => ({
          key,
          version,
          data: previous?.key === key ? previous.data : undefined,
          error: asAdminError(error),
        }))
    )
    return () => {
      current = false
    }
  }, [key, version])

  const reload = useCallback(() => setVersion((n) => n + 1), [])
  const sameKey = state?.key === key
  const loading = !sameKey || state.version !== version

  return {
    data: sameKey ? state.data : undefined,
    error: loading ? undefined : state.error,
    loading,
    reload,
  } satisfies Resource<T>
}
