import { describe, expect, it } from 'vitest'
import { masteryOf } from '../mastery'
import { drawMock, filterQuestions, selectPractice } from '../select'
import { attempt, domain, identity, q } from './helpers'

const questions = [
  q('Q-1', { domain: 1, objective: 'D1.1' }),
  q('Q-2', { domain: 1, objective: 'D1.2' }),
  q('Q-3', { domain: 2, objective: 'D2.1' }),
  q('Q-4', { domain: 2, objective: 'D2.1' }),
  q('Q-5', { domain: 3, objective: 'D3.1' }),
]

// Q-1 retired, Q-3 seen and due, the rest unseen.
const mastery = masteryOf([
  attempt('Q-1', true),
  attempt('Q-1', true),
  attempt('Q-3', false),
])

const ids = (xs: { id: string }[]) => xs.map((x) => x.id)

describe('filterQuestions', () => {
  it('returns everything for status all', () => {
    expect(filterQuestions(questions, mastery, { status: 'all' })).toHaveLength(5)
  })

  it('filters by status', () => {
    expect(ids(filterQuestions(questions, mastery, { status: 'unseen' }))).toEqual(['Q-2', 'Q-4', 'Q-5'])
    expect(ids(filterQuestions(questions, mastery, { status: 'due' }))).toEqual(['Q-3'])
    expect(ids(filterQuestions(questions, mastery, { status: 'retired' }))).toEqual(['Q-1'])
  })

  it('filters by domain and objective, and combines with status', () => {
    expect(ids(filterQuestions(questions, mastery, { status: 'all', domain: 2 }))).toEqual(['Q-3', 'Q-4'])
    expect(ids(filterQuestions(questions, mastery, { status: 'all', objective: 'D1.2' }))).toEqual(['Q-2'])
    expect(ids(filterQuestions(questions, mastery, { status: 'unseen', domain: 2 }))).toEqual(['Q-4'])
  })

  it('treats a null domain as no filter, not as domain zero', () => {
    expect(filterQuestions(questions, mastery, { status: 'all', domain: null })).toHaveLength(5)
  })
})

describe('selectPractice', () => {
  it('caps the set at the requested size and reports the full match count', () => {
    const set = selectPractice(questions, mastery, { status: 'all' }, { size: 2, rng: identity })
    expect(ids(set.items)).toEqual(['Q-1', 'Q-2'])
    expect(set.matched).toBe(5)
  })

  it('returns everything when fewer match than the set size', () => {
    const set = selectPractice(questions, mastery, { status: 'due' }, { size: 25, rng: identity })
    expect(set.items).toHaveLength(1)
    expect(set.matched).toBe(1)
  })
})

describe('drawMock', () => {
  const domains = [domain(1, 2), domain(2, 2), domain(3, 1)]

  it('draws items_in_mock per domain', () => {
    const paper = drawMock(questions, domains, mastery, { rng: identity })
    expect(paper.items).toHaveLength(5)
    expect(paper.shortfall).toEqual([])
  })

  it('prefers unseen items before falling back to seen ones', () => {
    // Domain 1 wants one item: Q-2 is unseen, Q-1 is retired.
    const paper = drawMock(questions, [domain(1, 1)], mastery, { rng: identity })
    expect(ids(paper.items)).toEqual(['Q-2'])
  })

  it('repeats rather than shrinking when a domain is under-banked, and says so', () => {
    const paper = drawMock(questions, [domain(3, 3, 'Thin')], mastery, { rng: identity })
    expect(paper.items).toHaveLength(3)
    expect(ids(paper.items)).toEqual(['Q-5', 'Q-5', 'Q-5'])
    expect(paper.shortfall).toEqual([{ domain: 3, name: 'Thin', want: 3, have: 1 }])
  })

  it('reports an empty domain as a total shortfall and draws nothing for it', () => {
    const paper = drawMock(questions, [domain(9, 4, 'Empty')], mastery, { rng: identity })
    expect(paper.items).toEqual([])
    expect(paper.shortfall).toEqual([{ domain: 9, name: 'Empty', want: 4, have: 0 }])
  })
})
