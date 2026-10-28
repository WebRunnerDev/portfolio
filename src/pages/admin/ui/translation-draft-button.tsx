import { useState } from "react"
import type { DraftLang } from "@contracts/api/translate"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@/shared/ui/kit"

import { useSaving } from "./use-saving"

// Fills a Lang's form with a translation from EN; nothing is saved. A form
// that has text already asks first. `empty`: EN has nothing to translate.
export function TranslationDraftButton({
  lang,
  empty,
  replaces,
  onDraft,
}: {
  lang: DraftLang
  empty: boolean
  replaces: boolean
  onDraft: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const drafting = useSaving()
  const name = lang.toUpperCase()

  function draft() {
    setOpen(false)
    void drafting.save({}, onDraft)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={empty || drafting.pending}
        onClick={() => (replaces ? setOpen(true) : draft())}
      >
        {drafting.pending ? "Translating…" : "Translation draft"}
      </Button>
      {empty && (
        <p className="text-zsd-body-sm text-muted-foreground">
          Fill in EN for a draft.
        </p>
      )}
      {drafting.failure && (
        <p role="alert" className="text-zsd-body-sm text-zsd-error">
          {drafting.failure}
        </p>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Replace the {name} form with a draft?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Every field EN has is translated over what the {name} form holds
              now. Nothing is saved until you save {name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={draft}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
