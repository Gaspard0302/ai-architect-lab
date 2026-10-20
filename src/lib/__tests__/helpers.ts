import type { Domain, Question } from '../content/types'
import type { AttemptRow } from '../mastery'

export function q(id: string, over: Partial<Question> = {}): Question {
  return {
    id,
    domain: 1,
    objective: 'D1.1',
    format: 'multi_choice',
    select: 1,
    stem: 'stem',
    options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    answer: ['A'],
    rationale: 'because',
    distractors: { B: 'no', C: 'no', D: 'no' },
    sources: ['lessons/MSO Foundations.md#01--intro'],
    provenance: 'course',
    ...over,
  }
}

let clock = 0
/** Monotonic ISO timestamps, so attempt order is unambiguous in tests. */
export const at = () => new Date(1_700_000_000_000 + ++clock * 1000).toISOString()

export function attempt(qid: string, correct: boolean, over: Partial<AttemptRow> = {}): AttemptRow {
  return { qid, correct, created_at: at(), domain: 1, objective: 'D1.1', ...over }
}

export function domain(id: number, items_in_mock: number, name = `D${id}`): Domain {
  return { id, name, weight: 10, items_in_mock, objectives: [] }
}

/** Deterministic stand-in for shuffle: identity. */
export const identity = <T,>(xs: T[]): T[] => [...xs]
