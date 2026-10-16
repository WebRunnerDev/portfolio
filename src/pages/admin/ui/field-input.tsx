import { useId, type ReactNode } from "react"

import {
  Checkbox,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  Textarea,
} from "@/shared/ui/kit"

import type { Values } from "../api/admin-api"
import type { Field } from "../model/entities"
import { FileInput } from "./file-input"
import { RefSelect } from "./ref-select"

const INPUT_TYPES = {
  text: "text",
  slug: "text",
  url: "url",
  email: "email",
  month: "month",
  number: "number",
} as const

// One field of the create form: its label, control, hint and messages.
export function FieldInput({
  field,
  value,
  required,
  errors,
  onChange,
  onUploaded,
}: {
  field: Field
  value: string | boolean
  required: boolean
  errors: string[] | undefined
  onChange: (value: string | boolean) => void
  // A file field: the new key and what the upload filled in besides it.
  onUploaded: (key: string, extra: Values) => void
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

  let control: ReactNode
  switch (field.kind) {
    case "boolean":
      return (
        <div className="flex items-center gap-zsd-sm">
          <Checkbox
            {...common}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <Label htmlFor={id}>{field.label}</Label>
        </div>
      )
    case "textarea":
    case "lines":
      control = (
        <Textarea
          {...common}
          rows={field.kind === "lines" ? 4 : 3}
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
          onChange={onChange}
          onUploaded={onUploaded}
        />
      )
      break
    default:
      control = (
        <Input
          {...common}
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
    <div className="flex flex-col gap-zsd-xs">
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
