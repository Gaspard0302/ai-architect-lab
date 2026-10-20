'use server'

// Every mutation the practice runner performs. Three rules hold throughout:
//
//  1. The user id comes from the cookie, never from an argument, and every query filters
//     by it. The service-role key bypasses RLS, so this file is the access boundary.
//  2. Grading happens here. The client never receives an answer key until it has
//     submitted a choice for that question.
//  3. Answering is idempotent per (session, question): a double submit returns the
//     first attempt's verdict rather than writing a second row.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { bank, question as bankQuestion } from '@/lib/content/bank'
import { requireCourse } from '@/lib/content/paths'
import { db, type AttemptDbRow, type SessionRow } from '@/lib/db'
import { grade, type Graded } from '@/lib/grade'
import { masteryOf, type AttemptRow } from '@/lib/mastery'
import { selectPractice, type PracticeFilters } from '@/lib/select'
import { getCurrentUserId } from '@/lib/session'
import { normaliseFilters } from './helpers'

async function requireUser(): Promise<string> {
  const userId = await getCurrentUserId()
  if (!userId) redirect('/')
  return userId
}

/** Mastery for this user and course, derived from the whole attempt log. */
async function masteryFor(userId: string, course: string) {
  const { data, error } = await db()
    .from('attempts')
    .select('qid, correct, created_at, domain, objective')
    .eq('user_id', userId)
    .eq('course', course)
  if (error) throw new Error(`could not read attempts: ${error.message}`)
  return masteryOf((data ?? []) as AttemptRow[])
}

/** Close whatever practice set is open for this user and course. Safe to call twice. */
async function archiveOpenPractice(userId: string, course: string): Promise<void> {
  const { error } = await db()
    .from('sessions')
    .update({ archived_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('course', course)
    .eq('kind', 'practice')
    .is('archived_at', null)
    .is('submitted_at', null)
  if (error) throw new Error(`could not archive the open set: ${error.message}`)
}

/**
 * Draw a set and open a session for it, then send the learner into the runner.
 * Only one practice session may be open per user and course, so any previous one is
 * archived first — that is what "Start a new set" means.
 */
export async function startPractice(course: string, raw: Partial<PracticeFilters>): Promise<void> {
  const c = requireCourse(course)
  const userId = await requireUser()
  const filters = normaliseFilters(raw)

  await archiveOpenPractice(userId, c)

  const { items } = selectPractice(bank(c), await masteryFor(userId, c), filters)
  if (!items.length) redirect(`/${c}/practice?empty=1`)

  const { data, error } = await db()
    .from('sessions')
    .insert({
      user_id: userId,
      course: c,
      kind: 'practice',
      filters,
      question_ids: items.map((q) => q.id),
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`could not start the set: ${error?.message ?? 'no row'}`)

  revalidatePath(`/${c}/practice`)
  redirect(`/${c}/practice/${data.id}`)
}

/**
 * Archive a set and return to the filter form. `sessionId` is optional: the resume card
 * knows which set it is looking at, the finish screen archives the one just submitted,
 * and without it we simply close whatever is open.
 */
export async function archivePractice(course: string, sessionId?: string): Promise<void> {
  const c = requireCourse(course)
  const userId = await requireUser()

  if (sessionId) {
    const { error } = await db()
      .from('sessions')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('course', c)
      .eq('kind', 'practice')
      .is('archived_at', null)
    if (error) throw new Error(`could not archive the set: ${error.message}`)
  } else {
    await archiveOpenPractice(userId, c)
  }

  revalidatePath(`/${c}/practice`)
  redirect(`/${c}/practice`)
}

export type AnswerResult = Graded & {
  qid: string
  chosen: string[]
  /** True when an attempt already existed: the verdict is the stored one, not a new row. */
  replayed: boolean
}

/**
 * Grade one question and record the attempt. The session must belong to the caller and
 * the question must be part of it — a qid smuggled in from elsewhere is rejected rather
 * than graded, which is what stops this from becoming an answer-key oracle.
 */
export async function answer(
  sessionId: string,
  qid: string,
  chosen: string[],
  ms: number,
): Promise<AnswerResult> {
  const userId = await requireUser()

  const { data: sessionRow, error: sessionError } = await db()
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('kind', 'practice')
    .maybeSingle()

  if (sessionError) throw new Error(`could not read the set: ${sessionError.message}`)
  const session = sessionRow as SessionRow | null
  if (!session) throw new Error('that set does not exist')
  if (session.archived_at) throw new Error('that set has been archived')
  if (!session.question_ids.includes(qid)) throw new Error('that question is not in this set')

  const course = session.course
  const q = bankQuestion(course, qid)
  if (!q) throw new Error(`question ${qid} is no longer in the bank`)

  // Idempotence: a resubmit (double click, replayed action) returns the stored verdict.
  const { data: existing } = await db()
    .from('attempts')
    .select('chosen')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .eq('qid', qid)
    .maybeSingle()

  if (existing) {
    const stored = (existing as Pick<AttemptDbRow, 'chosen'>).chosen ?? []
    return { ...grade(stored, q), qid, chosen: stored, replayed: true }
  }

  const picked = [...new Set(chosen ?? [])].filter((k) => k in q.options)
  const graded = grade(picked, q)

  const { error: insertError } = await db().from('attempts').insert({
    user_id: userId,
    course,
    session_id: sessionId,
    qid,
    domain: q.domain,
    objective: q.objective,
    chosen: picked,
    correct: graded.correct,
    ms: Math.max(0, Math.round(Number(ms) || 0)),
  })
  if (insertError) throw new Error(`could not record the answer: ${insertError.message}`)

  // Complete means every question in the set has an attempt. Abandoned sets are
  // archived instead, which is why the two columns stay separate.
  if (!session.submitted_at) {
    const { count } = await db()
      .from('attempts')
      .select('qid', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('session_id', sessionId)
    if ((count ?? 0) >= session.question_ids.length) {
      await db()
        .from('sessions')
        .update({ submitted_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('user_id', userId)
        .is('submitted_at', null)
    }
  }

  revalidatePath(`/${course}/practice/${sessionId}`)
  return { ...graded, qid, chosen: picked, replayed: false }
}

/**
 * Exam-fidelity rating, one row per user and question (PRD F11). Upserted, so tapping a
 * different star changes it. Nothing here blocks the runner: the caller fires and moves on.
 */
export async function rate(course: string, qid: string, stars: number): Promise<void> {
  const c = requireCourse(course)
  const userId = await requireUser()

  const value = Math.round(Number(stars))
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error('stars must be 1–5')
  if (!bankQuestion(c, qid)) throw new Error(`unknown question ${qid}`)

  const { error } = await db()
    .from('ratings')
    .upsert(
      { user_id: userId, course: c, qid, stars: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,course,qid' },
    )
  if (error) throw new Error(`could not save the rating: ${error.message}`)
}
