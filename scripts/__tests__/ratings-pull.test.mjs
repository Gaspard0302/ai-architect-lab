import { describe, expect, it } from 'vitest'
import { renderRatingsYaml } from '../ratings-pull.mjs'

const AT = new Date('2026-09-17T10:00:00.000Z')

describe('renderRatingsYaml', () => {
  it('aggregates stars per question, sorted by qid', () => {
    const out = renderRatingsYaml(
      [
        { qid: 'Q-D2-007', stars: 3 },
        { qid: 'Q-D1-001', stars: 5 },
        { qid: 'Q-D1-001', stars: 4 },
        { qid: 'Q-D2-007', stars: 4 },
      ],
      { course: 'developer', generatedAt: AT },
    )

    expect(out).toContain('course: developer')
    expect(out).toContain('rated_questions: 2')
    expect(out).toContain('total_ratings: 4')
    expect(out.indexOf('Q-D1-001')).toBeLessThan(out.indexOf('Q-D2-007'))
    expect(out).toContain('    avg: 4.5')
    expect(out).toContain('    hist: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 }')
    expect(out).toContain('    hist: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 0 }')
  })

  it('documents every star label in the header', () => {
    const out = renderRatingsYaml([], { course: 'architect', generatedAt: AT })
    for (const label of ['1 Broken', '2 Unfair', '3 OK, not exam-like', '4 Good exam question', '5 Could be on the real paper']) {
      expect(out).toContain(label)
    }
    expect(out).toContain('ratings:\n  {}')
  })

  it('ignores out-of-range stars', () => {
    const out = renderRatingsYaml([{ qid: 'Q-D1-001', stars: 0 }, { qid: 'Q-D1-001', stars: 5 }], {
      course: 'developer',
      generatedAt: AT,
    })
    expect(out).toContain('    n: 1')
    expect(out).toContain('    avg: 5.0')
  })
})
