import { describe, expect, it } from 'vitest'
import { slug } from '../content/slug'

// These must match scripts/validate-bank.js exactly; the banks' source anchors do.
describe('slug', () => {
  it('lowercases and hyphenates', () => {
    expect(slug('Agent Construction')).toBe('agent-construction')
  })

  it('strips punctuation, leaving the gap as a hyphen', () => {
    expect(slug('Claude Code, MCP & Integration')).toBe('claude-code-mcp--integration')
  })

  it('keeps existing hyphens and digits', () => {
    expect(slug('04 — Sizing')).toBe('04--sizing')
  })

  it('folds accents via NFKD', () => {
    expect(slug('Évaluation')).toBe('evaluation')
  })

  it('trims before hyphenating', () => {
    expect(slug('  Spaced  Out  ')).toBe('spaced--out')
  })

  it('keeps underscores, which \\w admits', () => {
    expect(slug('snake_case heading')).toBe('snake_case-heading')
  })
})
