import type { TranslateRequest } from "@contracts/api/translate"

import type { Values } from "../api/admin-api"
import type { EntityConfig } from "../model/entities"
import {
  initialValues,
  translatedFields,
  translationBody,
  type FormValues,
} from "./form"

// The Translation draft (worker/README.md › Translation draft): the EN form
// goes out, the answer fills another Lang's form.

// The EN fields filled in, as the request sends them.
export function draftFields(
  entity: EntityConfig,
  en: FormValues
): TranslateRequest["fields"] {
  const body = translationBody(entity, en)
  return translatedFields(entity)
    .filter((field) => body[field.name] !== undefined)
    .map((field) => ({
      name: field.name,
      value: body[field.name] as string | string[],
      markdown: field.kind === "markdown",
    }))
}

// The form with the draft over it; a field EN left empty keeps its value.
export function withDraft(
  entity: EntityConfig,
  current: FormValues,
  draft: Values
): FormValues {
  const drafted = translatedFields(entity).filter(
    (field) => field.name in draft
  )
  return { ...current, ...initialValues(drafted, draft) }
}
