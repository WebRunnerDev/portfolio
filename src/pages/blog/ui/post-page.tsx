import { Link, getRouteApi } from "@tanstack/react-router"
import { ArrowLeft, Share2 } from "lucide-react"

import { IMAGE_WIDTHS, imageUrl } from "@contracts/media"
import { pageUrl } from "@contracts/meta"
import { useLang, useT } from "@/shared/i18n"
import { sharedCover } from "@/shared/lib/view-transition"
import {
  FallbackNotice,
  fallbackDir,
  fallbackLang,
} from "@/shared/ui/fallback-notice"
import { Button } from "@/shared/ui/kit"
import { Markdown } from "@/shared/ui/markdown"

import { PostDate } from "./post-date"
import { PostTags } from "./post-tags"

const route = getRouteApi("/$lang/blog/$slug")

// The prose column (720px) from where it fits with the gutters, else the
// full width.
const COVER_SIZES = "(min-width: 816px) 720px, 100vw"

// LinkedIn reads the title, description and image from the page's OG tags.
function linkedInShareUrl(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}

// A Post (CONTEXT.md › Post): its title (the only h1), date and reading time,
// Tags (links to the filtered list), cover and body. The cover is the LCP, so
// it loads at once. On the Fallback the notice names the post as English, and
// its text is marked `lang="en"` (and `dir="ltr"` on an RTL Lang).
export function PostPage() {
  const lang = useLang()
  const t = useT()
  const { post } = route.useLoaderData()
  const { coverKey } = post
  const textLang = fallbackLang(post)
  const textDir = fallbackDir(post, lang)
  const canonical = pageUrl(
    window.location.origin,
    lang,
    `blog/${encodeURIComponent(post.slug)}`
  )

  return (
    <div className="mx-auto w-full max-w-(--zsd-x-zsd-layout-content-max) px-zsd-lg py-zsd-section md:px-zsd-xxl lg:py-zsd-section-lg">
      <article className="mx-auto max-w-(--zsd-x-zsd-layout-prose-max)">
        <Link
          to="/$lang/blog"
          params={{ lang }}
          className="inline-flex min-h-zsd-control-height items-center gap-zsd-xs text-zsd-body-sm text-zsd-primary-text underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ArrowLeft
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-4 rtl:rotate-180"
          />
          {t("blog.filter.reset")}
        </Link>
        <header className="mt-zsd-lg flex flex-col items-start gap-zsd-md">
          <h1
            lang={textLang}
            dir={textDir}
            className="font-heading text-zsd-headline-md break-words md:text-zsd-headline-lg"
          >
            {post.title}
          </h1>
          <PostDate post={post} />
          <FallbackNotice fallback={post.fallback} text="post.fallback" />
          <PostTags tags={post.tags} activeTag={undefined} />
          {coverKey && (
            // Decorative: the title names the page. The card's cover grows
            // into it.
            <img
              {...sharedCover("post", post.slug)}
              src={imageUrl(coverKey, 1280)}
              srcSet={IMAGE_WIDTHS.map(
                (w) => `${imageUrl(coverKey, w)} ${w}w`
              ).join(", ")}
              sizes={COVER_SIZES}
              width={1280}
              height={720}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="mt-zsd-md aspect-video w-full border border-zsd-outline-muted bg-zsd-surface-raised object-cover"
            />
          )}
        </header>
        <Markdown
          lang={textLang}
          dir={textDir}
          className="mt-zsd-section lg:mt-zsd-section-lg"
        >
          {post.body}
        </Markdown>
        <footer className="mt-zsd-section border-t border-zsd-outline-muted pt-zsd-xl">
          <Button asChild variant="outline">
            <a
              href={linkedInShareUrl(canonical)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Share2 aria-hidden="true" strokeWidth={1.5} />
              {t("post.share")}
            </a>
          </Button>
        </footer>
      </article>
    </div>
  )
}
