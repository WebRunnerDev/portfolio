import { useState } from "react"
import { Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from "@/shared/ui/kit"

import { AdminApiError, deleteRow } from "../api/admin-api"
import type { EntityConfig } from "../model/entities"
import { errorMessage } from "./api-error-notice"

export function DeleteRowButton({
  entity,
  id,
  title,
  onDeleted,
}: {
  entity: EntityConfig
  id: number
  title: string
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<string>()

  async function remove() {
    setPending(true)
    setFailure(undefined)
    try {
      await deleteRow(entity.path, id)
      setOpen(false)
      onDeleted()
    } catch (caught) {
      setFailure(
        caught instanceof AdminApiError ? errorMessage(caught) : "Failed."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setFailure(undefined)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${title}`}>
          <Trash2 aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {title}?</AlertDialogTitle>
          <AlertDialogDescription>
            {entity.translated
              ? "The row goes with all its Translations and links."
              : "The row goes with its links."}
            {entity.fields.some((field) => field.kind === "file") &&
              " Its files go from R2 too, unless another row names them."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failure && (
          <p role="alert" className="text-zsd-body-sm text-zsd-error">
            {failure}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              // Stay open until the API answers.
              event.preventDefault()
              void remove()
            }}
          >
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
