import 'server-only'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { courseRoot, perCourse } from './paths'
import { slug } from './slug'

export type LessonMeta = {
  /** URL segment, `slug()` of the file's basename. Stable as long as the file is. */
  slug: string
  /** File name inside content/lessons/, e.g. "MSO Foundations.md". */
  file: string
  title: string
  course: string
  module: number
  sections: number
  /** Path of the drill file relative to content/, if the frontmatter names one. */
  drills: string | null
  topics: string[]
}

export type Heading = {
  depth: number
  text: string
  /** Same slug `pnpm validate` checks question `sources` anchors against. */
  id: string
}

export type Lesson = LessonMeta & {
  /** Markdown body with the frontmatter removed. */
  body: string
  headings: Heading[]
}

function lessonsDir(course: string) {
  return join(courseRoot(course), 'content', 'lessons')
}

/** ATX headings outside fenced code blocks, in document order. */
export function headingsOf(markdown: string): Heading[] {
  const out: Heading[] = []
  let fenced = false
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (!m) continue
    const text = m[2].trim()
    out.push({ depth: m[1].length, text, id: slug(text) })
  }
  return out
}

/**
 * One frontmatter `topics` entry as a string.
 *
 * A topic containing ": " — "tool use: parallel calls" — is valid YAML for a one-key map,
 * so the parser hands us `{ "tool use": "parallel calls" }`. `String()` on that is
 * "[object Object]". Flatten it back to what the author typed instead.
 */
export function topicText(raw: unknown): string {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw as Record<string, unknown>)
      .map(([k, v]) => (v === null ? k : `${k}: ${v}`))
      .join(', ')
  }
  return String(raw)
}

function read(course: string, file: string): Lesson {
  const raw = readFileSync(join(lessonsDir(course), file), 'utf8')
  const { data, content } = matter(raw)
  return {
    slug: slug(file.replace(/\.md$/, '')),
    file,
    title: String(data.title ?? file.replace(/\.md$/, '')),
    course: String(data.course ?? ''),
    module: Number(data.module ?? 0),
    sections: Number(data.sections ?? 0),
    drills: data.drills ? String(data.drills) : null,
    topics: Array.isArray(data.topics) ? data.topics.map(topicText) : [],
    body: content,
    headings: headingsOf(content),
  }
}

const load = perCourse((course: string): Lesson[] => {
  let files: string[]
  try {
    files = readdirSync(lessonsDir(course)).filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }
  return files.map((f) => read(course, f)).sort((a, b) => a.module - b.module)
})

/** Every lesson's frontmatter, in module order. Bodies are loaded but not returned. */
export function lessons(course: string): LessonMeta[] {
  return load(course).map((l) => ({
    slug: l.slug,
    file: l.file,
    title: l.title,
    course: l.course,
    module: l.module,
    sections: l.sections,
    drills: l.drills,
    topics: l.topics,
  }))
}

/** One lesson with its markdown body and heading list, by URL slug. */
export function lesson(course: string, lessonSlug: string): Lesson | undefined {
  return load(course).find((l) => l.slug === lessonSlug)
}

/** Resolve the `lessons/<File>.md` half of a question `sources` entry to a URL slug. */
export function lessonSlugForFile(course: string, file: string): string | undefined {
  const base = file.replace(/^lessons\//, '')
  return load(course).find((l) => l.file === base)?.slug
}
