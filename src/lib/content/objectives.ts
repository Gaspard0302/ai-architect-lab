import 'server-only'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { courseRoot, perCourse } from './paths'
import type { Blueprint, Domain, Exam, Objective } from './types'

export type { Blueprint, Domain, Exam, Objective, Coverage } from './types'


const load = perCourse((course: string): Blueprint => {
  const raw = readFileSync(join(courseRoot(course), 'objectives.yaml'), 'utf8')
  const parsed = parse(raw) as { exam?: Partial<Exam>; domains?: Domain[] } | null
  const domains = (parsed?.domains ?? []).map((d) => ({
    ...d,
    objectives: (d.objectives ?? []).map((o) => ({ ...o, domain: d.id })),
  }))
  return { ...(parsed ?? {}), domains }
})

export function blueprint(course: string): Blueprint {
  return load(course)
}

export function domains(course: string): Domain[] {
  return load(course).domains
}

export function domain(course: string, id: number): Domain | undefined {
  return domains(course).find((d) => d.id === id)
}

export function objectives(course: string): Objective[] {
  return domains(course).flatMap((d) => d.objectives)
}

export function objective(course: string, id: string): Objective | undefined {
  return objectives(course).find((o) => o.id === id)
}

const EXAM_FALLBACK: Exam = {
  code: '—',
  name: '—',
  version: '',
  items: 0,
  minutes: 120,
  pass_scaled_score: 720,
  scale: [100, 1000],
}

/** The `exam:` block, with defaults for anything the blueprint leaves out. */
export function exam(course: string): Exam {
  const raw = load(course).exam
  if (!raw) return EXAM_FALLBACK
  return { ...EXAM_FALLBACK, ...raw, name: raw.name ?? raw.code ?? EXAM_FALLBACK.name }
}

/** Total items in a full mock paper for this course (sum of `items_in_mock`). */
export function mockLength(course: string): number {
  return domains(course).reduce((n, d) => n + d.items_in_mock, 0)
}
