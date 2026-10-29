import { useIntentImport } from "@/shared/lib/intent"
import { useT } from "@/shared/i18n"

import { usePlayer } from "../model/use-player"
import { PlayerButton } from "./player-button"

const loadPanel = () => import("./player-panel")

// The music player (#120): a button in the bottom end corner of the
// viewport and its panel. The layout renders it outside the <Outlet>, so it
// lives across page changes; its own view-transition-name keeps it out of
// the page's crossfade. Never mirrored: `dir="ltr"` puts it bottom right in
// every Lang. The panel isn't on the first paint: it loads when the visitor
// reaches for the button (#142), which stands in for its trigger until then.
// No Tracks, no player.
export function MusicPlayer() {
  const player = usePlayer()
  const t = useT()
  const { loaded, triggerProps } = useIntentImport(loadPanel)

  if (!player.tracks.length) return null

  return (
    <div
      dir="ltr"
      data-testid="music-player"
      className="fixed inset-e-zsd-lg bottom-zsd-lg z-40 [view-transition-name:music-player] max-sm:inset-e-zsd-sm max-sm:bottom-zsd-sm"
    >
      <audio {...player.audio} />
      {loaded ? (
        <loaded.module.PlayerPanel player={player} defaultOpen={loaded.open} />
      ) : (
        <PlayerButton
          playing={player.playing}
          label={t("player.label")}
          {...triggerProps}
        />
      )}
    </div>
  )
}
