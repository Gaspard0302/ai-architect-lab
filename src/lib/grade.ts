// Server-side grading and the projection that keeps answer keys off the client.

import type { Question, SafeQuestion } from './content/types'

export type Graded = {
  correct: boolean
  answer: string[]
  rationale: string
  distractors: Record<string, string>
  /** `lessons/<File>.md#anchor` entries, relative to courses/<course>/content/. */
  sources: string[]
}

/**
 * Grade a submission. Order does not matter and duplicates do not help: the chosen set
 * must equal the key exactly, which is what makes `select` meaningful for multi_response.
 */
export function grade(chosen: string[], question: Question): Graded {
  const key = [...(question.answer ?? [])].sort()
  const given = [...new Set(chosen ?? [])].sort()
  const correct = key.length === given.length && key.every((v, i) => v === given[i])

  return {
    correct,
    answer: question.answer ?? [],
    rationale: question.rationale ?? '',
    distractors: question.distractors ?? {},
    sources: question.sources ?? [],
  }
}

/**
 * Everything a question may show before it is graded. `answer`, `rationale`,
 * `distractors` and `sources` are dropped here and nowhere else — this is the only
 * function allowed to build the payload a client component receives.
 */
export function toSafeQuestion(question: Question): SafeQuestion {
  return {
    id: question.id,
    domain: question.domain,
    objective: question.objective,
    format: question.format,
    select: question.select ?? 1,
    stem: question.stem,
    options: question.options,
  }
}

export const toSafeQuestions = (questions: Question[]): SafeQuestion[] =>
  questions.map(toSafeQuestion)
