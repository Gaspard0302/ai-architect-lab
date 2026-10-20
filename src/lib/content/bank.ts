import 'server-only'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { courseRoot, perCourse } from './paths'
import type { Question, QuestionFormat } from './types'

export type { Question, SafeQuestion, QuestionFormat } from './types'


const VALID_FORMATS = new Set<QuestionFormat>(['multi_choice', 'multi_response'])

/**
 * Validate-lite: `pnpm validate` is the blocking gate. Here we only drop items that
 * would crash a runner (no id, no options, key pointing nowhere) and say so on stderr,
 * so one malformed YAML entry cannot take the whole site down.
 */
function normalise(raw: unknown, file: string): Question | null {
  if (!raw || typeof raw !== 'object') return null
  const q = raw as Record<string, unknown>
  const id = typeof q.id === 'string' ? q.id : null
  const options = (q.options ?? {}) as Record<string, string>
  const answer = Array.isArray(q.answer) ? (q.answer as string[]) : []
  const format = q.format as QuestionFormat

  const bad =
    !id ||
    !VALID_FORMATS.has(format) ||
    Object.keys(options).length === 0 ||
    answer.length === 0 ||
    answer.some((a) => !(a in options))

  if (bad) {
    console.warn(`[bank] skipping malformed item in ${file}: ${id ?? '<no id>'}`)
    return null
  }

  return {
    id: id!,
    domain: Number(q.domain),
    objective: String(q.objective ?? ''),
    format,
    select: Number(q.select ?? 1),
    stem: String(q.stem ?? ''),
    options,
    answer,
    rationale: String(q.rationale ?? ''),
    distractors: (q.distractors ?? {}) as Record<string, string>,
    sources: Array.isArray(q.sources) ? (q.sources as string[]) : [],
    provenance: String(q.provenance ?? 'course'),
    difficulty: q.difficulty === undefined ? undefined : Number(q.difficulty),
  }
}

const load = perCourse((course: string): Question[] => {
  const dir = join(courseRoot(course), 'questions')
  let files: string[]
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort()
  } catch {
    return []
  }

  const out: Question[] = []
  const seen = new Set<string>()
  for (const f of files) {
    const parsed = parse(readFileSync(join(dir, f), 'utf8'))
    if (!Array.isArray(parsed)) continue
    for (const entry of parsed) {
      const q = normalise(entry, f)
      if (!q || seen.has(q.id)) continue
      seen.add(q.id)
      out.push(q)
    }
  }
  return out
})

/** Every question in a course's bank, in file then document order. */
export function bank(course: string): Question[] {
  return load(course)
}

const indexed = perCourse(
  (course: string) => new Map(load(course).map((q) => [q.id, q] as const)),
)

export function question(course: string, id: string): Question | undefined {
  return indexed(course).get(id)
}

/** Look several ids up at once, preserving the order given. Unknown ids are dropped. */
export function questions(course: string, ids: string[]): Question[] {
  const by = indexed(course)
  return ids.map((id) => by.get(id)).filter((q): q is Question => Boolean(q))
}

/** How many items each domain has banked. */
export function bankByDomain(course: string): Map<number, number> {
  const counts = new Map<number, number>()
  for (const q of load(course)) counts.set(q.domain, (counts.get(q.domain) ?? 0) + 1)
  return counts
}
