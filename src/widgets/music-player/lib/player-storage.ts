// The volume and the last Track, kept between visits.
export const PLAYER_STORAGE_KEY = "player"

export type SavedPlayer = {
  // 0 to 1, as HTMLMediaElement.volume.
  volume: number
  trackId: number | null
}

export const DEFAULT_PLAYER: SavedPlayer = { volume: 0.6, trackId: null }

// Whatever is stored, a valid state: a missing or broken field takes its
// default.
export function parsePlayer(raw: string | null): SavedPlayer {
  let value: unknown
  try {
    value = raw ? JSON.parse(raw) : null
  } catch {
    value = null
  }
  const { volume, trackId } = (value ?? {}) as Record<string, unknown>
  return {
    volume:
      typeof volume === "number" && volume >= 0 && volume <= 1
        ? volume
        : DEFAULT_PLAYER.volume,
    trackId: Number.isInteger(trackId) ? (trackId as number) : null,
  }
}

// Storage throws in private modes and with blocked site data: the player then
// starts from the defaults.
export function readPlayer(): SavedPlayer {
  try {
    return parsePlayer(localStorage.getItem(PLAYER_STORAGE_KEY))
  } catch {
    return DEFAULT_PLAYER
  }
}

export function writePlayer(player: SavedPlayer) {
  try {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player))
  } catch {
    // Not persisted; the player still uses it for this visit.
  }
}
