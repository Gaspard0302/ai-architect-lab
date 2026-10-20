import 'server-only'
import { db } from '@/lib/db'
import { courseNames } from '@/lib/content/paths'

// Everything here reads one user's rows and nothing else. The only query in the whole
// app that touches other people is the name list on the landing, which selects id+name.

/** How many questions this user has answered, per course. */
export async function attemptCounts(userId: string): Promise<Map<string, number>> {
  const pairs = await Promise.all(
    courseNames().map(async (course) => {
      const { count, error } = await db()
        .from('attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('course', course)
      if (error) throw new Error(error.message)
      return [course, count ?? 0] as const
    }),
  )
  return new Map(pairs)
}

/**
 * The course this user last touched: their newest session, or failing that their newest
 * attempt. Null for someone who has never started anything, who gets the picker instead.
 */
export async function lastCourse(userId: string): Promise<string | null> {
  const { data: session } = await db()
    .from('sessions')
    .select('course')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fromSession = (session as { course: string } | null)?.course
  if (fromSession && courseNames().includes(fromSession)) return fromSession

  const { data: attempt } = await db()
    .from('attempts')
    .select('course')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fromAttempt = (attempt as { course: string } | null)?.course
  return fromAttempt && courseNames().includes(fromAttempt) ? fromAttempt : null
}

/**
 * Everyone's name, for the landing picker. id and name only — nothing else leaves.
 *
 * Throws rather than returning []: a bad service role key and an empty database look
 * identical from here, and "nobody has signed up yet" on a misconfigured deploy sends
 * people into a sign-up that cannot work.
 */
export async function everyone(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db().from('users').select('id,name').order('name')
  if (error) throw new Error(`Could not read the user list: ${error.message}`)
  return (data as { id: string; name: string }[] | null) ?? []
}
