'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { bank, question } from '@/lib/content/bank'
import { domains } from '@/lib/content/objectives'
import { isCourse } from '@/lib/content/paths'
import { grade } from '@/lib/grade'
import { masteryOf, type AttemptRow } from '@/lib/mastery'
import { drawMock } from '@/lib/select'
import { getCurrentUserId } from '@/lib/session'
import { MOCK_TIME_LIMIT_S } from './scoring'
import { deadlineMs, loadMock, openMock } from './data'

// Nothing in this file ever returns a verdict, a key, a rationale or a distractor note.
// The exam grades on save so `attempts.correct` is stored, but the payload that goes
// back to the browser is `{ ok: true }` and nothing else. Review data is assembled on
// the server page, after `submitted_at` is set.

export type SaveResult = { ok: true } | { expired: true } | { error: string }

const deny = (message: string): { error: string } => ({ error: message })

/**
 * Draw a fresh paper and open the sitting. Redirects to the runner, so it never
 * returns. Refuses if a mock is already open — the lobby offers Resume or Abandon.
 */
export async function startMock(course: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) redirect('/')
  if (!isCourse(course)) redirect('/')

  const existing = await openMock(userId, course)
  if (existing) redirect(`/${course}/mock/${existing.id}`)

  const { data: attempts } = await db()
    .from('attempts')
    .select('qid, correct, created_at, domain, objective')
    .eq('user_id', userId)
    .eq('course', course)

  const mastery = masteryOf((attempts as AttemptRow[] | null) ?? [])
  const paper = drawMock(bank(course), domains(course), mastery)

  const { data, error } = await db()
    .from('sessions')
    .insert({
      user_id: userId,
      course,
      kind: 'mock',
      filters: {},
      question_ids: paper.items.map((q) => q.id),
      flagged: [],
      time_limit_s: MOCK_TIME_LIMIT_S,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`could not start the mock: ${error?.message ?? 'no row'}`)
  redirect(`/${course}/mock/${(data as { id: string }).id}`)
}

/** Close an unfinished sitting without scoring it. */
export async function abandonMock(course: string, sessionId: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) redirect('/')

  await db()
    .from('sessions')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('course', course)
    .eq('kind', 'mock')
    .is('submitted_at', null)

  revalidatePath(`/${course}/mock`)
  redirect(`/${course}/mock`)
}

export type SaveAnswerInput = {
  course: string
  sessionId: string
  qid: string
  /** Option letters. An empty array clears the answer. */
  chosen: string[]
  /** Milliseconds spent on this question so far. */
  ms: number
}

/**
 * Record an answer. One row per session+qid: the row is updated in place on every
 * change rather than appended to, so a sitting contributes exactly one attempt per
 * question to mastery. Graded here so `correct` is stored; the verdict stays here.
 */
export async function saveAnswer(input: SaveAnswerInput): Promise<SaveResult> {
  const userId = await getCurrentUserId()
  if (!userId) return deny('signed out')

  const session = await loadMock(userId, input.course, input.sessionId)
  if (!session) return deny('no such exam')
  if (session.submitted_at || session.archived_at) return deny('this exam is closed')
  if (Date.now() > deadlineMs(session)) {
    await closeSitting(userId, input.course, input.sessionId)
    return { expired: true }
  }
  if (!session.question_ids.includes(input.qid)) return deny('not on this paper')

  const q = question(input.course, input.qid)
  if (!q) return deny('unknown question')

  const chosen = [...new Set(input.chosen)].filter((k) => k in q.options)
  const { correct } = grade(chosen, q)
  const ms = Number.isFinite(input.ms) ? Math.max(0, Math.round(input.ms)) : 0

  const { data: existing } = await db()
    .from('attempts')
    .select('id')
    .eq('user_id', userId)
    .eq('session_id', input.sessionId)
    .eq('qid', input.qid)
    .limit(1)

  const row = (existing as { id: number }[] | null)?.[0]
  if (row) {
    await db().from('attempts').update({ chosen, correct, ms }).eq('id', row.id).eq('user_id', userId)
  } else {
    await db().from('attempts').insert({
      user_id: userId,
      course: input.course,
      session_id: input.sessionId,
      qid: input.qid,
      domain: q.domain,
      objective: q.objective,
      chosen,
      correct,
      ms,
    })
  }

  return { ok: true }
}

export type ToggleFlagInput = {
  course: string
  sessionId: string
  qid: string
  /** The state the client wants. Idempotent. */
  flagged: boolean
}

export async function toggleFlag(input: ToggleFlagInput): Promise<SaveResult> {
  const userId = await getCurrentUserId()
  if (!userId) return deny('signed out')

  const session = await loadMock(userId, input.course, input.sessionId)
  if (!session) return deny('no such exam')
  if (session.submitted_at || session.archived_at) return deny('this exam is closed')
  if (Date.now() > deadlineMs(session)) {
    await closeSitting(userId, input.course, input.sessionId)
    return { expired: true }
  }

  const set = new Set(session.flagged ?? [])
  if (input.flagged) set.add(input.qid)
  else set.delete(input.qid)

  await db()
    .from('sessions')
    .update({ flagged: [...set] })
    .eq('id', input.sessionId)
    .eq('user_id', userId)

  return { ok: true }
}

async function closeSitting(userId: string, course: string, sessionId: string): Promise<void> {
  await db()
    .from('sessions')
    .update({ submitted_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('course', course)
    .eq('kind', 'mock')
    .is('submitted_at', null)
  revalidatePath(`/${course}/mock/${sessionId}`)
  revalidatePath(`/${course}/mock`)
}

/**
 * End the sitting. Idempotent: submitting an already-submitted paper is a no-op, which
 * is what lets the Timer's expiry handler and a racing Submit click both land safely.
 */
export async function submitMock(input: {
  course: string
  sessionId: string
}): Promise<SaveResult> {
  const userId = await getCurrentUserId()
  if (!userId) return deny('signed out')

  const session = await loadMock(userId, input.course, input.sessionId)
  if (!session) return deny('no such exam')
  if (session.archived_at) return deny('this exam was abandoned')

  if (!session.submitted_at) await closeSitting(userId, input.course, input.sessionId)
  return { ok: true }
}

/** PRD F11. Per user per question, upserted, never during the paper. */
export async function rateQuestion(input: {
  course: string
  qid: string
  stars: number
}): Promise<SaveResult> {
  const userId = await getCurrentUserId()
  if (!userId) return deny('signed out')

  const stars = Math.round(input.stars)
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return deny('stars must be 1–5')
  if (!isCourse(input.course) || !question(input.course, input.qid)) return deny('unknown question')

  const { error } = await db()
    .from('ratings')
    .upsert(
      {
        user_id: userId,
        course: input.course,
        qid: input.qid,
        stars,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course,qid' },
    )

  return error ? deny(error.message) : { ok: true }
}
