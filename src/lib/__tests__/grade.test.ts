import { describe, expect, it } from 'vitest'
import { grade, toSafeQuestion } from '../grade'
import { q } from './helpers'

describe('grade', () => {
  it('marks an exact single-answer match correct', () => {
    expect(grade(['A'], q('Q-1')).correct).toBe(true)
  })

  it('marks a wrong single answer incorrect', () => {
    expect(grade(['B'], q('Q-1')).correct).toBe(false)
  })

  it('ignores the order of a multi-response key', () => {
    const item = q('Q-2', { format: 'multi_response', select: 2, answer: ['C', 'A'] })
    expect(grade(['A', 'C'], item).correct).toBe(true)
  })

  it('rejects a partial multi-response answer', () => {
    const item = q('Q-2', { format: 'multi_response', select: 2, answer: ['A', 'C'] })
    expect(grade(['A'], item).correct).toBe(false)
  })

  it('rejects an over-long answer and does not let duplicates pad it', () => {
    const item = q('Q-2', { format: 'multi_response', select: 2, answer: ['A', 'C'] })
    expect(grade(['A', 'C', 'D'], item).correct).toBe(false)
    expect(grade(['A', 'A'], item).correct).toBe(false)
  })

  it('returns the whole key payload', () => {
    const g = grade(['A'], q('Q-1'))
    expect(g.answer).toEqual(['A'])
    expect(g.rationale).toBe('because')
    expect(g.distractors.B).toBe('no')
    expect(g.sources).toHaveLength(1)
  })
})

describe('toSafeQuestion', () => {
  it('strips answer, rationale, distractors and sources', () => {
    const safe = toSafeQuestion(q('Q-1')) as Record<string, unknown>
    for (const k of ['answer', 'rationale', 'distractors', 'sources', 'provenance', 'difficulty']) {
      expect(safe[k]).toBeUndefined()
    }
  })

  it('keeps everything the runner needs', () => {
    expect(toSafeQuestion(q('Q-1'))).toEqual({
      id: 'Q-1',
      domain: 1,
      objective: 'D1.1',
      format: 'multi_choice',
      select: 1,
      stem: 'stem',
      options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    })
  })

  it('defaults a missing select to 1', () => {
    const item = { ...q('Q-1'), select: undefined as unknown as number }
    expect(toSafeQuestion(item).select).toBe(1)
  })
})
