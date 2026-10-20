import { Suspense } from 'react'
import Link from 'next/link'
import { Markdown } from '@/lib/markdown'
import { glossary } from '@/lib/content/glossary'
import { lesson, lessons } from '@/lib/content/lessons'
import { requireCourse } from '@/lib/content/paths'
import { requireUserId } from '@/lib/session'
import { GlossarySearch, type GlossaryItem } from './GlossarySearch'
import styles from './page.module.css'

type Params = { course: string }

export const metadata = { title: 'Learn' }

/** ~220 wpm, rounded up to the nearest 5 minutes: a shape, not a promise. */
function readingMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length
  return Math.max(5, Math.round(words / 220 / 5) * 5)
}

export default async function LearnIndex({ params }: { params: Promise<Params> }) {
  const course = requireCourse((await params).course)
  await requireUserId()

  const metas = lessons(course)

  const cards = metas.map((m) => {
    const full = lesson(course, m.slug)
    return {
      ...m,
      minutes: full ? readingMinutes(full.body) : 0,
      sections: m.sections || (full?.headings.filter((h) => h.depth === 2).length ?? 0),
    }
  })

  // Modules are named "2, 4" in the glossary; map them onto real lesson links.
  const byModule = new Map(metas.map((m) => [m.module, m]))
  const items: GlossaryItem[] = glossary(course).map((t) => ({
    id: t.id,
    term: t.term,
    search: `${t.term}\n${t.definition}`.toLowerCase(),
    modules: (t.modules.match(/\d+/g) ?? []).map((n) => {
      const m = byModule.get(Number(n))
      return { label: `Module ${n}`, href: m ? `/${course}/learn/${m.slug}` : null }
    }),
    body: <Markdown className={styles.def}>{t.definition}</Markdown>,
  }))

  return (
    <>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{course}</p>
        <h1 className={styles.title}>Learn</h1>
        <p className={styles.lede}>
          The formatted course modules, near-verbatim, plus the glossary they build up. Question
          rationales link straight into these pages at the heading they came from.
        </p>
      </header>

      <ol className={styles.lessons}>
        {cards.map((l) => (
          <li key={l.slug}>
            <Link href={`/${course}/learn/${l.slug}`} className={styles.lesson}>
              <span className={styles.module}>{String(l.module).padStart(2, '0')}</span>

              <span className={styles.lessonBody}>
                <span className={styles.lessonTitle}>{l.title}</span>

                <span className={styles.meta}>
                  {l.sections} sections · {l.minutes} min read
                </span>

                {l.topics.length > 0 && (
                  <span className={styles.topics}>
                    {l.topics.map((t) => (
                      <span key={t} className={styles.topic}>
                        {t}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {/* useSearchParams reads `?q=`; the boundary keeps the list server-rendered. */}
      <Suspense fallback={null}>
        <GlossarySearch items={items} />
      </Suspense>
    </>
  )
}
