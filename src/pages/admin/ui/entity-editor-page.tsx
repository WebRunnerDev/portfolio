import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { getRouteApi, Link, useBlocker } from "@tanstack/react-router"
import { cn } from "cn"
import { LANGS, langDirection, type Lang } from "@contracts/lang"

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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/kit"

import {
  deleteTranslation,
  deleteUpload,
  getRow,
  listRows,
  patchRow,
  putTranslation,
  type AdminRow,
  type Values,
} from "../api/admin-api"
import {
  completeness,
  initialValues,
  isRequired,
  otherErrors,
  patchBody,
  plainFields,
  sameValues,
  translatedFields,
  translationBody,
  validatePatch,
  validateTranslation,
  type FieldErrors,
  type FormValue,
  type FormValues,
} from "../lib/form"
import { cellText, rowTitle } from "../lib/row"
import {
  findEntity,
  type Column,
  type EntityConfig,
  type Field,
} from "../model/entities"
import { useResource } from "../model/use-resource"
import { ApiErrorNotice } from "./api-error-notice"
import type { Gallery } from "./cover-input"
import { FieldInput } from "./field-input"
import { GallerySection } from "./gallery-section"
import { UnknownEntity } from "./unknown-entity"
import { useSaving } from "./use-saving"

const route = getRouteApi("/admin/$entity/$id")

export function EntityEditorPage() {
  const { entity: path, id } = route.useParams()
  const entity = findEntity(path)
  if (!entity || !/^[1-9]\d*$/.test(id)) return <UnknownEntity path={path} />
  return <EntityEditor key={`${path}/${id}`} entity={entity} id={id} />
}

function EntityEditor({ entity, id }: { entity: EntityConfig; id: string }) {
  const path = entity.single ? entity.path : `${entity.path}/${id}`
  const row = useResource(path, () => getRow(path, entity.schemas.entity))

  return (
    <>
      <Link
        to="/admin/$entity"
        params={{ entity: entity.path }}
        className="self-start text-zsd-body-sm underline-offset-4 hover:underline"
      >
        {entity.label}
      </Link>
      {row.error && <ApiErrorNotice error={row.error} onRetry={row.reload} />}
      {row.loading && (
        <p role="status" className="text-zsd-body-md text-muted-foreground">
          Loading…
        </p>
      )}
      {row.data && <RowEditor entity={entity} path={path} row={row.data} />}
    </>
  )
}

type LangValues = Record<Lang, FormValues>

function translationsOf(row: AdminRow) {
  return (row.translations ?? {}) as Partial<Record<Lang, Values>>
}

function langValues(fields: Field[], row: AdminRow): LangValues {
  const present = translationsOf(row)
  return Object.fromEntries(
    LANGS.map((lang) => [lang, initialValues(fields, present[lang])])
  ) as LangValues
}

