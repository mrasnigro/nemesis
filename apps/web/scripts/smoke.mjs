// Runs every *.smoke.mjs under src/ in its own Node process and fails if any of them fails.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')
const files = readdirSync(srcDir, { recursive: true })
  .filter((file) => String(file).endsWith('.smoke.mjs'))
  .map((file) => path.join(srcDir, String(file)))
  .sort()

let failed = 0
for (const file of files) {
  const label = path.relative(srcDir, file)
  const result = spawnSync(process.execPath, [file], { encoding: 'utf8' })
  if (result.status === 0) {
    console.log(`ok   ${label}`)
  } else {
    failed += 1
    console.log(`FAIL ${label}`)
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)
  }
}

console.log(`\n${files.length - failed}/${files.length} smoke suites passed`)
process.exit(failed ? 1 : 0)
