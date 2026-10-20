// Check that every `sources` anchor in every question bank resolves to a heading the
// app actually renders.
//
//   pnpm check:anchors
//
// `pnpm validate` already checks anchors, but against every line of a lesson that starts
// with "#" — including lines inside fenced code blocks, which the renderer never turns
// into a heading. This script models the rendered page instead: the same fence-aware
// scan as src/lib/content/lessons.ts `headingsOf`, and the same slug as
// src/lib/markdown.tsx gives each heading. If this passes, every rationale deep link
// lands on a real anchor.

import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const COURSES = join(ROOT, 'courses')

// EXACT copy of `slug` in src/lib/content/slug.ts, itself an exact copy of the one in
// scripts/validate-bank.js. Three copies, one behaviour: diverge and every deep link in
// the banks silently breaks.
const slug = (t) =>
  t
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s/g, '-')

/** Heading ids as rendered: ATX headings outside fenced code, slugged. */
function renderedAnchors(markdown) {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '') // drop frontmatter
  const ids = new Set()
  let fenced = false
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (m) ids.add(slug(m[2].trim()))
  }
  return ids
}

const problems = []
let courses = 0
let checked = 0

for (const course of (await readdir(COURSES, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()) {
  const qdir = join(COURSES, course, 'questions')
  let files
  try {
    files = (await readdir(qdir)).filter((f) => /\.ya?ml$/.test(f)).sort()
  } catch {
    continue
  }
  courses++

  const anchors = new Map() // lesson file -> Set of rendered ids

  for (const file of files) {
    const doc = parse(await readFile(join(qdir, file), 'utf8'))
    const items = Array.isArray(doc) ? doc : (doc?.questions ?? [])
    for (const q of items) {
      for (const source of q.sources ?? []) {
        const [fname, anchor] = String(source).split('#')
        if (!anchor) continue
        checked++

        if (!anchors.has(fname)) {
          try {
            anchors.set(fname, renderedAnchors(await readFile(join(COURSES, course, 'content', fname), 'utf8')))
          } catch {
            anchors.set(fname, null)
          }
        }
        const ids = anchors.get(fname)
        if (ids === null) {
          problems.push(`${course}/${file}  ${q.id}  source file not found: ${fname}`)
        } else if (!ids.has(anchor)) {
          problems.push(`${course}/${file}  ${q.id}  no rendered heading with id "${anchor}" in ${fname}`)
        }
      }
    }
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} unresolved anchor(s):\n`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

console.log(`✓ ${checked} source anchors resolve across ${courses} courses`)
