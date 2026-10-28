import { BRAND } from "@contracts/meta"

// Names a draft keeps as written in EN: the Brand, the owner's name, every
// Technology and every company of the Experience. Read on each request, so a
// new technology counts at once.
export async function keptNames(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT name FROM profile_translation WHERE lang = 'en'
       UNION SELECT name FROM technology
       UNION SELECT company FROM experience_translation WHERE lang = 'en'`
    )
    .all<{ name: string }>()
  return [...new Set([BRAND, ...results.map((row) => row.name)])]
}
