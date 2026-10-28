import { useCallback, useEffect, useRef, useState } from "react"

import type { Track } from "@contracts/api/public"
import { DEFAULT_LANG } from "@contracts/lang"
import { mediaUrl } from "@contracts/media"
import { getTracks } from "@/shared/api"

import { readPlayer, writePlayer } from "../lib/player-storage"

// The playlist and one <audio> for it. The layout keeps the player mounted,
// so the music goes on across page changes. The element has no `src` until
// the first play: nothing of the audio loads before (and `preload="none"`
// after, until it plays). Never starts on its own.
export function usePlayer() {
  const audio = useRef<HTMLAudioElement>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [saved] = useState(readPlayer)
  const [trackId, setTrackId] = useState(saved.trackId)
  const [volume, setVolume] = useState(saved.volume)
  const [playing, setPlaying] = useState(false)

  // Tracks are not translated: one list for every Lang. None (or no
  // answer): no player.
  useEffect(() => {
    const controller = new AbortController()
    getTracks(DEFAULT_LANG, { signal: controller.signal }).then(
      setTracks,
      () => {}
    )
    return () => controller.abort()
  }, [])

  // The last Track, if it is still in the playlist; else the first.
  const index = Math.max(
    0,
    tracks.findIndex((track) => track.id === trackId)
  )
  const track: Track | undefined = tracks[index]

  const play = useCallback(
    (at = index) => {
      const element = audio.current
      const next = tracks[at]
      if (!element || !next) return
      const src = mediaUrl(next.key)
      if (element.getAttribute("src") !== src) element.src = src
      setTrackId(next.id)
      // A later pause or a new src rejects it; the element's events tell.
      element.play().catch(() => {})
    },
    [tracks, index]
  )

  const pause = useCallback(() => audio.current?.pause(), [])

  const toggle = useCallback(
    () => (playing ? pause() : play()),
    [playing, pause, play]
  )

  // `step` along the playlist, round from the end to the start.
  const skip = useCallback(
    (step: 1 | -1) => play((index + step + tracks.length) % tracks.length),
    [play, index, tracks.length]
  )

  useEffect(() => {
    if (audio.current) audio.current.volume = volume
  }, [volume, tracks])

  useEffect(() => writePlayer({ volume, trackId }), [volume, trackId])

  useMediaSession(playing ? track : undefined, { play, pause, skip })

  return {
    tracks,
    track,
    index,
    playing,
    volume,
    setVolume,
    play,
    toggle,
    skip,
    audio: {
      ref: audio,
      preload: "none",
      onPlay: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onEnded: () => skip(1),
    } as const,
  }
}

export type Player = ReturnType<typeof usePlayer>

type Actions = {
  play: () => void
  pause: () => void
  skip: (step: 1 | -1) => void
}

// The lock screen and the system media controls: the Track playing, and
// play, pause, previous and next. Left alone until the first play.
function useMediaSession(track: Track | undefined, actions: Actions) {
  const latest = useRef(actions)
  useEffect(() => {
    latest.current = actions
  })

  useEffect(() => {
    if (!track || !("mediaSession" in navigator)) return
    const session = navigator.mediaSession
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: "WebRunner",
    })
    session.setActionHandler("play", () => latest.current.play())
    session.setActionHandler("pause", () => latest.current.pause())
    session.setActionHandler("previoustrack", () => latest.current.skip(-1))
    session.setActionHandler("nexttrack", () => latest.current.skip(1))
  }, [track])
}
