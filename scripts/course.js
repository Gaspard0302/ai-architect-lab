// Which course a command operates on. Everything course-specific — content, blueprint,
// question bank, ratings, attempt log — lives under courses/<name>/; app/ and scripts/
// are shared and hold nothing course-specific.
//
// There is deliberately NO default. Two courses are in flight at once, and silently
// quizzing you on the wrong one is worse than an error message.
//
//   --course developer    (or COURSE=developer)

import { readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const COURSES = join(REPO, 'courses')

export function courseRoot() {
  const arg = process.argv.indexOf('--course')
  const name = arg > -1 ? process.argv[arg + 1] : process.env.COURSE
  const available = readdirSync(COURSES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  if (!name || !available.includes(name)) {
    const what = name ? `unknown course "${name}"` : 'no course selected'
    console.error(`\n  ${what}. Pass --course <name> or set COURSE.`)
    console.error(`  available: ${available.join(', ')}\n`)
    process.exit(1)
  }
  const root = join(COURSES, name)
  if (!existsSync(root)) process.exit(1)
  return { name, root, repo: REPO }
}
