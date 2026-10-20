// Mastery is DERIVED from the attempt rows, never stored — the same rule the old
// runner used, carried over to SQL. Changing RETIRE_AT re-scores all history with no
// migration, which is the whole point of not storing it.

/** A question is retired once it has this many consecutive correct answers, most recent first. */
export const RETIRE_AT = 2

/** The columns of `attempts` that mastery depends on. */
export type AttemptRow = {
  qid: string
  correct: boolean
  /** ISO timestamp. `created_at` in the database. */
  created_at: string
  domain?: number
  objective?: string
}

export type MasteryState = {
  /** Number of attempts recorded for this question. */
  seen: number
  /** Consecutive correct answers counting back from the most recent attempt. */
  streak: number
  retired: boolean
  lastCorrect: boolean
  wrongCount: number
}

export type Mastery = Map<string, MasteryState>

/** Port of `masteryOf` in the old app/server.js, unchanged in behaviour. */
export function masteryOf(attempts: AttemptRow[]): Mastery {
  const byQ = new Map<string, AttemptRow[]>()
  for (const a of attempts) {
    if (!byQ.has(a.qid)) byQ.set(a.qid, [])
    byQ.get(a.qid)!.push(a)
  }

  const state: Mastery = new Map()
  for (const [qid, list] of byQ) {
    list.sort((x, y) => +new Date(x.created_at) - +new Date(y.created_at))
    let streak = 0
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].correct) streak++
      else break
    }
    state.set(qid, {
      seen: list.length,
      streak,
      retired: streak >= RETIRE_AT,
      lastCorrect: list[list.length - 1].correct,
      wrongCount: list.filter((a) => !a.correct).length,
    })
  }
  return state
}

/** Seen at least once and not yet retired. "Due" is not a schedule; it is a status. */
export function isDue(mastery: Mastery, qid: string): boolean {
  const m = mastery.get(qid)
  return Boolean(m && !m.retired)
}

export function isRetired(mastery: Mastery, qid: string): boolean {
  return Boolean(mastery.get(qid)?.retired)
}

export function isUnseen(mastery: Mastery, qid: string): boolean {
  return !mastery.has(qid)
}

export type ObjectiveStat = {
  objective: string
  attempts: number
  correct: number
  wrong: number
  /** wrong / attempts, 0–1. */
  wrongRate: number
}

export type Weakest = {
  /** At least `minAttempts` attempts, worst wrong rate first. Ties break on volume. */
  ranked: ObjectiveStat[]
  /** Fewer than `minAttempts` attempts. Listed, never ranked. */
  lowSample: ObjectiveStat[]
}

/** Per-objective accuracy over the attempt log. Objectives with no attempts are absent. */
export function objectiveStats(attempts: AttemptRow[]): ObjectiveStat[] {
  const by = new Map<string, { attempts: number; correct: number }>()
  for (const a of attempts) {
    if (!a.objective) continue
    const s = by.get(a.objective) ?? { attempts: 0, correct: 0 }
    s.attempts++
    if (a.correct) s.correct++
    by.set(a.objective, s)
  }
  return [...by.entries()].map(([objective, s]) => ({
    objective,
    attempts: s.attempts,
    correct: s.correct,
    wrong: s.attempts - s.correct,
    wrongRate: s.attempts ? (s.attempts - s.correct) / s.attempts : 0,
  }))
}

/**
 * Weakest objectives, with the minimum-sample rule from CLAUDE.md: an objective needs
 * at least `minAttempts` attempts before it may be called weak. Everything below that
 * bar is returned separately so the UI can show it without ranking it.
 */
export function weakestObjectives(
  attempts: AttemptRow[],
  { minAttempts = 3 }: { minAttempts?: number } = {},
): Weakest {
  const stats = objectiveStats(attempts)
  const ranked = stats
    .filter((s) => s.attempts >= minAttempts)
    .sort((a, b) => b.wrongRate - a.wrongRate || b.attempts - a.attempts)
  const lowSample = stats
    .filter((s) => s.attempts < minAttempts)
    .sort((a, b) => a.objective.localeCompare(b.objective))
  return { ranked, lowSample }
}
