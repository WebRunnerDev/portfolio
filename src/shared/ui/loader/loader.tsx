import { useT } from "@/shared/i18n"
import { STAGGER } from "@/shared/lib/motion"
import { cn } from "@/shared/lib/utils"
import { LogoTiles, type TilePlacement } from "@/shared/ui/logo"

// How long a wait may last before the Loader shows: a faster answer never
// flashes it. The router waits as long before it renders `pendingComponent`.
export const LOADER_DELAY_MS = 300

// The step of each tile (LOGO_TILES order) in the wave from the top start
// corner of the logo to the bottom end one, `stagger-item` apart. Tiles on one
// diagonal light up together.
const STEPS = [4, 2, 0, 1, 3, 4, 5]
const WAVE: TilePlacement[] = STEPS.map((step) => ({
  delay: step * STAGGER.item,
}))

// The rhombus loader (DESIGN.md › Tile): the logo in `tile-inactive`, its
// tiles lighting up in `tile` one after another; only opacity moves (index.css
// › loader). It fades in after LOADER_DELAY_MS unless `delay` is false (the
// router already waited). Under reduced motion the tiles stand lit and the
// label shows; otherwise the label is for screen readers only.
export function Loader({
  delay = true,
  className,
}: {
  delay?: boolean
  className?: string
}) {
  const t = useT()

  return (
    <div
      role="status"
      data-testid="loader"
      className={cn(
        "flex items-center gap-zsd-md",
        delay && "loader-delayed",
        className
      )}
    >
      <span dir="ltr" className="relative size-10 shrink-0">
        <LogoTiles className="absolute inset-0 size-full text-zsd-outline-muted" />
        <LogoTiles
          placements={WAVE}
          tileClassName="loader-tile"
          className="absolute inset-0 size-full text-zsd-primary"
        />
      </span>
      <span className="sr-only text-zsd-body-sm text-zsd-on-surface-muted motion-reduce:not-sr-only">
        {t("load.pending")}
      </span>
    </div>
  )
}
