import Link from 'next/link'
import type { Metadata } from 'next'
import { CourseSwitcher, Nav } from '@/components'
import { courseNames, requireCourse } from '@/lib/content/paths'
import { requireUser } from '@/lib/session'
import { signOut } from '../(auth)/actions'
import styles from './layout.module.css'

type Params = { course: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { course } = await params
  return { title: { default: course, template: `%s · ${course}` } }
}

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<Params>
}) {
  const course = requireCourse((await params).course)

  // The gate. Everything under /<course> reads one person's rows, so there is no page
  // here that makes sense without knowing who is asking.
  const user = await requireUser()

  const items = [
    { href: `/${course}`, label: 'Home', exact: true },
    { href: `/${course}/learn`, label: 'Learn' },
    { href: `/${course}/practice`, label: 'Practice' },
    { href: `/${course}/mock`, label: 'Mock' },
  ]

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link href="/?switch" className={styles.wordmark}>
            Cert<span>Prep</span>
          </Link>

          <CourseSwitcher
            courses={courseNames()}
            current={course}
            className={styles.switcher}
            linkClassName={styles.course}
            activeClassName={styles.courseOn}
          />

          <span className={styles.spacer} />
          <Nav items={items} />

          <div className={styles.who}>
            <span className={styles.whoName}>{user.name}</span>
            <form action={signOut}>
              <button type="submit" className={styles.signOut}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  )
}
