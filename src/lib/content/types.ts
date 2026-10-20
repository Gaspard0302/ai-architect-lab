// Pure types and constants shared by the content loaders and the derivation modules.
// Deliberately free of `server-only` and of node built-ins so that mastery/select/grade
// stay importable from unit tests and, if ever needed, from a client component.

export type QuestionFormat = 'multi_choice' | 'multi_response'

/** A bank item, as authored in courses/<course>/questions/*.yaml. */
export type Question = {
  id: string
  domain: number
  objective: string
  format: QuestionFormat
  select: number
  stem: string
  options: Record<string, string>
  answer: string[]
  rationale: string
  distractors: Record<string, string>
  /** `lessons/<File>.md#anchor`, relative to courses/<course>/content/. */
  sources: string[]
  provenance: string
  difficulty?: number
}

/** The shape a client component is allowed to see: no key, no rationale, no sources. */
export type SafeQuestion = {
  id: string
  domain: number
  objective: string
  format: QuestionFormat
  select: number
  stem: string
  options: Record<string, string>
}

export type Coverage = 'strong' | 'partial' | 'none' | 'unassessed'

export type Objective = {
  id: string
  text: string
  weight: number
  detail: string
  course_coverage: Coverage
  /** Domain this objective belongs to. Denormalised on load for convenience. */
  domain: number
}

export type Domain = {
  id: number
  name: string
  weight: number
  items_in_mock: number
  objectives: Objective[]
}

/** The `exam:` block at the top of objectives.yaml — the paper this bank targets. */
export type Exam = {
  /** e.g. CCAR-P */
  code: string
  /** Full title, e.g. "Claude Certified Architect – Professional". */
  name: string
  version: string
  items: number
  minutes: number
  pass_scaled_score: number
  /** [min, max] of the reported scaled score. */
  scale: [number, number]
}

export type Blueprint = {
  exam?: Partial<Exam>
  domains: Domain[]
}
