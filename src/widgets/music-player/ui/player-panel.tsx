import type { CSSProperties } from "react"
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react"

import type { Track } from "@contracts/api/public"
import { useT } from "@/shared/i18n"
import { STAGGER } from "@/shared/lib/motion"
import { cn } from "@/shared/lib/utils"
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Slider,
} from "@/shared/ui/kit"

import type { Player } from "../model/use-player"
import { PlayerButton } from "./player-button"

// The panel rises from the button; its rows follow `stagger-item` apart
// (`player-in`, `player-row-in`, index.css), so the eye goes from what plays
// to the controls to the list.
const row = (i: number) =>
  ({ "--player-delay": `${i * STAGGER.item}s` }) as CSSProperties

const LABEL =
  "font-zsd-label-mono text-zsd-label-mono text-zsd-on-surface-muted uppercase"

const CONTROL = "size-zsd-control-height p-0"

// Where a Track comes from and under what license. A source that is a link
// opens in a new tab.
function Credit({ track }: { track: Track }) {
  const url = URL.canParse(track.source) ? new URL(track.source) : null
  const source =
    url && /^https?:$/.test(url.protocol) ? (
      <a
        href={url.href}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-zsd-on-surface"
      >
        {url.hostname}
      </a>
    ) : (
      track.source
    )
  return (
    <p className="text-zsd-body-sm text-zsd-on-surface-muted">
      {source}
      {track.source && track.license && " · "}
      {track.license}
    </p>
  )
}

// The panel over the corner button: what plays, play/pause, previous and
// next, the volume, and the playlist with each Track's credit. Radix moves
// the focus in, closes on Esc and outside, and returns the focus to the
// button. Never mirrored: `dir="ltr"` even in the ar Lang.
export function PlayerPanel({ player }: { player: Player }) {
  const t = useT()
  const { tracks, track, index, playing } = player
  const label = t("player.label")

  return (
    <Popover>
      <PopoverTrigger asChild>
        <PlayerButton playing={playing} label={label} />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        dir="ltr"
        aria-label={label}
        data-testid="player-panel"
        className="max-h-(--radix-popover-content-available-height) w-[min(20rem,calc(100vw-2*var(--zsd-spacing-sm)))] gap-zsd-md overflow-y-auto rounded-none border border-border bg-zsd-surface-raised p-zsd-lg text-zsd-on-surface shadow-none ring-0 data-open:player-in! data-closed:player-out!"
      >
        <div style={row(0)} className="player-row-in">
          <p className={LABEL}>{label}</p>
          {track && (
            <>
              <p className="truncate font-heading text-zsd-headline-sm">
                {track.title}
              </p>
              <p className="truncate text-zsd-body-sm text-zsd-on-surface-muted">
                {track.artist}
              </p>
            </>
          )}
        </div>
        <div
          style={row(1)}
          className="flex player-row-in items-center gap-zsd-sm"
        >
          <Button
            variant="outline"
            aria-label={t("player.previous")}
            title={t("player.previous")}
            className={CONTROL}
            onClick={() => player.skip(-1)}
          >
            <SkipBack aria-hidden strokeWidth={1.5} />
          </Button>
          <Button
            aria-label={playing ? t("player.pause") : t("player.play")}
            title={playing ? t("player.pause") : t("player.play")}
            data-testid="player-toggle"
            className={CONTROL}
            onClick={player.toggle}
          >
            {playing ? (
              <Pause aria-hidden strokeWidth={1.5} />
            ) : (
              <Play aria-hidden strokeWidth={1.5} />
            )}
          </Button>
          <Button
            variant="outline"
            aria-label={t("player.next")}
            title={t("player.next")}
            className={CONTROL}
            onClick={() => player.skip(1)}
          >
            <SkipForward aria-hidden strokeWidth={1.5} />
          </Button>
          <Volume2
            aria-hidden
            strokeWidth={1.5}
            className="ms-zsd-xs size-4 shrink-0 text-zsd-on-surface-muted"
          />
          <Slider
            dir="ltr"
            aria-label={t("player.volume")}
            min={0}
            max={100}
            step={5}
            value={[Math.round(player.volume * 100)]}
            onValueChange={([value]) => player.setVolume(value / 100)}
            className="min-h-zsd-control-height flex-1"
          />
        </div>
        <section
          style={row(2)}
          aria-labelledby="player-tracks"
          className="flex player-row-in flex-col gap-zsd-xs border-t border-border pt-zsd-md"
        >
          <h2 id="player-tracks" className={LABEL}>
            {t("player.tracks")}
          </h2>
          <ol className="flex flex-col">
            {tracks.map((item, i) => {
              const current = i === index
              return (
                <li key={item.id} className="flex flex-col py-zsd-xs">
                  <Button
                    variant="ghost"
                    aria-current={current || undefined}
                    className="h-auto min-h-zsd-control-height w-full justify-start gap-zsd-sm px-zsd-sm text-start whitespace-normal"
                    onClick={() => player.play(i)}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 shrink-0 rotate-45",
                        current ? "bg-zsd-primary" : "bg-zsd-outline-muted"
                      )}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-zsd-label-md">{item.title}</span>
                      <span className="text-zsd-body-sm text-zsd-on-surface-muted">
                        {item.artist}
                      </span>
                    </span>
                  </Button>
                  {/* Under the title: past the button's padding and tile. */}
                  <div className="ps-[calc(2*var(--zsd-spacing-sm)+6px)]">
                    <Credit track={item} />
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </PopoverContent>
    </Popover>
  )
}
