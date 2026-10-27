import { getRouteApi } from "@tanstack/react-router"

import { useHeroTier } from "../model/use-hero-tier"
import { Hero } from "./hero"

const route = getRouteApi("/$lang/")

export function HomePage() {
  const { profile } = route.useLoaderData()
  const tier = useHeroTier()

  return <Hero tier={tier} profile={profile} />
}
