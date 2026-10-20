import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const manifest = JSON.parse(readFileSync('.local/content-manifest.json', 'utf8'))
const sources = Object.entries(manifest).filter(([path]) => path.includes('/_raw/') || path.endsWith('.pdf'))
let failed = false
for (const [path, expected] of sources) {
  try {
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex')
    if (actual !== expected) throw new Error('source bytes changed')
  } catch (error) {
    console.error(`${path}: ${error.message}`)
    failed = true
  }
}
if (failed) process.exitCode = 1
else console.log(`${sources.length} immutable source files match their baseline hashes`)
