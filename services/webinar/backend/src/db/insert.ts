import { db, lastInsertId, toSqliteDate } from './index.js'

export { db, lastInsertId, toSqliteDate }

/**
 * Execute a drizzle insert that supports `.returning({ id })`.
 */
export async function insertReturningId(
  // drizzle insert builder with .returning
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  idColumn: any,
): Promise<number> {
  if (builder && typeof builder.returning === 'function') {
    const rows = await builder.returning({ id: idColumn })
    if (Array.isArray(rows) && rows[0]?.id != null) return Number(rows[0].id)
  }
  const result = await builder
  return lastInsertId(result)
}
