import { describe, expect, it } from 'vitest'
import { termsIn } from '../terms'

const g = (...names: string[]) => names.map((term) => ({ term }))
const names = (ts: { term: string }[]) => ts.map((t) => t.term)

describe('termsIn', () => {
  it('matches case-insensitively on word boundaries, plurals included', () => {
    const terms = g('Hook', 'State', 'Subagent')
    expect(names(termsIn(terms, 'Two subagents share no hooks; the statement is wrong.'))).toEqual([
      'Subagent',
      'Hook',
    ])
  })

  it('lets the longer term swallow a shorter one inside it', () => {
    expect(names(termsIn(g('Caching', 'Prompt caching'), 'Enable prompt caching.'))).toEqual([
      'Prompt caching',
    ])
  })

  it('matches an acronym, its expansion, and either side of versus', () => {
    const terms = g('MCP (Model Context Protocol)', 'Model alias versus pinned ID', 'Decision log (with rationale)')
    expect(names(termsIn(terms, 'Use the Model Context Protocol, with rationale.'))).toEqual([
      'MCP (Model Context Protocol)',
    ])
    expect(names(termsIn(terms, 'Pin a pinned ID in prod.'))).toEqual(['Model alias versus pinned ID'])
  })

  it('caps at the limit, preferring specific terms, in stem order', () => {
    const terms = g('Token', 'Eval', 'Context Window', 'LLM-as-judge')
    expect(names(termsIn(terms, 'An eval with an LLM-as-judge fills the context window with tokens.', 2))).toEqual([
      'LLM-as-judge',
      'Context Window',
    ])
  })
})
