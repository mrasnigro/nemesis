import { db } from '../src/db/index.ts'
import { users, webinars } from '../src/db/schema.ts'

async function main() {
  const u = await db.select().from(users).limit(5)
  const w = await db.select().from(webinars).limit(5)
  console.log(
    'users',
    u.length,
    u.map((x) => ({ id: x.id, email: x.email })),
  )
  console.log(
    'webinars',
    w.length,
    w.map((x) => ({ id: x.id, title: x.title, clientId: x.clientId })),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
