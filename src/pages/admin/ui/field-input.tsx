import { useId, type ReactNode } from "react"
import { cn } from "cn"

import {
  Checkbox,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  Textarea,
} from "@/shared/ui/kit"

import type { Direction, Lang } from "@contracts/lang"

import type { Values } from "../api/admin-api"
import type { FormValue } from "../lib/form"
import type { Field } from "../model/entities"
import { CoverInput, type Gallery } from "./cover-input"
import { FileInput } from "./file-input"
import { MarkdownInput } from "./markdown-input"
import { RefSelect } from "./ref-select"
import { RefsInput } from "./refs-input"

const INPUT_TYPES = {
  text: "text",
  slug: "text",
  url: "url",
  email: "email",
  month: "month",
  datetime: "datetime-local",
  number: "number",
} as const

// One field of a form: its label, control, hint and messages. `lang` and
// `dir`: the Translation's, on its text controls.
export function FieldInput({
  className,
  field,
  value,
  required,
  errors,
  lang,
  dir,
  onChange,
  onUploaded,
  gallery,
}: {
  className?: string
  field: Field
  value: FormValue
  required: boolean
  errors: string[] | undefined
  lang?: Lang
  dir?: Direction
  onChange: (value: FormValue) => void
  // A file field: the new key and what the upload filled in besides it.
  onUploaded: (key: string, extra: Values) => void
  // The rows a `cover` field picks from.
  gallery?: Gallery
}) {
  const id = useId()
  const describedBy = `${id}-hint`
  const invalid = errors !== undefined && errors.length > 0
  const common = {
    id,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
  }
  const text = typeof value === "string" ? value : ""
  const writing = { lang, dir }

  let control: ReactNode
  switch (field.kind) {
    case "refs":
      return (
        <fieldset className={cn("flex flex-col gap-zsd-xs", className)}>
          <legend className="mb-zsd-xs text-sm font-medium">
            {field.label}
          </legend>
          <RefsInput
            entityPath={field.entity}
            value={Array.isArray(value) ? value : []}
            onChange={onChange}
          />
          {errors?.map((message) => (
            <p key={message} className="text-zsd-body-sm text-zsd-error">
              {message}
            </p>
          ))}
        </fieldset>
      )
    case "cover":
      return (
        <fieldset
          aria-describedby={describedBy}
          className={cn("flex flex-col gap-zsd-xs", className)}
        >
          <legend className="mb-zsd-xs text-sm font-medium">
            {field.label}
          </legend>
          <CoverInput gallery={gallery} value={text} onChange={onChange} />
          <div id={describedBy} className="text-zsd-body-sm">
            {field.hint && (
              <p className="text-muted-foreground">{field.hint}</p>
            )}
            {errors?.map((message) => (
              <p key={message} className="text-zsd-error">
                {message}
              </p>
            ))}
          </div>
        </fieldset>
      )
    case "boolean":
      return (
        <div className={cn("flex items-center gap-zsd-sm", className)}>
          <Checkbox
            {...common}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <Label htmlFor={id}>{field.label}</Label>
        </div>
      )
    case "markdown":
      control = (
        <MarkdownInput
          {...common}
          {...writing}
          value={text}
          onChange={onChange}
        />
      )
      break
    case "textarea":
    case "lines":
      control = (
        <Textarea
          {...common}
          {...writing}
          rows={{ textarea: 3, lines: 4 }[field.kind]}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      )
      break
    case "select":
      control = (
        <NativeSelect
          {...common}
          className="w-full"
          value={text}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.options.map((option) => (
            <NativeSelectOption key={option} value={option}>
              {option.replaceAll("_", " ")}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )
      break
    case "ref":
      control = (
        <RefSelect
          {...common}
          entityPath={field.entity}
          value={text}
          onChange={onChange}
        />
      )
      break
    case "file":
      control = (
        <FileInput
          {...common}
          accept={field.accept}
          fills={field.fills}
          value={text}
          required={required}
          onChange={onChange}
          onUploaded={onUploaded}
        />
      )
      break
    default:
      control = (
        <Input
          {...common}
          {...(field.kind === "text" ? writing : {})}
          type={INPUT_TYPES[field.kind]}
          // A <input type="month"> without support falls back to text.
          placeholder={field.kind === "month" ? "YYYY-MM" : undefined}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      )
  }

  const hint = field.kind === "lines" ? "One per line" : field.hint

  return (
    <div className={cn("flex flex-col gap-zsd-xs", className)}>
      <Label htmlFor={id}>
        {field.label}
        {required && <span aria-hidden>*</span>}
      </Label>
      {control}
      <div id={describedBy} className="text-zsd-body-sm">
        {hint && <p className="text-muted-foreground">{hint}</p>}
        {errors?.map((message) => (
          <p key={message} className="text-zsd-error">
            {message}
          </p>
        ))}
      </div>
    </div>
  )
}
