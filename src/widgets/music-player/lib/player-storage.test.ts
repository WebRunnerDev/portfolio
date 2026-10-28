import { describe, expect, it } from "vitest"

import { DEFAULT_PLAYER, parsePlayer } from "./player-storage"

describe("parsePlayer", () => {
  it("reads what the player wrote", () => {
    expect(parsePlayer('{"volume":0.25,"trackId":3}')).toEqual({
      volume: 0.25,
      trackId: 3,
    })
  })

  it("falls back to the defaults for nothing or garbage", () => {
    expect(parsePlayer(null)).toEqual(DEFAULT_PLAYER)
    expect(parsePlayer("{not json")).toEqual(DEFAULT_PLAYER)
    expect(parsePlayer('"loud"')).toEqual(DEFAULT_PLAYER)
  })

  it("drops a field out of range on its own", () => {
    expect(parsePlayer('{"volume":2,"trackId":3}')).toEqual({
      volume: DEFAULT_PLAYER.volume,
      trackId: 3,
    })
    expect(parsePlayer('{"volume":0,"trackId":"3"}')).toEqual({
      volume: 0,
      trackId: null,
    })
  })
})
