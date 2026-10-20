type Named = { term: string }

/**
 * The spellings a stem might use for a glossary heading: the heading itself, the
 * acronym and its expansion from "MCP (Model Context Protocol)", and each side of
 * "X versus Y". A long parenthetical like "(with rationale)" is a qualifier, not a name.
 */
function aliases(term: string): string[] {
  const out = [term]
  const paren = /^(.+?)\s*\((.+)\)$/.exec(term)
  if (paren) {
    out.push(paren[1])
    if (!paren[1].includes(' ')) out.push(paren[2])
  }
  for (const a of [...out]) {
    const sides = a.split(/\s+(?:versus|vs\.?)\s+/i)
    if (sides.length > 1) out.push(...sides)
  }
  return out
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Glossary entries named in `text`, at most `limit`, in order of first appearance.
 * Longer matches win and swallow shorter ones inside them, so "prompt caching" yields
 * Prompt caching rather than also Caching, and a specific term beats a generic one.
 */
export function termsIn<T extends Named>(terms: T[], text: string, limit = 3): T[] {
  const hits: { t: T; start: number; end: number }[] = []
  for (const t of terms) {
    for (const a of aliases(t.term)) {
      const m = new RegExp(`(?<!\\w)${escape(a)}(?:e?s)?(?!\\w)`, 'i').exec(text)
      if (m) hits.push({ t, start: m.index, end: m.index + m[0].length })
    }
  }
  hits.sort((a, b) => b.end - b.start - (a.end - a.start))

  const kept: typeof hits = []
  for (const h of hits) {
    if (kept.length === limit) break
    if (kept.some((k) => k.t === h.t || (h.start < k.end && k.start < h.end))) continue
    kept.push(h)
  }
  return kept.sort((a, b) => a.start - b.start).map((k) => k.t)
}