// The untranslated fields, saved with PATCH, then a tab per Lang with the
// Translation, each saved on its own. `saved` is the row as the API last
// answered; the forms are dirty while their values differ from it.
function RowEditor({
  entity,
  path,
  row,
}: {
  entity: EntityConfig
  path: string
  row: AdminRow
}) {
  const plain = plainFields(entity)
  const translated = translatedFields(entity)
  const [saved, setSaved] = useState(row)
  const [values, setValues] = useState(() => initialValues(plain, row))
  const [translations, setTranslations] = useState(() =>
    langValues(translated, row)
  )
  const [tab, setTab] = useState<Lang>("en")
  // Files uploaded since the last save of the fields; those the row doesn't
  // name by then are removed from R2.
  const uploads = useRef<string[]>([])
  // The gallery's rows (an album's photos): listed under the editor, and
  // what a `cover` field picks from.
  const gallery = entity.gallery ? findEntity(entity.gallery) : undefined
  const galleryRows = useResource(
    gallery ? `${gallery.path}?${row.id}` : "",
    async () =>
      gallery
        ? listRows(gallery.path, gallery.schemas.entity, {
            [gallery.scope!.field]: String(row.id),
          })
        : []
  )
  const coverChoices: Gallery | undefined = gallery && {
    entity: gallery,
    rows: galleryRows.data,
  }

  const savedTranslations = langValues(translated, saved)
  const fieldsDirty = !sameValues(values, initialValues(plain, saved))
  const dirtyLangs = LANGS.filter(
    (lang) => !sameValues(translations[lang], savedTranslations[lang])
  )
  const dirty = fieldsDirty || dirtyLangs.length > 0

  const shouldBlockFn = useCallback(() => dirty, [dirty])
  const blocker = useBlocker({
    shouldBlockFn,
    enableBeforeUnload: dirty,
    withResolver: true,
  })

  useEffect(() => {
    const pending = uploads
    return () => {
      for (const key of pending.current) void deleteUpload(key).catch(() => {})
    }
  }, [])

  function onUploaded(key: string, filled: Values) {
    uploads.current.push(key)
    const names = new Set(plain.map((field) => field.name))
    const fills = Object.entries(filled).filter(([name]) => names.has(name))
    setValues((current) => ({
      ...current,
      ...Object.fromEntries(fills.map(([name, v]) => [name, String(v)])),
    }))
  }

  // PATCH body of the fields. A cover whose photo is gone by now the API has
  // cleared (migrations/0002): it goes as null rather than answering 422.
  function fieldsBody() {
    const body = patchBody(entity, values)
    const file = gallery?.fields.find((field) => field.kind === "file")
    const keys =
      file && galleryRows.data?.map((galleryRow) => galleryRow[file.name])
    for (const field of plain) {
      if (field.kind === "cover" && keys && !keys.includes(body[field.name])) {
        body[field.name] = null
      }
    }
    return body
  }

  async function saveFields() {
    const body = fieldsBody()
    const next = await patchRow(path, entity.schemas.entity, body)
    // Files replaced or removed: the row named them, now nothing does. One
    // that another row still names answers 409 and stays.
    const kept = new Set(Object.values(next))
    const dropped = plain
      .filter((field) => field.kind === "file")
      .map((field) => saved[field.name])
      .filter((key): key is string => typeof key === "string")
    for (const key of [...dropped, ...uploads.current]) {
      if (!kept.has(key)) void deleteUpload(key).catch(() => {})
    }
    uploads.current = []
    setSaved(next)
    setValues(initialValues(plain, next))
  }

  // An entity that needs no Translation at all (a photo's caption) has an
  // emptied one removed rather than refused: an empty caption is no caption.
  const emptied = (lang: Lang) =>
    !isRequired(entity.schemas.create, "translations.en") &&
    Object.keys(translationBody(entity, translations[lang])).length === 0

  async function saveTranslation(lang: Lang) {
    if (emptied(lang)) {
      if (translationsOf(saved)[lang] !== undefined) {
        await removeTranslation(lang)
      }
      return
    }
    const body = translationBody(entity, translations[lang])
    const next = await putTranslation(path, lang, entity.schemas.entity, body)
    setSaved(next)
    setTranslations((current) => ({
      ...current,
      [lang]: initialValues(translated, translationsOf(next)[lang]),
    }))
  }

  async function removeTranslation(lang: Lang) {
    await deleteTranslation(path, lang)
    setSaved((current) => {
      const rest = { ...translationsOf(current) }
      delete rest[lang]
      return { ...current, translations: rest }
    })
    setTranslations((current) => ({
      ...current,
      [lang]: initialValues(translated),
    }))
  }

  // Publishes what is saved: the button waits while anything is unsaved, so
  // the fields can take the answer as they are.
  async function publish(status: "draft" | "published") {
    const next = await patchRow(path, entity.schemas.entity, { status })
    setSaved(next)
    setValues(initialValues(plain, next))
  }

  // EN can go only where the entity doesn't need it (a photo's caption).
  const removable = (lang: Lang) =>
    translationsOf(saved)[lang] !== undefined &&
    (lang !== "en" || !isRequired(entity.schemas.create, "translations.en"))

  return (
    <>
      <h1 className="font-heading text-zsd-headline-md break-words">
        {rowTitle(entity, saved)}
      </h1>
      {entity.publishable && (
        <PublishBar row={saved} dirty={dirty} onPublish={publish} />
      )}
      {plain.length > 0 && (
        <Section title="Fields">
          <EditorForm
            fields={plain}
            values={values}
            dirty={fieldsDirty}
            submitLabel="Save fields"
            required={(field) => isRequired(entity.schemas.create, field.name)}
            onChange={(name, value) =>
              setValues((current) => ({ ...current, [name]: value }))
            }
            onUploaded={onUploaded}
            gallery={coverChoices}
            validate={() => validatePatch(entity, fieldsBody())}
            send={saveFields}
          />
        </Section>
      )}
      {entity.translated && (
        <Section
          title="Translations"
          wide={translated.some((field) => field.kind === "markdown")}
        >
          <Tabs value={tab} onValueChange={(next) => setTab(next as Lang)}>
            <TabsList className="h-auto flex-wrap">
              {LANGS.map((lang) => {
                const { filled, total } = completeness(
                  entity,
                  translations[lang]
                )
                return (
                  <TabsTrigger key={lang} value={lang} className="gap-zsd-xs">
                    <span className="font-mono uppercase">{lang}</span>
                    <span
                      data-testid={`completeness-${lang}`}
                      className="text-muted-foreground tabular-nums"
                    >
                      {filled}/{total}
                    </span>
                    {dirtyLangs.includes(lang) && (
                      <>
                        <span aria-hidden>•</span>
                        <span className="sr-only">, unsaved</span>
                      </>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {LANGS.map((lang) => (
              <TabsContent key={lang} value={lang} className="pt-zsd-sm">
                <EditorForm
                  fields={translated}
                  values={translations[lang]}
                  dirty={dirtyLangs.includes(lang)}
                  lang={lang}
                  submitLabel={`Save ${lang.toUpperCase()}`}
                  required={(field) =>
                    isRequired(entity.schemas.translation!, field.name)
                  }
                  onChange={(name, value) =>
                    setTranslations((current) => ({
                      ...current,
                      [lang]: { ...current[lang], [name]: value },
                    }))
                  }
                  onUploaded={onUploaded}
                  validate={() =>
                    emptied(lang)
                      ? {}
                      : validateTranslation(
                          entity,
                          translationBody(entity, translations[lang])
                        )
                  }
                  send={() => saveTranslation(lang)}
                  actions={
                    removable(lang) && (
                      <RemoveTranslationButton
                        lang={lang}
                        onConfirm={() => removeTranslation(lang)}
                      />
                    )
                  }
                />
              </TabsContent>
            ))}
          </Tabs>
        </Section>
      )}
      {gallery && (
        <Section title={gallery.label}>
          <GallerySection
            child={gallery}
            parentId={String(row.id)}
            rows={galleryRows}
          />
        </Section>
      )}
      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => !open && blocker.reset?.()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved changes:{" "}
              {[
                ...(fieldsDirty ? ["fields"] : []),
                ...dirtyLangs.map((lang) => lang.toUpperCase()),
              ].join(", ")}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => blocker.proceed?.()}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// `wide`: room for a Markdown field's text and preview side by side.
function Section({
  title,
  wide,
  children,
}: {
  title: string
  wide?: boolean
  children: ReactNode
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col gap-zsd-md",
        wide ? "max-w-6xl" : "max-w-2xl"
      )}
    >
      <h2 id={id} className="font-heading text-zsd-headline-sm">
        {title}
      </h2>
      {children}
    </section>
  )
}

// One form of the editor; errors are by field name.
function EditorForm({
  fields,
  values,
  dirty,
  lang,
  submitLabel,
  required,
  onChange,
  onUploaded,
  gallery,
  validate,
  send,
  actions,
}: {
  fields: Field[]
  values: FormValues
  dirty: boolean
  lang?: Lang
  submitLabel: string
  required: (field: Field) => boolean
  onChange: (name: string, value: FormValue) => void
  onUploaded: (key: string, filled: Values) => void
  gallery?: Gallery
  validate: () => FieldErrors
  send: () => Promise<void>
  actions?: ReactNode
}) {
  const saving = useSaving()
  const leftover = otherErrors(fields, saving.errors, (field) => field.name)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void saving.save(validate(), send)
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-zsd-md">
      {fields.map((field) => (
        <FieldInput
          key={field.name}
          // In a wide section only a Markdown field takes the whole width.
          className={field.kind === "markdown" ? undefined : "max-w-2xl"}
          field={field}
          value={values[field.name] ?? ""}
          required={required(field)}
          errors={saving.errors[field.name]}
          lang={lang}
          dir={lang && langDirection(lang)}
          onChange={(value) => onChange(field.name, value)}
          onUploaded={onUploaded}
          gallery={gallery}
        />
      ))}
      {(saving.failure || leftover.length > 0) && (
        <div role="alert" className="text-zsd-body-sm text-zsd-error">
          {saving.failure && <p>{saving.failure}</p>}
          {leftover.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-zsd-sm">
        <Button type="submit" disabled={saving.pending}>
          {saving.pending ? "Saving…" : submitLabel}
        </Button>
        {actions}
        <p
          aria-live="polite"
          className="text-zsd-body-sm text-muted-foreground"
        >
          {dirty ? "Unsaved changes" : saving.saved && "Saved"}
        </p>
      </div>
    </form>
  )
}

const PUBLISHED_AT: Column = { label: "", field: "publishedAt", kind: "date" }

// The status of a publishable row and the button that changes it.
function PublishBar({
  row,
  dirty,
  onPublish,
}: {
  row: AdminRow
  dirty: boolean
  onPublish: (status: "draft" | "published") => Promise<void>
}) {
  const saving = useSaving()
  const published = row.status === "published"
  const date = cellText(row, PUBLISHED_AT)

  return (
    <div className="flex flex-wrap items-center gap-zsd-sm">
      <p data-testid="publish-status" className="text-zsd-body-md">
        {published ? "Published" : "Draft"}
        {published && date && `, ${date}`}
      </p>
      <Button
        type="button"
        variant={published ? "outline" : "default"}
        disabled={dirty || saving.pending}
        onClick={() =>
          void saving.save({}, () =>
            onPublish(published ? "draft" : "published")
          )
        }
      >
        {saving.pending ? "Saving…" : published ? "Unpublish" : "Publish"}
      </Button>
      {dirty && (
        <p className="text-zsd-body-sm text-muted-foreground">
          Save the changes first.
        </p>
      )}
      {saving.failure && (
        <p role="alert" className="text-zsd-body-sm text-zsd-error">
          {saving.failure}
        </p>
      )}
    </div>
  )
}

function RemoveTranslationButton({
  lang,
  onConfirm,
}: {
  lang: Lang
  onConfirm: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const saving = useSaving()
  const name = lang.toUpperCase()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Delete {name}
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete the {name} Translation?</AlertDialogTitle>
          <AlertDialogDescription>
            The site shows EN on {name} instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {saving.failure && (
          <p role="alert" className="text-zsd-body-sm text-zsd-error">
            {saving.failure}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={saving.pending}
            onClick={(event) => {
              // Stay open until the API answers.
              event.preventDefault()
              void saving.save({}, async () => {
                await onConfirm()
                setOpen(false)
              })
            }}
          >
            {saving.pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
