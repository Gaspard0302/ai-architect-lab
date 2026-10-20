import 'server-only'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEYLEN = 32

/** A 4-digit PIN, exactly. Anything else is rejected before it reaches the database. */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

/** `scrypt$<salt base64>$<hash base64>`, the whole thing stored in users.pin_hash. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(pin, salt, KEYLEN)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

/** Constant-time check. False on any malformed stored value rather than throwing. */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = (stored ?? '').split('$')
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false

  const expected = Buffer.from(hashB64, 'base64')
  if (expected.length !== KEYLEN) return false

  const actual = await scryptAsync(pin, Buffer.from(saltB64, 'base64'), KEYLEN)
  return timingSafeEqual(expected, actual)
}
