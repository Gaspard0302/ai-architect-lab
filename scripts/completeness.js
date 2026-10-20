// Blueprint completeness report.
//
// Answers "what haven't I covered?" against the 38 exam objectives — NOT against the
// course modules, because the domains do not map 1:1 onto them.
//
// Two distinct kinds of empty cell, never conflated:
//   · TO WRITE       — the course covers it, the bank just doesn't have items yet.
//   · CANNOT SOURCE  — the blueprint names it but the course never teaches it. Under
//                      the course-sourced-only policy these stay at zero permanently;
//                      they are a reading list, not a backlog.
//
//   pnpm report

import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { courseRoot } from './course.js'

const { root: ROOT } = courseRoot()
// Aim for enough items per domain to build this many distinct mocks without repeats.
const TARGET_MOCKS = 4

const blueprint = parse(await readFile(join(ROOT, 'objectives.yaml'), 'utf8'))

const counts = new Map()
const inferred = new Map()
let total = 0

const QDIR = join(ROOT, 'questions')
if (existsSync(QDIR)) {
  for (const f of (await readdir(QDIR)).filter((f) => extname(f) === '.yaml')) {
    for (const q of parse(await readFile(join(QDIR, f), 'utf8')) ?? []) {
      if (!q || typeof q !== 'object') continue
      counts.set(q.objective, (counts.get(q.objective) ?? 0) + 1)
      if ((q.provenance ?? 'course') === 'inferred')
        inferred.set(q.objective, (inferred.get(q.objective) ?? 0) + 1)
      total++
    }
  }
}

const attemptsPath = join(ROOT, 'data', 'attempts.jsonl')
const nAttempts = existsSync(attemptsPath)
  ? (await readFile(attemptsPath, 'utf8')).split('\n').filter((l) => l.trim()).length
  : 0

const pad = (s, n) => String(s).slice(0, n).padEnd(n)

console.log(`\n  ${blueprint.exam.code} bank completeness · ${total} questions · ${nAttempts} attempts logged`)
console.log(`  target: enough items for ${TARGET_MOCKS} full ${blueprint.exam.items}-item mocks\n`)

const toWrite = []
const cannot = []
let grandTarget = 0

for (const d of blueprint.domains) {
  const target = d.items_in_mock * TARGET_MOCKS
  grandTarget += target
  const have = d.objectives.reduce((s, o) => s + (counts.get(o.id) ?? 0), 0)
  const pct = target ? Math.min(1, have / target) : 1
  const bar = '█'.repeat(Math.round(pct * 18)).padEnd(18, '·')
  console.log(
    `  D${d.id}  ${pad(d.name, 44)} ${String(d.weight).padStart(2)}%  ${bar} ${String(have).padStart(3)}/${target}`
  )

  for (const o of d.objectives) {
    const n = counts.get(o.id) ?? 0
    const cov = o.course_coverage ?? 'strong'
    const per = Math.max(1, Math.round(target / d.objectives.length))
    let flag = ''
    if (cov === 'none') {
      cannot.push([o.id, o.text, o.note ?? ''])
      flag = '  ✖ cannot source from course'
    } else if (n < per) {
      toWrite.push([o.id, o.text, n, per])
      flag = `  ← ${per - n} to write`
    }
    const inf = inferred.get(o.id) ?? 0
    const extra = inf ? `  (${inf} inferred)` : ''
    console.log(`        ${pad(o.id, 6)} ${pad(o.text, 56)} ${String(n).padStart(3)}${extra}${flag}`)
  }
  console.log()
}

console.log(`  ── overall  ${total}/${grandTarget} (${grandTarget ? Math.round((100 * total) / grandTarget) : 0}%)\n`)

if (toWrite.length) {
  console.log(`  TO WRITE — ${toWrite.length} objective(s) under target, course can source them:`)
  for (const [id, text, n, per] of toWrite.sort((a, b) => a[2] - a[3] - (b[2] - b[3])))
    console.log(`    ${pad(id, 6)} ${pad(text, 60)} ${n}/${per}`)
  console.log()
}

if (cannot.length) {
  console.log(`  CANNOT SOURCE FROM COURSE — ${cannot.length} objective(s), read up externally:`)
  for (const [id, text, note] of cannot) {
    console.log(`    ${pad(id, 6)} ${text}`)
    if (note) console.log(`           ${note.trim()}`)
  }
  console.log()
}
