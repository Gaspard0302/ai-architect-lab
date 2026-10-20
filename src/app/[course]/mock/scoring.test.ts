import { describe, expect, it } from 'vitest'
import {
  PASS_SCALED,
  answeredCount,
  deadlineOf,
  domainBreakdown,
  hhmmss,
  passed,
  percentage,
  scaledScore,
} from './scoring'

describe('percentage', () => {
  it('rounds to one decimal', () => {
    expect(percentage(38, 53)).toBe(71.7)
    expect(percentage(45, 63)).toBe(71.4)
  })

  it('is 0 for an empty paper rather than NaN', () => {
    expect(percentage(0, 0)).toBe(0)
  })
})

describe('scaledScore', () => {
  it('is round(pct x 1000)', () => {
    expect(scaledScore(45, 63)).toBe(714)
    expect(scaledScore(46, 63)).toBe(730)
    expect(scaledScore(63, 63)).toBe(1000)
    expect(scaledScore(0, 63)).toBe(0)
  })

  it('puts the pass mark at 720, just above 45/63', () => {
    expect(passed(45, 63)).toBe(false)
    expect(passed(46, 63)).toBe(true)
    expect(PASS_SCALED).toBe(720)
  })

  it('does not divide by zero', () => {
    expect(scaledScore(0, 0)).toBe(0)
  })
})

describe('domainBreakdown', () => {
  const domains = [
    { id: 1, name: 'Foundations' },
    { id: 3, name: 'Integration' },
  ]

  it('tallies items and correct per domain, in domain order', () => {
    const paper = [
      { qid: 'Q-D3-001', domain: 3 },
      { qid: 'Q-D1-001', domain: 1 },
      { qid: 'Q-D1-002', domain: 1 },
    ]
    const correct = new Map([
      ['Q-D1-001', true],
      ['Q-D1-002', false],
      ['Q-D3-001', true],
    ])

    expect(domainBreakdown(paper, correct, domains)).toEqual([
      { domain: 1, name: 'Foundations', items: 2, correct: 1, pct: 50 },
      { domain: 3, name: 'Integration', items: 1, correct: 1, pct: 100 },
    ])
  })

  it('counts a repeated question once per slot, like the raw score does', () => {
    const paper = [
      { qid: 'Q-D3-001', domain: 3 },
      { qid: 'Q-D3-001', domain: 3 },
    ]
    const row = domainBreakdown(paper, new Map([['Q-D3-001', true]]), domains)[0]
    expect(row).toEqual({ domain: 3, name: 'Integration', items: 2, correct: 2, pct: 100 })
  })

  it('falls back to D<n> when the blueprint has no name', () => {
    const out = domainBreakdown([{ qid: 'x', domain: 9 }], new Map(), [])
    expect(out[0].name).toBe('D9')
  })

  it('treats an unanswered question as wrong', () => {
    const out = domainBreakdown([{ qid: 'x', domain: 1 }], new Map(), domains)
    expect(out[0]).toMatchObject({ correct: 0, pct: 0 })
  })
})

describe('answeredCount', () => {
  it('counts slots whose question has a non-empty choice', () => {
    const paper = [{ qid: 'a' }, { qid: 'b' }, { qid: 'a' }]
    expect(answeredCount(paper, { a: ['A'], b: [] })).toBe(2)
    expect(answeredCount(paper, {})).toBe(0)
  })
})

describe('hhmmss', () => {
  it('pads and floors', () => {
    expect(hhmmss(7200)).toBe('02:00:00')
    expect(hhmmss(59.9)).toBe('00:00:59')
    expect(hhmmss(-5)).toBe('00:00:00')
  })
})

describe('deadlineOf', () => {
  it('adds the limit to started_at', () => {
    expect(deadlineOf('2026-01-01T00:00:00.000Z', 7200)).toBe('2026-01-01T02:00:00.000Z')
  })

  it('defaults to the two-hour limit when the column is null', () => {
    expect(deadlineOf('2026-01-01T00:00:00.000Z', null)).toBe('2026-01-01T02:00:00.000Z')
  })
})
