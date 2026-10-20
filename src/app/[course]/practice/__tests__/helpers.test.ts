import { describe, expect, it } from 'vitest'
import {
  countMatching,
  describeFilters,
  domainBreakdown,
  normaliseFilters,
  resolvePosition,
  resumeLabel,
  type CatalogItem,
} from '../helpers'

const catalog: CatalogItem[] = [
  { id: 'Q-D1-001', domain: 1, objective: 'D1.1', status: 'unseen' },
  { id: 'Q-D1-002', domain: 1, objective: 'D1.1', status: 'due' },
  { id: 'Q-D1-003', domain: 1, objective: 'D1.2', status: 'retired' },
  { id: 'Q-D2-001', domain: 2, objective: 'D2.1', status: 'unseen' },
  { id: 'Q-D2-002', domain: 2, objective: 'D2.1', status: 'retired' },
]

describe('normaliseFilters', () => {
  it('defaults to every question', () => {
    expect(normaliseFilters({})).toEqual({ status: 'all', domain: null, objective: null })
  })

  it('rejects an unknown status rather than passing it through', () => {
    expect(normaliseFilters({ status: 'drop table' }).status).toBe('all')
  })

  it('takes a domain from a form string and drops junk', () => {
    expect(normaliseFilters({ domain: '3' }).domain).toBe(3)
    expect(normaliseFilters({ domain: 'x' }).domain).toBeNull()
    expect(normaliseFilters({ domain: 0 }).domain).toBeNull()
    expect(normaliseFilters({ domain: 1.5 }).domain).toBeNull()
  })

  it('trims an objective and treats blank as absent', () => {
    expect(normaliseFilters({ objective: ' D2.1 ' }).objective).toBe('D2.1')
    expect(normaliseFilters({ objective: '   ' }).objective).toBeNull()
  })
})

describe('countMatching', () => {
  it('counts everything by default', () => {
    expect(countMatching(catalog, { status: 'all', domain: null, objective: null })).toBe(5)
  })

  it('counts by status', () => {
    expect(countMatching(catalog, { status: 'unseen', domain: null, objective: null })).toBe(2)
    expect(countMatching(catalog, { status: 'retired', domain: null, objective: null })).toBe(2)
    expect(countMatching(catalog, { status: 'due', domain: null, objective: null })).toBe(1)
  })

  it('intersects status, domain and objective', () => {
    expect(countMatching(catalog, { status: 'all', domain: 1, objective: null })).toBe(3)
    expect(countMatching(catalog, { status: 'all', domain: null, objective: 'D1.1' })).toBe(2)
    expect(countMatching(catalog, { status: 'unseen', domain: 2, objective: 'D2.1' })).toBe(1)
    expect(countMatching(catalog, { status: 'due', domain: 2, objective: null })).toBe(0)
  })
})

describe('resolvePosition', () => {
  const ids = ['a', 'b', 'c']

  it('opens at the first unanswered question', () => {
    expect(resolvePosition(ids, new Set(['a']), {})).toEqual({ kind: 'question', index: 1 })
  })

  it('opens at the start when nothing is answered', () => {
    expect(resolvePosition(ids, new Set(), {})).toEqual({ kind: 'question', index: 0 })
  })

  it('honours ?q for revisiting an answered question', () => {
    expect(resolvePosition(ids, new Set(['a', 'b']), { q: '1' })).toEqual({
      kind: 'question',
      index: 0,
    })
  })

  it('ignores a ?q that points outside the set', () => {
    expect(resolvePosition(ids, new Set(['a']), { q: '9' })).toEqual({ kind: 'question', index: 1 })
    expect(resolvePosition(ids, new Set(['a']), { q: '0' })).toEqual({ kind: 'question', index: 1 })
    expect(resolvePosition(ids, new Set(['a']), { q: 'x' })).toEqual({ kind: 'question', index: 1 })
  })

  it('finishes when every question is answered', () => {
    expect(resolvePosition(ids, new Set(['a', 'b', 'c']), {})).toEqual({ kind: 'finish' })
  })

  it('finishes on ?done even with gaps, so the last Next has somewhere to go', () => {
    expect(resolvePosition(ids, new Set(['a']), { done: '1' })).toEqual({ kind: 'finish' })
  })

  it('lets ?q beat ?done so a review link from the finish screen works', () => {
    expect(resolvePosition(ids, new Set(['a', 'b', 'c']), { q: '2' })).toEqual({
      kind: 'question',
      index: 1,
    })
  })

  it('finishes an empty set', () => {
    expect(resolvePosition([], new Set(), {})).toEqual({ kind: 'finish' })
  })
})

describe('domainBreakdown', () => {
  const items = [
    { id: 'a', domain: 2 },
    { id: 'b', domain: 1 },
    { id: 'c', domain: 1 },
    { id: 'd', domain: 1 },
  ]

  it('scores per domain, in domain order, naming what it can', () => {
    const correct = new Map([
      ['a', true],
      ['b', false],
      ['c', true],
    ])
    expect(domainBreakdown(items, correct, new Map([[1, 'Foundations']]))).toEqual([
      { domain: 1, name: 'Foundations', correct: 1, total: 3 },
      { domain: 2, name: 'Domain 2', correct: 1, total: 1 },
    ])
  })

  it('counts an unanswered question as not correct but still in the total', () => {
    const [d1] = domainBreakdown(items, new Map(), new Map())
    expect(d1).toEqual({ domain: 1, name: 'Domain 1', correct: 0, total: 3 })
  })
})

describe('labels', () => {
  it('renders the resume line the PRD asks for', () => {
    expect(resumeLabel(7, 25)).toBe('Resume set · 7/25 answered')
  })

  it('describes filters narrowest-first', () => {
    expect(describeFilters({ status: 'all', domain: null, objective: null })).toBe('all')
    expect(describeFilters({ status: 'due', domain: 3, objective: null })).toBe('due · domain 3')
    expect(describeFilters({ status: 'unseen', domain: 3, objective: 'D3.2' })).toBe(
      'unseen · D3.2',
    )
  })
})
