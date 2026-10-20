import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db, type UserRow } from './db'

// Identity is a signed HTTP-only cookie holding the user id. No Supabase Auth, no JWT
// library: the payload is `<userId>.<expiry>` and the signature covers both, so a
// tampered id or a stretched expiry both fail verification.

export const COOKIE_NAME = 'ccp_session'
export const MAX_AGE_S = 90 * 24 * 60 * 60 // 90 days

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET must be set (see .env.example)')
  return s
}

const sign = (payload: string) =>
  createHmac('sha256', secret()).update(payload).digest('base64url')

function verify(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, expiry, signature] = parts

  const expected = Buffer.from(sign(`${userId}.${expiry}`))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  if (!Number(expiry) || Number(expiry) * 1000 < Date.now()) return null
  return userId
}

/** Issue the cookie. Server Actions and Route Handlers only. */
export async function setSession(userId: string): Promise<void> {
  const expiry = Math.floor(Date.now() / 1000) + MAX_AGE_S
  const payload = `${userId}.${expiry}`
  const jar = await cookies()
  jar.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_S,
  })
}

/** Drop the cookie. Server Actions and Route Handlers only. */
export async function clearSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

/** The signed-in user's id, or null. Cheap: no database round trip. */
export async function getCurrentUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  return token ? verify(token) : null
}

/** The signed-in user's row, or null if there is no valid cookie or the row is gone. */
export async function getCurrentUser(): Promise<UserRow | null> {
  const id = await getCurrentUserId()
  if (!id) return null

  // Throw rather than return null on a database error: a misconfigured service key would
  // otherwise read as "not signed in" and bounce everyone to the landing page forever.
  const { data, error } = await db().from('users').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Could not read the session user: ${error.message}`)
  return (data as UserRow | null) ?? null
}

/**
 * The gate every signed-in page and layout uses: the user's row, or a redirect to the
 * landing page. One place to change what "signed in" means. Pages and layouts only —
 * `redirect()` throws, which a Server Action would surface as an error.
 */
export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser()
  if (!user) redirect('/')
  return user
}

/** Same gate, id only: no database round trip when the row itself is not needed. */
export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId()
  if (!id) redirect('/')
  return id
}
