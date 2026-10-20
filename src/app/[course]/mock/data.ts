import 'server-only'
import { db, type AttemptDbRow, type SessionRow } from '@/lib/db'
import { MOCK_TIME_LIMIT_S } from './scoring'

// Every query in this file filters by user_id. The service role key bypasses RLS, so
// this is the access boundary — a session id alone must never be enough to read a paper.

export type { SessionRow, AttemptDbRow }

/** The user's mock session, or null if it is not theirs / not a mock / not this course. */
export async function loadMock(
  userId: string,
  course: string,
  sessionId: string,
): Promise<SessionRow | null> {
  const { data } = await db()
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('course', course)
    .eq('kind', 'mock')
    .maybeSingle()
  return (data as SessionRow | null) ?? null
}

/** The one unsubmitted, unarchived mock for this user and course, if there is one. */
export async function openMock(userId: string, course: string): Promise<SessionRow | null> {
  const { data } = await db()
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('course', course)
    .eq('kind', 'mock')
    .is('submitted_at', null)
    .is('archived_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
  return ((data as SessionRow[] | null) ?? [])[0] ?? null
}

/** Submitted mocks, newest first. */
export async function submittedMocks(userId: string, course: string): Promise<SessionRow[]> {
  const { data } = await db()
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('course', course)
    .eq('kind', 'mock')
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
  return (data as SessionRow[] | null) ?? []
}

/** Attempt rows for one sitting. One row per question, kept updated in place. */
export async function attemptsOf(userId: string, sessionId: string): Promise<AttemptDbRow[]> {
  const { data } = await db()
    .from('attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
  return (data as AttemptDbRow[] | null) ?? []
}

/** Attempt rows across several sittings, for the lobby's history table. */
export async function attemptsOfSessions(
  userId: string,
  sessionIds: string[],
): Promise<AttemptDbRow[]> {
  if (!sessionIds.length) return []
  const { data } = await db()
    .from('attempts')
    .select('*')
    .eq('user_id', userId)
    .in('session_id', sessionIds)
  return (data as AttemptDbRow[] | null) ?? []
}

/** The user's stars for a set of questions, as a qid → stars map. */
export async function ratingsOf(
  userId: string,
  course: string,
  qids: string[],
): Promise<Record<string, number>> {
  if (!qids.length) return {}
  const { data } = await db()
    .from('ratings')
    .select('qid, stars')
    .eq('user_id', userId)
    .eq('course', course)
    .in('qid', qids)

  const out: Record<string, number> = {}
  for (const r of (data as { qid: string; stars: number }[] | null) ?? []) out[r.qid] = r.stars
  return out
}

/** Server-owned clock. Milliseconds, so the caller can compare against Date.now(). */
export function deadlineMs(session: SessionRow): number {
  const limit = session.time_limit_s ?? MOCK_TIME_LIMIT_S
  return new Date(session.started_at).getTime() + limit * 1000
}

export const isExpired = (session: SessionRow, now = Date.now()): boolean =>
  now > deadlineMs(session)

/**
 * Submit a sitting whose clock has run out. Safe to call during render — unlike the
 * `submitMock` action it does not touch `revalidatePath`, which a Server Component may
 * not call. Returns the session with `submitted_at` filled in.
 */
export async function closeIfExpired(
  userId: string,
  session: SessionRow,
): Promise<SessionRow> {
  if (session.submitted_at || session.archived_at || !isExpired(session)) return session

  const submitted_at = new Date(deadlineMs(session)).toISOString()
  await db()
    .from('sessions')
    .update({ submitted_at })
    .eq('id', session.id)
    .eq('user_id', userId)
    .is('submitted_at', null)

  return { ...session, submitted_at }
}
