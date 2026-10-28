import type { ComponentProps } from "react"

import { STAGGER } from "@/shared/lib/motion"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/kit"
import { LogoTiles, type TilePlacement } from "@/shared/ui/logo"

// Where each tile (LOGO_TILES order) starts its bounce, `stagger-item`
// steps back into the round, so neighbours never rise together.
const STEPS = [3, 1, 4, 0, 2, 5, 1]
const BOUNCE: TilePlacement[] = STEPS.map((step) => ({
  delay: -step * STAGGER.item,
}))

// The logo as an equalizer (DESIGN.md › Tile): while the music plays its
// tiles turn `tile` and rise and fall, each on its own beat (`player-tile`,
// index.css); paused, they settle back into the logo. Under reduced motion
// only the colour tells.
function Equalizer({ playing }: { playing: boolean }) {
  return (
    <LogoTiles
      data-testid="player-tiles"
      placements={BOUNCE}
      tileClassName={playing ? "player-tile" : undefined}
      className={cn(
        "size-6",
        playing ? "text-zsd-primary" : "text-zsd-on-surface"
      )}
    />
  )
}

// The mini button in the corner that opens the panel, and the Suspense
// fallback while the panel loads, so nothing shifts.
export function PlayerButton({
  playing,
  label,
  className,
  ...props
}: ComponentProps<typeof Button> & { playing: boolean; label: string }) {
  return (
    <Button
      variant="outline"
      aria-label={label}
      title={label}
      data-playing={playing}
      className={cn(
        "size-zsd-control-height bg-zsd-surface-raised p-0 dark:bg-zsd-surface-raised",
        className
      )}
      {...props}
    >
      <Equalizer playing={playing} />
    </Button>
  )
}
