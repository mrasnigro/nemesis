import { db, lastInsertId, toDbDate } from './index.js'

export { db, lastInsertId, toDbDate }

/** Execute a drizzle MySQL insert and return the auto-increment id of the new row. */
export async function insertReturningId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any,
): Promise<number> {
  if (builder && typeof builder.$returningId === 'function') {
    return lastInsertId(await builder.$returningId())
  }
  return lastInsertId(await builder)
}
