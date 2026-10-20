import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Markdown } from '@/lib/markdown'
import { lesson, lessons } from '@/lib/content/lessons'
import { courseNames, requireCourse } from '@/lib/content/paths'
import { requireUserId } from '@/lib/session'
import { Toc } from './Toc'
import styles from './page.module.css'

type Params = { course: string; lesson: string }

/** Every lesson of every course is known at build time; the bodies never change at runtime. */
export function generateStaticParams(): Params[] {
  return courseNames().flatMap((course) =>
    lessons(course).map((l) => ({ course, lesson: l.slug })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { course, lesson: slug } = await params
  const l = courseNames().includes(course) ? lesson(course, slug) : undefined
  return { title: l?.title ?? 'Lesson' }
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { course: rawCourse, lesson: slug } = await params
  const course = requireCourse(rawCourse)
  await requireUserId()

  const l = lesson(course, slug)
  if (!l) notFound()

  const all = lessons(course)
  const at = all.findIndex((m) => m.slug === l.slug)
  const prev = at > 0 ? all[at - 1] : null
  const next = at >= 0 && at < all.length - 1 ? all[at + 1] : null

  // h2/h3 only: h1 is the lesson title, h4+ are inside sections and would swamp the rail.
  const toc = l.headings.filter((h) => h.depth === 2 || h.depth === 3)

  return (
    <div className={styles.layout}>
      {/* Before the article in the DOM so the narrow-screen disclosure sits on top;
          the wide-screen rail is placed into column 2 by the stylesheet. */}
      <Toc headings={toc} />

      <article className={styles.article}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>
            <Link href={`/${course}/learn`} className={styles.back}>
              Learn
            </Link>
            <span aria-hidden="true"> / </span>
            Module {l.module}
          </p>
          <h1 className={styles.title}>{l.title}</h1>
          {l.topics.length > 0 && <p className={styles.topics}>{l.topics.join(' · ')}</p>}
        </header>

        <Markdown className={styles.prose}>{l.body}</Markdown>

        <nav className={styles.pager} aria-label="Lessons">
          {prev ? (
            <Link href={`/${course}/learn/${prev.slug}`} className={styles.pagerLink}>
              <span className={styles.pagerLabel}>Previous</span>
              <span className={styles.pagerTitle}>{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/${course}/learn/${next.slug}`}
              className={`${styles.pagerLink} ${styles.pagerNext}`}
            >
              <span className={styles.pagerLabel}>Next</span>
              <span className={styles.pagerTitle}>{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </div>
  )
}
