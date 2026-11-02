import {
  AdminApiError,
  getRow,
  listRows,
  type AdminRow,
} from "../api/admin-api"
import type { EntityConfig } from "./entities"

// An entity's rows, those of one row of its scope if `scopeId` is set. The
// Profile is one record: 404 until it's created, then a one-row list.
export async function loadRows(
  entity: EntityConfig,
  scopeId = ""
): Promise<AdminRow[]> {
  if (!entity.single) {
    const query =
      entity.scope && scopeId ? { [entity.scope.field]: scopeId } : undefined
    return listRows(entity.path, entity.schemas.entity, query)
  }
  try {
    return [await getRow(entity.path, entity.schemas.entity)]
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) {
      return []
    }
    throw error
  }
}
