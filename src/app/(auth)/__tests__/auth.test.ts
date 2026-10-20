import { describe, expect, it } from 'vitest'
import { lockMessage, normaliseName, wrongPinMessage } from '../auth'

describe('lockMessage', () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0)

  it('is silent when there is no lock', () => {
    expect(lockMessage(null, now)).toBeNull()
  })

  it('is silent once the lock has expired', () => {
    expect(lockMessage(new Date(now - 1000).toISOString(), now)).toBeNull()
  })

  it('rounds up to whole minutes', () => {
    expect(lockMessage(new Date(now + 11 * 60_000 + 1).toISOString(), now)).toBe(
      'Locked for 12 more minutes.',
    )
  })

  it('says minute in the singular', () => {
    expect(lockMessage(new Date(now + 30_000).toISOString(), now)).toBe('Locked for 1 more minute.')
  })
})

describe('wrongPinMessage', () => {
  it('counts the tries left', () => {
    expect(wrongPinMessage(1)).toBe('Wrong PIN, 4 tries left.')
    expect(wrongPinMessage(4)).toBe('Wrong PIN, 1 try left.')
  })

  it('announces the lock on the fifth', () => {
    expect(wrongPinMessage(5)).toBe('Too many wrong PINs. Locked for 15 minutes.')
  })
})

describe('normaliseName', () => {
  it('trims and collapses whitespace so near-duplicates collide', () => {
    expect(normaliseName('  Ada   Lovelace ')).toBe('Ada Lovelace')
  })
})
