// Validate the question bank.
//
// Catches the failure modes that make a practice bank actively harmful: keys that
// don't match the stated select count, answers pointing at options that don't exist,
// source anchors that don't resolve to a real heading, duplicate IDs, and
// near-duplicate stems (what silently happens when you ask for "more questions"
// repeatedly).
//
//   pnpm validate

import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { courseRoot } from './course.js'

const { root: ROOT } = courseRoot()
const QDIR = join(ROOT, 'questions')
const VALID_FORMATS = new Set(['multi_choice', 'multi_response'])
const NEAR_DUP = 0.86

const problems = []
const notes = []

// GitHub heading slug.
const slug = (t) =>
  t
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s/g, '-')

async function headings(path) {
  const text = await readFile(path, 'utf8')
  const out = new Set()
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) out.add(slug(line.replace(/^#+/, '').trim()))
  }
  return out
}

// Dice coefficient over word bigrams — cheap and good enough to catch regenerated dupes.
function similarity(a, b) {
  const grams = (s) => {
    const w = s.toLowerCase().split(/\s+/).filter(Boolean)
    return new Set(w.slice(0, -1).map((x, i) => x + ' ' + w[i + 1]))
  }
  const A = grams(a)
  const B = grams(b)
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const g of A) if (B.has(g)) hit++
  return (2 * hit) / (A.size + B.size)
}

const blueprint = parse(await readFile(join(ROOT, 'objectives.yaml'), 'utf8'))
const objectiveDomain = new Map()
for (const d of blueprint.domains) {
  for (const o of d.objectives) objectiveDomain.set(o.id, d.id)
}

if (!existsSync(QDIR)) {
  console.log('no questions/ directory yet — nothing to validate')
  process.exit(0)
}

const headingCache = new Map()
const questions = []
const seenIds = new Map()

for (const f of (await readdir(QDIR)).filter((f) => extname(f) === '.yaml').sort()) {
  const data = parse(await readFile(join(QDIR, f), 'utf8')) ?? []
  for (const q of data) {
    if (!q || typeof q !== 'object') continue
    questions.push(q)
    const qid = q.id ?? '<no id>'
    const where = `${f}:${qid}`

    if (seenIds.has(qid)) problems.push(`${where}  duplicate id (also in ${seenIds.get(qid)})`)
    seenIds.set(qid, f)

    // --- format / select / answer coherence
    if (!VALID_FORMATS.has(q.format))
      problems.push(`${where}  format must be multi_choice or multi_response, got ${JSON.stringify(q.format)}`)

    const opts = q.options ?? {}
    const ans = q.answer ?? []
    const sel = q.select ?? 1
    const optKeys = Object.keys(opts)

    if (!optKeys.length) problems.push(`${where}  no options`)
    if (!ans.length) problems.push(`${where}  no answer key`)
    if (ans.length !== sel) problems.push(`${where}  select=${sel} but answer has ${ans.length} entries`)
    if (q.format === 'multi_choice' && sel !== 1) problems.push(`${where}  multi_choice must have select: 1`)
    if (q.format === 'multi_response' && sel < 2) problems.push(`${where}  multi_response must have select >= 2`)
    for (const a of ans) if (!(a in opts)) problems.push(`${where}  answer ${a} is not one of the options`)
    if (new Set(ans).size !== ans.length) problems.push(`${where}  answer key has repeats`)
    if (optKeys.length < 4) notes.push(`${where}  only ${optKeys.length} options (exam items usually have 4-5)`)

    // --- blueprint linkage
    if (!objectiveDomain.has(q.objective)) {
      problems.push(`${where}  objective ${JSON.stringify(q.objective)} is not in objectives.yaml`)
    } else if (objectiveDomain.get(q.objective) !== q.domain) {
      problems.push(
        `${where}  objective ${q.objective} belongs to domain ${objectiveDomain.get(q.objective)}, but question says domain ${q.domain}`
      )
    }

    // --- rationale & distractors
    if (!String(q.rationale ?? '').trim()) problems.push(`${where}  empty rationale`)
    const missing = optKeys.filter((k) => !ans.includes(k) && !(q.distractors ?? {})[k])
    if (missing.length) notes.push(`${where}  no distractor note for ${missing.join(', ')}`)

    // --- provenance & sources (course-sourced-only policy)
    const prov = q.provenance ?? 'course'
    const srcs = q.sources ?? []
    if (prov === 'course' && !srcs.length) problems.push(`${where}  provenance: course but no sources listed`)
    for (const s of srcs) {
      const [fname, anchor] = s.split('#')
      const target = join(ROOT, 'content', fname)
      if (!existsSync(target)) {
        problems.push(`${where}  source file not found: ${fname}`)
        continue
      }
      if (anchor) {
        if (!headingCache.has(fname)) headingCache.set(fname, await headings(target))
        if (!headingCache.get(fname).has(anchor)) problems.push(`${where}  source anchor does not resolve: ${s}`)
      }
    }
  }
}

// --- near-duplicate stems within an objective
const byObjective = new Map()
for (const q of questions) {
  if (!byObjective.has(q.objective)) byObjective.set(q.objective, [])
  byObjective.get(q.objective).push(q)
}
for (const [obj, group] of byObjective) {
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const r = similarity(group[i].stem ?? '', group[j].stem ?? '')
      if (r >= NEAR_DUP) {
        problems.push(
          `${group[i].id} / ${group[j].id}  stems ${Math.round(r * 100)}% similar under ${obj} — likely a regenerated duplicate`
        )
      }
    }
  }
}

console.log(`checked ${questions.length} question(s) in questions/\n`)
for (const n of notes) console.log(`  · ${n}`)
if (notes.length) console.log()
if (problems.length) {
  console.log(`❌ ${problems.length} problem(s)\n`)
  for (const p of problems) console.log(`  ${p}`)
  process.exit(1)
}
console.log('✅ bank valid')
