// Pure helpers for the practice screens. No filesystem, no database, no React — so the
// position rule, the live filter counts and the finish-screen arithmetic can be unit
// tested without standing anything up.

import type { PracticeFilters, Status } from '@/lib/select'

export const STATUSES: Status[] = ['all', 'unseen', 'due', 'retired']

export const STATUS_LABELS: Record<Status, string> = {
  all: 'All',
  unseen: 'Unseen',
  due: 'Due',
  retired: 'Retired',
}

export const STATUS_HINTS: Record<Status, string> = {
  all: 'Everything in the bank',
  unseen: 'Never attempted',
  due: 'Seen but not yet retired',
  retired: 'Two correct in a row',
}

/** One bank item reduced to what the filter form needs. Carries no answer key. */
export type CatalogItem = {
  id: string
  domain: number
  objective: string
  /** Mastery status as of the viewer's attempt log. */
  status: Exclude<Status, 'all'>
}

/** Coerce anything that arrived over the wire into filters the selector accepts. */
export function normaliseFilters(raw: {
  status?: unknown
  domain?: unknown
  objective?: unknown
}): PracticeFilters {
  const status = STATUSES.includes(raw.status as Status) ? (raw.status as Status) : 'all'
  const domainNum = Number(raw.domain)
  const domain = Number.isInteger(domainNum) && domainNum > 0 ? domainNum : null
  const objective =
    typeof raw.objective === 'string' && raw.objective.trim() ? raw.objective.trim() : null
  return { status, domain, objective }
}

/** How many bank items the filters admit. Mirrors `filterQuestions` over the catalog. */
export function countMatching(catalog: CatalogItem[], filters: PracticeFilters): number {
  return catalog.filter(
    (item) =>
      (filters.domain == null || item.domain === filters.domain) &&
      (!filters.objective || item.objective === filters.objective) &&
      (filters.status === 'all' || item.status === filters.status),
  ).length
}

export type Position = { kind: 'question'; index: number } | { kind: 'finish' }

/**
 * Where the runner opens. `?q=N` wins when it points at a real question; otherwise the
 * first unanswered one; otherwise the finish screen. `?done=1` forces the finish screen
 * so the last Next has somewhere to go.
 */
export function resolvePosition(
  ids: string[],
  answered: Set<string>,
  params: { q?: string; done?: string } = {},
): Position {
  if (params.done === '1') return { kind: 'finish' }

  const asked = Number(params.q)
  if (Number.isInteger(asked) && asked >= 1 && asked <= ids.length) {
    return { kind: 'question', index: asked - 1 }
  }

  const first = ids.findIndex((id) => !answered.has(id))
  return first === -1 ? { kind: 'finish' } : { kind: 'question', index: first }
}

export type DomainScore = {
  domain: number
  name: string
  correct: number
  total: number
}

/** Per-domain score over the questions in this set, in domain-id order. */
export function domainBreakdown(
  items: { id: string; domain: number }[],
  correctByQid: Map<string, boolean>,
  names: Map<number, string> = new Map(),
): DomainScore[] {
  const by = new Map<number, DomainScore>()
  for (const item of items) {
    const row = by.get(item.domain) ?? {
      domain: item.domain,
      name: names.get(item.domain) ?? `Domain ${item.domain}`,
      correct: 0,
      total: 0,
    }
    row.total++
    if (correctByQid.get(item.id)) row.correct++
    by.set(item.domain, row)
  }
  return [...by.values()].sort((a, b) => a.domain - b.domain)
}

/** "Resume set · 7/25 answered" */
export function resumeLabel(answered: number, total: number): string {
  return `Resume set · ${answered}/${total} answered`
}

/** The filters as a human sentence, for the resume card and the finish screen. */
export function describeFilters(filters: PracticeFilters): string {
  const parts = [STATUS_LABELS[filters.status].toLowerCase()]
  if (filters.objective) parts.push(filters.objective)
  else if (filters.domain != null) parts.push(`domain ${filters.domain}`)
  return parts.join(' · ')
}
