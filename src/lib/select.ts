// Question selection: the practice filter and the mock draw.
//
// Both are pure and take their randomness by injection, so a test can pin the order.

import type { Domain, Question } from './content/types'
import { isDue, isRetired, isUnseen, type Mastery } from './mastery'

export type Status = 'all' | 'unseen' | 'due' | 'retired'

export type PracticeFilters = {
  status: Status
  /** Domain id, or null for every domain. */
  domain?: number | null
  /** Objective id, or null for every objective. */
  objective?: string | null
}

export const DEFAULT_FILTERS: PracticeFilters = { status: 'all', domain: null, objective: null }

/** Default practice set size. Fewer if the filter matches fewer. */
export const PRACTICE_SET_SIZE = 25

export type Shuffle = <T>(items: T[]) => T[]

/** Fisher–Yates, non-mutating. Pass your own to make selection deterministic. */
export const shuffle: Shuffle = (items) => {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Everything the filters admit, unshuffled and untruncated. */
export function filterQuestions(
  questions: Question[],
  mastery: Mastery,
  filters: PracticeFilters,
): Question[] {
  return questions.filter((q) => {
    if (filters.domain != null && q.domain !== filters.domain) return false
    if (filters.objective && q.objective !== filters.objective) return false
    if (filters.status === 'unseen') return isUnseen(mastery, q.id)
    if (filters.status === 'due') return isDue(mastery, q.id)
    if (filters.status === 'retired') return isRetired(mastery, q.id)
    return true
  })
}

export type PracticeSet = {
  items: Question[]
  /** How many questions matched the filters before the set size was applied. */
  matched: number
}

/** One practice set: filter, shuffle, take `size`. */
export function selectPractice(
  questions: Question[],
  mastery: Mastery,
  filters: PracticeFilters = DEFAULT_FILTERS,
  { size = PRACTICE_SET_SIZE, rng = shuffle }: { size?: number; rng?: Shuffle } = {},
): PracticeSet {
  const pool = filterQuestions(questions, mastery, filters)
  return { items: rng(pool).slice(0, size), matched: pool.length }
}

export type Shortfall = {
  domain: number
  name: string
  /** `items_in_mock` for the domain. */
  want: number
  /** Distinct questions banked for the domain. */
  have: number
}

export type MockPaper = {
  items: Question[]
  /** One entry per domain whose bank cannot fill its quota without repeats. */
  shortfall: Shortfall[]
}

/**
 * A full paper: `items_in_mock` questions per domain, unseen items preferred, then any.
 * Where a domain has fewer distinct questions than its quota the paper repeats items
 * rather than shrinking — the PRD accepts repeats in v1 and reports the shortfall.
 */
export function drawMock(
  questions: Question[],
  domains: Domain[],
  mastery: Mastery,
  { rng = shuffle }: { rng?: Shuffle } = {},
): MockPaper {
  const picked: Question[] = []
  const shortfall: Shortfall[] = []

  for (const d of domains) {
    const pool = questions.filter((q) => q.domain === d.id)
    const want = d.items_in_mock
    if (!pool.length) {
      if (want > 0) shortfall.push({ domain: d.id, name: d.name, want, have: 0 })
      continue
    }
    if (pool.length < want) shortfall.push({ domain: d.id, name: d.name, want, have: pool.length })

    const unseen = rng(pool.filter((q) => isUnseen(mastery, q.id)))
    const rest = rng(pool.filter((q) => !isUnseen(mastery, q.id)))
    const ordered = [...unseen, ...rest]

    for (let i = 0; i < want; i++) picked.push(ordered[i % ordered.length])
  }

  return { items: rng(picked), shortfall }
}
