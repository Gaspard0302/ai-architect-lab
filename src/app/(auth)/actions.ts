'use server'

import { redirect } from 'next/navigation'
import { db, type UserRow } from '@/lib/db'
import { hashPin, isValidPin, verifyPin } from '@/lib/pin'
import { clearSession, setSession } from '@/lib/session'
import {
  LOCKOUT_MINUTES,
  MAX_NAME_LENGTH,
  MAX_PIN_TRIES,
  type AuthState,
  fail,
  lockMessage,
  normaliseName,
  wrongPinMessage,
} from './auth'

// Identity is name + 4-digit PIN. The PIN is a courtesy lock on an internal tool, not a
// secret: what it must do is stop someone picking a colleague's name by accident, and
// make brute force pointless. Hence the hash, the lockout, and error messages that are
// specific about *your* state without revealing anything about anyone else's.

/** First visit: choose a name, set a PIN, confirm it. */
export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const name = normaliseName(String(form.get('name') ?? ''))
  const pin = String(form.get('pin') ?? '')
  const confirm = String(form.get('confirm') ?? '')

  if (!name) return fail('Enter a name.')
  if (name.length > MAX_NAME_LENGTH) return fail(`Keep the name under ${MAX_NAME_LENGTH} characters.`)
  if (!isValidPin(pin)) return fail('The PIN is exactly 4 digits.')
  if (pin !== confirm) return fail('The two PINs do not match.')

  const { data, error } = await db()
    .from('users')
    .insert({ name, pin_hash: await hashPin(pin) })
    .select('id')
    .single()

  // 23505 is the unique index on lower(name) — the only constraint this insert can hit.
  if (error?.code === '23505') return fail('That name is taken. Pick another, or sign in as it.')
  if (error || !data) return fail('Could not create that name. Try again.')

  await setSession((data as { id: string }).id)
  redirect('/')
}

/** Returning visit: the name is already chosen, so all that is left is the PIN. */
export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const userId = String(form.get('userId') ?? '')
  const pin = String(form.get('pin') ?? '')

  if (!userId) return fail('Pick a name first.')
  if (!isValidPin(pin)) return fail('The PIN is exactly 4 digits.')

  const { data } = await db().from('users').select('*').eq('id', userId).maybeSingle()
  const user = data as UserRow | null
  if (!user) return fail('That name no longer exists.')

  const locked = lockMessage(user.locked_until)
  if (locked) return fail(locked)

  if (!(await verifyPin(pin, user.pin_hash))) {
    const failedPins = user.failed_pins + 1
    const locking = failedPins >= MAX_PIN_TRIES

    await db()
      .from('users')
      .update(
        locking
          ? {
              // Reset the counter with the lock so the wait buys a clean set of tries.
              failed_pins: 0,
              locked_until: new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString(),
            }
          : { failed_pins: failedPins },
      )
      .eq('id', user.id)

    return fail(wrongPinMessage(failedPins))
  }

  await db()
    .from('users')
    .update({ failed_pins: 0, locked_until: null })
    .eq('id', user.id)

  await setSession(user.id)
  redirect('/')
}

export async function signOut(): Promise<void> {
  await clearSession()
  redirect('/')
}
