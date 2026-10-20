import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown, MarkdownInline, sourceHref, sourceLabel } from '../markdown'

const html = (md: string) => renderToStaticMarkup(<Markdown>{md}</Markdown>)
const inline = (md: string) => renderToStaticMarkup(<MarkdownInline>{md}</MarkdownInline>)

describe('Markdown block renderer', () => {
  it('renders the feature set the banks rely on', () => {
    expect(html('**bold** *it* ~~no~~ `c`')).toContain('<strong>bold</strong>')
    expect(html('**bold** *it* ~~no~~ `c`')).toContain('<del>no</del>')
    expect(html('- a\n- b')).toContain('<ul>')
    expect(html('3. a\n4. b')).toContain('start="3"')
    expect(html('> quoted')).toContain('<blockquote>')
    expect(html('```\ncode\n```')).toContain('<pre>')
    expect(html('| a | b |\n| --- | --- |\n| 1 | 2 |')).toContain('<table>')
    expect(html('---')).toContain('<hr')
  })

  it('gives every heading the validate-bank slug as its id', () => {
    expect(html('## Claude Code, MCP & Integration')).toContain('id="claude-code-mcp--integration"')
    expect(html('###### 04 — Sizing')).toContain('<h6 id="04--sizing">')
  })

  it('escapes raw HTML rather than rendering it', () => {
    expect(html('<img src=x onerror=alert(1)>')).not.toContain('<img')
  })

  it('keeps relative and anchor links, defuses unknown schemes', () => {
    expect(html('[x](/architect/learn)')).toContain('href="/architect/learn"')
    expect(html('[x](#04--sizing)')).toContain('href="#04--sizing"')
    expect(html('[x](https://anthropic.com)')).toContain('target="_blank"')
    expect(html('[x](javascript:alert(1))')).toContain('href="#"')
  })
})

describe('MarkdownInline', () => {
  it('renders emphasis without wrapping it in a paragraph', () => {
    expect(inline('a **b**')).toBe('<span>a <strong>b</strong></span>')
  })

  it('does not chew through an underscore inside a word', () => {
    expect(inline('foo_bar_baz')).toContain('foo_bar_baz')
  })

  it('drops block structure instead of rendering it', () => {
    expect(inline('# heading')).not.toContain('<h1')
  })
})

describe('sourceHref', () => {
  it('turns a sources entry into a lesson deep link', () => {
    expect(sourceHref('architect', 'lessons/Enterprise Integration & Production.md#04--sizing')).toBe(
      '/architect/learn/enterprise-integration--production#04--sizing',
    )
  })

  it('works without an anchor', () => {
    expect(sourceHref('developer', 'lessons/MSO Foundations.md')).toBe('/developer/learn/mso-foundations')
  })

  it('labels a source for display', () => {
    expect(sourceLabel('lessons/MSO Foundations.md#01--intro')).toBe('MSO Foundations · 01--intro')
  })
})
