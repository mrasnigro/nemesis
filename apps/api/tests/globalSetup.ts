export default async function setup() {
  if (!process.env.DB_NAME?.includes('test')) {
    throw new Error(`Refusing to run integration tests against database "${process.env.DB_NAME}"`)
  }
  const { runMigrations } = await import('../src/core/migrate.js')
  await runMigrations(() => {})
}
