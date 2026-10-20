// Every column that holds an R2 key: a file one of them names stays.
// (D1 allows only a few terms in a compound SELECT, hence no UNION.)
const KEY_IN_USE = `
  SELECT EXISTS (SELECT 1 FROM profile WHERE photo_key = ?1)
    OR EXISTS (SELECT 1 FROM project WHERE cover_key = ?1)
    OR EXISTS (SELECT 1 FROM post WHERE cover_key = ?1)
    OR EXISTS (SELECT 1 FROM album WHERE cover_key = ?1)
    OR EXISTS (SELECT 1 FROM photo WHERE r2_key = ?1)
    OR EXISTS (SELECT 1 FROM track WHERE r2_key = ?1)
    OR EXISTS (SELECT 1 FROM cv_pdf WHERE r2_key = ?1) AS in_use`

export async function keyInUse(db: D1Database, key: string) {
  return (await db.prepare(KEY_IN_USE).bind(key).first("in_use")) === 1
}

// Deletes from R2 the files of a deleted row that no other row names.
export async function removeUnusedFiles(
  env: Pick<Env, "DB" | "MEDIA">,
  keys: unknown[]
) {
  const unique = new Set(keys.filter((key) => typeof key === "string"))
  for (const key of unique) {
    if (!(await keyInUse(env.DB, key))) await env.MEDIA.delete(key)
  }
}
