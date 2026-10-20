import 'server-only'
import { db, userAttempts, type SessionRow } from '@/lib/db'
import { bank } from '@/lib/content/bank'
import { domains } from '@/lib/content/objectives'
import { masteryOf, weakestObjectives, type Weakest } from '@/lib/mastery'

// Everything the Home dashboard shows, derived in one place from one user's rows.
// Every query below filters on user_id AND course: no other person's data is read here,
// and nothing leaks between the two exams.

export type ObjectiveMastery = {
  id: string
  text: string
  domain: number
  /** Questions this objective has in the bank. */
  banked: number
  /** Distinct questions attempted at least once. */
  attempted: number
  /** Distinct questions retired (2 consecutive correct). */
  retired: number
  /** Total answers given, which can exceed `attempted` when a question repeats. */
  answers: number
  /** correct / answers, or null when never attempted. */
  accuracy: number | null
}

export type DomainGroup = {
  id: number
  name: string
  itemsInMock: number
  banked: number
  objectives: ObjectiveMastery[]
}

export type MockResult = {
  id: string
  submittedAt: string
  items: number
  answered: number
  correct: number
  /** 0–1. */
  pct: number
  /** round(pct × 1000). Approximate — Anthropic's scaling is not public. */
  scaled: number
}

export type OpenSession = {
  id: string
  kind: 'practice' | 'mock'
  total: number
  /** Distinct questions already answered in this session. */
  answered: number
  startedAt: string
}

export type Home = {
  answers: number
  openPractice: OpenSession | null
  openMock: OpenSession | null
  domains: DomainGroup[]
  weakest: Weakest
  objectiveText: Map<string, string>
  mocks: MockResult[]
  /** Distinct questions this user has seen. */
  seen: number
  /** How many of those they have rated. */
  rated: number
}

export async function homeData(userId: string, course: string): Promise<Home> {
  const client = db()

  const [attempts, openRes, mockRes, ratingRes] = await Promise.all([
    userAttempts(userId, course),
    client
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('course', course)
      .is('archived_at', null)
      .is('submitted_at', null)
      .order('started_at', { ascending: false }),
    client
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('course', course)
      .eq('kind', 'mock')
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(12),
    client.from('ratings').select('qid').eq('user_id', userId).eq('course', course),
  ])

  const open = (openRes.data as SessionRow[] | null) ?? []
  const submittedMocks = (mockRes.data as SessionRow[] | null) ?? []
  const ratedQids = new Set(((ratingRes.data as { qid: string }[] | null) ?? []).map((r) => r.qid))

  const mastery = masteryOf(attempts)
  const seenQids = new Set(attempts.map((a) => a.qid))

  // Per-objective mastery, folded into the blueprint so objectives with no attempts still
  // show up — "not started" is the most useful thing Home can tell a new user.
  const banked = new Map<string, number>()
  for (const q of bank(course)) banked.set(q.objective, (banked.get(q.objective) ?? 0) + 1)

  const perObjective = new Map<string, { qids: Set<string>; answers: number; correct: number }>()
  for (const a of attempts) {
    if (!a.objective) continue
    const s = perObjective.get(a.objective) ?? { qids: new Set<string>(), answers: 0, correct: 0 }
    s.qids.add(a.qid)
    s.answers++
    if (a.correct) s.correct++
    perObjective.set(a.objective, s)
  }

  const objectiveText = new Map<string, string>()
  const groups: DomainGroup[] = domains(course).map((d) => {
    const objectives = d.objectives.map((o): ObjectiveMastery => {
      objectiveText.set(o.id, o.text)
      const s = perObjective.get(o.id)
      const qids = s ? [...s.qids] : []
      return {
        id: o.id,
        text: o.text,
        domain: d.id,
        banked: banked.get(o.id) ?? 0,
        attempted: qids.length,
        retired: qids.filter((q) => mastery.get(q)?.retired).length,
        answers: s?.answers ?? 0,
        accuracy: s && s.answers ? s.correct / s.answers : null,
      }
    })
    return {
      id: d.id,
      name: d.name,
      itemsInMock: d.items_in_mock,
      banked: objectives.reduce((n, o) => n + o.banked, 0),
      objectives,
    }
  })

  const bySession = new Map<string, { qids: Set<string>; correct: number }>()
  for (const a of attempts) {
    const s = bySession.get(a.session_id) ?? { qids: new Set<string>(), correct: 0 }
    s.qids.add(a.qid)
    if (a.correct) s.correct++
    bySession.set(a.session_id, s)
  }

  const asOpen = (row: SessionRow | undefined): OpenSession | null =>
    row
      ? {
          id: row.id,
          kind: row.kind,
          total: row.question_ids.length,
          answered: bySession.get(row.id)?.qids.size ?? 0,
          startedAt: row.started_at,
        }
      : null

  const mocks: MockResult[] = submittedMocks.map((m) => {
    const raw = bySession.get(m.id)
    const s = { answered: raw?.qids.size ?? 0, correct: raw?.correct ?? 0 }
    const items = m.question_ids.length || s.answered
    const pct = items ? s.correct / items : 0
    return {
      id: m.id,
      submittedAt: m.submitted_at!,
      items,
      answered: s.answered,
      correct: s.correct,
      pct,
      scaled: Math.round(pct * 1000),
    }
  })

  return {
    answers: attempts.length,
    openPractice: asOpen(open.find((s) => s.kind === 'practice')),
    openMock: asOpen(open.find((s) => s.kind === 'mock')),
    domains: groups,
    weakest: weakestObjectives(attempts, { minAttempts: 3 }),
    objectiveText,
    mocks,
    seen: seenQids.size,
    rated: [...seenQids].filter((q) => ratedQids.has(q)).length,
  }
}
