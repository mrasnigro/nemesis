import { z } from 'zod'

export const pageQuery = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export type PageQuery = z.infer<typeof pageQuery>

export function resolveSort(
  sort: string | undefined,
  allowed: Record<string, string>,
  fallback: string,
): { column: string; direction: 'ASC' | 'DESC' } {
  const raw = sort && sort.length > 0 ? sort : fallback
  const descending = raw.startsWith('-')
  const key = descending ? raw.slice(1) : raw
  const column = allowed[key]
  if (!column) {
    return { column: allowed[fallback.replace(/^-/, '')] ?? Object.values(allowed)[0], direction: 'DESC' }
  }
  return { column, direction: descending ? 'DESC' : 'ASC' }
}

export function pageMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total }
}
