import { useIntentImport } from "@/shared/lib/intent"

import { LangTrigger } from "./lang-trigger"

const loadDropdown = () => import("./lang-dropdown")

// The header's Lang control. The dropdown isn't on the first paint: it loads
// when the visitor reaches for the trigger, which stands in until then (#142).
export function LangMenu() {
  const { loaded, triggerProps } = useIntentImport(loadDropdown)

  if (!loaded) return <LangTrigger {...triggerProps} />
  const { LangDropdown } = loaded.module
  return <LangDropdown defaultOpen={loaded.open} />
}
