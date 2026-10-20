import { describe, expect, it } from 'vitest'
import { RETIRE_AT, isDue, isRetired, isUnseen, masteryOf, weakestObjectives } from '../mastery'
import { attempt } from './helpers'

describe('masteryOf', () => {
  it('retires a question after RETIRE_AT consecutive correct answers', () => {
    const m = masteryOf([attempt('Q-1', false), attempt('Q-1', true), attempt('Q-1', true)])
    const s = m.get('Q-1')!
    expect(RETIRE_AT).toBe(2)
    expect(s.seen).toBe(3)
    expect(s.streak).toBe(2)
    expect(s.retired).toBe(true)
    expect(s.wrongCount).toBe(1)
    expect(s.lastCorrect).toBe(true)
  })

  it('resets the streak on a wrong answer, however good the history was', () => {
    const m = masteryOf([attempt('Q-1', true), attempt('Q-1', true), attempt('Q-1', false)])
    expect(m.get('Q-1')!.streak).toBe(0)
    expect(m.get('Q-1')!.retired).toBe(false)
  })

  it('counts the streak from the most recent attempt, not from file order', () => {
    const later = attempt('Q-1', false)
    const earlier = attempt('Q-1', true)
    // Deliberately out of chronological order in the array.
    const m = masteryOf([later, earlier].map((a, i) => ({ ...a, created_at: i === 0 ? '2030-01-01T00:00:00Z' : '2020-01-01T00:00:00Z' })))
    expect(m.get('Q-1')!.streak).toBe(0)
  })

  it('leaves untouched questions out of the map entirely', () => {
    const m = masteryOf([attempt('Q-1', true)])
    expect(m.has('Q-2')).toBe(false)
  })
})

describe('status predicates', () => {
  const m = masteryOf([
    attempt('seen-once', false),
    attempt('done', true),
    attempt('done', true),
  ])

  it('calls an unattempted question unseen', () => {
    expect(isUnseen(m, 'never')).toBe(true)
    expect(isDue(m, 'never')).toBe(false)
    expect(isRetired(m, 'never')).toBe(false)
  })

  it('calls a seen but unretired question due', () => {
    expect(isDue(m, 'seen-once')).toBe(true)
    expect(isRetired(m, 'seen-once')).toBe(false)
  })

  it('stops calling a retired question due', () => {
    expect(isRetired(m, 'done')).toBe(true)
    expect(isDue(m, 'done')).toBe(false)
  })
})

describe('weakestObjectives', () => {
  const log = [
    // D1.1 — 4 attempts, 3 wrong
    attempt('a', false, { objective: 'D1.1' }),
    attempt('b', false, { objective: 'D1.1' }),
    attempt('c', false, { objective: 'D1.1' }),
    attempt('d', true, { objective: 'D1.1' }),
    // D2.1 — 3 attempts, 1 wrong
    attempt('e', false, { objective: 'D2.1' }),
    attempt('f', true, { objective: 'D2.1' }),
    attempt('g', true, { objective: 'D2.1' }),
    // D3.1 — 2 attempts, both wrong: too few to rank
    attempt('h', false, { objective: 'D3.1' }),
    attempt('i', false, { objective: 'D3.1' }),
  ]

  it('ranks by wrong rate, worst first', () => {
    const { ranked } = weakestObjectives(log)
    expect(ranked.map((r) => r.objective)).toEqual(['D1.1', 'D2.1'])
    expect(ranked[0].wrongRate).toBeCloseTo(0.75)
  })

  it('never ranks an objective under the minimum sample, however bad it looks', () => {
    const { ranked, lowSample } = weakestObjectives(log)
    expect(ranked.some((r) => r.objective === 'D3.1')).toBe(false)
    expect(lowSample.map((r) => r.objective)).toEqual(['D3.1'])
    expect(lowSample[0].wrongRate).toBe(1)
  })

  it('honours a custom minimum', () => {
    const { ranked } = weakestObjectives(log, { minAttempts: 2 })
    expect(ranked[0].objective).toBe('D3.1')
  })

  it('returns nothing for an empty log', () => {
    expect(weakestObjectives([])).toEqual({ ranked: [], lowSample: [] })
  })
})
