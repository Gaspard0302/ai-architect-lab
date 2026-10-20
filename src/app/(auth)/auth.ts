// Shared vocabulary for the sign-in flow. Kept out of actions.ts because a 'use server'
// module may only export async functions — constants and helpers have to live here.

/** Wrong PINs tolerated before the name is locked. */
export const MAX_PIN_TRIES = 5

/** How long a locked name stays locked. */
export const LOCKOUT_MINUTES = 15

export const MAX_NAME_LENGTH = 40

/** What every auth action hands back to `useActionState`. */
export type AuthState = {
  error: string | null
  /** Changes on every reply, so the client can react to two identical errors in a row. */
  at: number
}

export const idleAuth: AuthState = { error: null, at: 0 }

export const fail = (error: string): AuthState => ({ error, at: Date.now() })

/** A `locked_until` in the future, phrased for the learner. Null when not locked. */
export function lockMessage(lockedUntil: string | null, now: number = Date.now()): string | null {
  if (!lockedUntil) return null
  const ms = +new Date(lockedUntil) - now
  if (!Number.isFinite(ms) || ms <= 0) return null
  const minutes = Math.ceil(ms / 60_000)
  return `Locked for ${minutes} more ${minutes === 1 ? 'minute' : 'minutes'}.`
}

/** The message after a wrong PIN, given how many wrong attempts are now on record. */
export function wrongPinMessage(failedPins: number): string {
  const left = MAX_PIN_TRIES - failedPins
  if (left <= 0) return `Too many wrong PINs. Locked for ${LOCKOUT_MINUTES} minutes.`
  return `Wrong PIN, ${left} ${left === 1 ? 'try' : 'tries'} left.`
}

/** Trim and collapse inner whitespace, so "Ada  Lovelace " and "Ada Lovelace" collide. */
export function normaliseName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}
