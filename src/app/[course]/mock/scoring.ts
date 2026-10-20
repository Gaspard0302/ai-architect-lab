// Pure scoring helpers for the mock exam. No server-only, no database: everything here
// takes plain data so the unit tests can drive it directly.

/** The whole point of the approximation. Anthropic does not publish its scaling. */
export const PASS_SCALED = 720
export const SCALE_MAX = 1000
export const MOCK_TIME_LIMIT_S = 7200

export const SCALED_DISCLAIMER =
  'Approximate; Anthropic’s scaling is not public. Treat the raw percentage as the real number.'

/** Raw percentage, 0–100, rounded to one decimal. Zero items scores 0. */
export function percentage(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * 1000) / 10
}

/**
 * The approximate scaled score: `round(pct × 1000)` where pct is the raw fraction.
 * 720/1000 is the pass mark, which is a guess at 72%.
 */
export function scaledScore(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * SCALE_MAX)
}

export const passed = (correct: number, total: number): boolean =>
  scaledScore(correct, total) >= PASS_SCALED

export type DomainResult = {
  domain: number
  name: string
  items: number
  correct: number
  /** 0–100, one decimal. */
  pct: number
}

type DomainName = { id: number; name: string }

/**
 * Per-domain tally over the paper as sat. `paper` is one entry per slot, so a question
 * the shortfall made the draw repeat is counted once per slot — the same way the raw
 * score counts it.
 */
export function domainBreakdown(
  paper: { qid: string; domain: number }[],
  correctByQid: Map<string, boolean>,
  domains: DomainName[],
): DomainResult[] {
  const names = new Map(domains.map((d) => [d.id, d.name] as const))
  const tally = new Map<number, { items: number; correct: number }>()

  for (const slot of paper) {
    const t = tally.get(slot.domain) ?? { items: 0, correct: 0 }
    t.items++
    if (correctByQid.get(slot.qid)) t.correct++
    tally.set(slot.domain, t)
  }

  return [...tally.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([domain, t]) => ({
      domain,
      name: names.get(domain) ?? `D${domain}`,
      items: t.items,
      correct: t.correct,
      pct: percentage(t.correct, t.items),
    }))
}

/** How many slots were answered. Keyed by qid, so repeats resolve together. */
export function answeredCount(
  paper: { qid: string }[],
  answers: Record<string, string[]>,
): number {
  return paper.filter((s) => (answers[s.qid]?.length ?? 0) > 0).length
}

/** `hh:mm:ss`, floor. Used for "time used" and for the lobby's time remaining. */
export function hhmmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(r)}`
}

/** ISO deadline for a sitting. The server owns the clock; the client only renders it. */
export function deadlineOf(startedAt: string, timeLimitS: number | null): string {
  const limit = timeLimitS ?? MOCK_TIME_LIMIT_S
  return new Date(new Date(startedAt).getTime() + limit * 1000).toISOString()
}
