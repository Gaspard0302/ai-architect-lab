import 'server-only'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { courseRoot, perCourse } from './paths'
import { slug } from './slug'

export type Term = {
  term: string
  /** Anchor inside GLOSSARY.md; the file's own index links point at it. */
  id: string
  /** Raw "**Modules:**" value, e.g. "2, 4". Empty when the entry has none. */
  modules: string
  /** Markdown definition body. */
  definition: string
}

/**
 * GLOSSARY.md is the single source of truth. Entries are `### Term`, an optional
 * `**Modules:** n` line, then prose, separated by `---`. Same parse as the old runner.
 */
const load = perCourse((course: string): Term[] => {
  let raw: string
  try {
    raw = readFileSync(join(courseRoot(course), 'content', 'GLOSSARY.md'), 'utf8')
  } catch {
    return []
  }
  const start = raw.indexOf('\n### ')
  if (start === -1) return []

  const terms: Term[] = []
  for (const block of raw.slice(start).split('\n### ').slice(1)) {
    const lines = block.split('\n')
    const term = (lines.shift() ?? '').trim()
    let modules = ''
    const text: string[] = []
    for (const l of lines) {
      const m = /^\*\*Modules:\*\*\s*(.+)$/.exec(l)
      if (m) {
        modules = m[1].trim()
        continue
      }
      if (l.trim() === '---') break
      text.push(l)
    }
    terms.push({ term, id: slug(term), modules, definition: text.join('\n').trim() })
  }
  return terms
})

/** Every glossary term for a course, in file order. */
export function glossary(course: string): Term[] {
  return load(course)
}

/** Case-insensitive substring match over term and definition. Empty query = all. */
export function searchGlossary(course: string, query: string): Term[] {
  const q = query.trim().toLowerCase()
  if (!q) return load(course)
  return load(course).filter(
    (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q),
  )
}
