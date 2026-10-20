// The one markdown renderer. Stems, options, rationales, distractor notes, glossary
// definitions and whole lessons all go through here, so what an author sees in a lesson
// and what a learner sees in a question stem cannot drift apart.
//
// Feature set matches the retired hand-rolled renderer: paragraphs, inline emphasis and
// code, links, h1-h6, nested lists, fenced code, blockquotes, GFM tables, horizontal
// rules. Raw HTML is escaped, by choice — react-markdown does that by default and
// rehype-raw is deliberately absent.

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import type { Root, Element, ElementContent } from 'hast'
import { slug } from './content/slug'

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

function textOf(nodes: ElementContent[]): string {
  return nodes
    .map((n) =>
      n.type === 'text' ? n.value : n.type === 'element' ? textOf(n.children) : '',
    )
    .join('')
}

/**
 * Give every heading the id `pnpm validate` expects. Not github-slugger: the banks'
 * `sources` anchors are checked against scripts/validate-bank.js's slug, and that one
 * is copied verbatim into content/slug.ts.
 */
export function rehypeSlugHeadings() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (!HEADINGS.has(node.tagName)) return
      node.properties = { ...node.properties, id: slug(textOf(node.children)) }
    })
  }
}

const SAFE_SCHEME = /^(https?:|mailto:)/i

/** Relative paths and `#anchor` pass through; unknown schemes defuse to `#`. */
function safeUrl(url: string): string {
  const u = (url ?? '').trim()
  if (!u) return '#'
  if (u.startsWith('#') || u.startsWith('/') || u.startsWith('.')) return u
  if (SAFE_SCHEME.test(u)) return u
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? '#' : u
}

/**
 * Turn a question `sources` entry into an app URL.
 *
 * `lessons/Enterprise Integration & Production.md#04--sizing`
 *   → `/architect/learn/enterprise-integration--production#04--sizing`
 *
 * The lesson segment is `slug()` of the file's basename, which is exactly how
 * `src/lib/content/lessons.ts` derives `LessonMeta.slug`.
 */
export function sourceHref(course: string, source: string): string {
  const [file, anchor] = source.split('#')
  const base = file.replace(/^lessons\//, '').replace(/\.md$/, '')
  const path = `/${course}/learn/${encodeURIComponent(slug(base))}`
  return anchor ? `${path}#${anchor}` : path
}

/** Human-readable label for a `sources` entry: the lesson title and its heading. */
export function sourceLabel(source: string): string {
  const [file, anchor] = source.split('#')
  const base = file.replace(/^lessons\//, '').replace(/\.md$/, '')
  return anchor ? `${base} · ${anchor}` : base
}

const components: Components = {
  a: ({ href, children, ...rest }) => {
    const url = safeUrl(String(href ?? ''))
    const external = SAFE_SCHEME.test(url)
    return (
      <a
        href={url}
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        {...rest}
      >
        {children}
      </a>
    )
  },
}

export type MarkdownProps = {
  children: string
  /** Applied to the wrapper, so each surface can set its own measure and scale. */
  className?: string
}

/**
 * Block renderer: everything in the table above. Use for stems, rationales, lessons.
 *
 * Always carries the global `.prose` class (src/styles/globals.css), which owns the block
 * rhythm — paragraph spacing, list indent, code scroll, table borders. A caller's
 * `className` sets the scale and measure on top of it.
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={['prose', className].filter(Boolean).join(' ')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlugHeadings]}
        urlTransform={safeUrl}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

const INLINE = ['p', 'em', 'strong', 'del', 'code', 'a', 'br', 'text']

/**
 * Inline-only renderer for answer options and distractor notes. YAML folds those to a
 * single line, so block structure there is always an accident; block elements are
 * unwrapped rather than rendered.
 */
export function MarkdownInline({ children, className }: MarkdownProps) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={safeUrl}
        components={{ ...components, p: ({ children: c }) => <>{c}</> }}
        allowedElements={INLINE}
        unwrapDisallowed
      >
        {children}
      </ReactMarkdown>
    </span>
  )
}
