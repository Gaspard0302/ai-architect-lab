import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// The service role key bypasses RLS, so the server IS the access boundary: every query
// must filter by the user_id taken from the session cookie. Nothing here may ever be
// imported by a client component — `server-only` makes that a build error.

let client: SupabaseClient | null = null

export function db(): SupabaseClient {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example)')
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'ai-architect-lab' } },
  })
  return client
}

export type UserRow = {
  id: string
  name: string
  pin_hash: string
  failed_pins: number
  locked_until: string | null
  created_at: string
}

export type SessionRow = {
  id: string
  user_id: string
  course: string
  kind: 'practice' | 'mock'
  filters: Record<string, unknown>
  question_ids: string[]
  flagged: string[]
  started_at: string
  time_limit_s: number | null
  submitted_at: string | null
  archived_at: string | null
}

export type AttemptDbRow = {
  id: number
  user_id: string
  course: string
  session_id: string
  qid: string
  domain: number
  objective: string
  chosen: string[]
  correct: boolean
  ms: number
  created_at: string
}

export type RatingRow = {
  user_id: string
  course: string
  qid: string
  stars: number
  updated_at: string
}

/** The columns mastery, dueness and the dashboards are derived from. Structurally a
 *  `mastery.AttemptRow` with the session id attached. */
export type UserAttempt = Pick<
  AttemptDbRow,
  'qid' | 'correct' | 'created_at' | 'domain' | 'objective' | 'session_id'
>

/**
 * Every attempt one user has made on one course, oldest first.
 *
 * The single read behind mastery: Home, the practice lobby and the mock lobby all need
 * the same rows, and `masteryOf` depends on chronological order. Scoped by user_id and
 * course, like every other query here.
 */
export async function userAttempts(userId: string, course: string): Promise<UserAttempt[]> {
  const { data, error } = await db()
    .from('attempts')
    .select('qid,correct,created_at,domain,objective,session_id')
    .eq('user_id', userId)
    .eq('course', course)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data as UserAttempt[] | null) ?? []
}
