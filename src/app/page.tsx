import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components'
import { courseNames } from '@/lib/content/paths'
import { bank } from '@/lib/content/bank'
import { domains, exam, mockLength } from '@/lib/content/objectives'
import { getCurrentUser } from '@/lib/session'
import { signOut } from './(auth)/actions'
import { SignIn } from './(auth)/SignIn'
import { attemptCounts, everyone, lastCourse } from './(auth)/user-courses'
import styles from './page.module.css'

// The door. Signed out it is the name picker; signed in it sends you to the course you
// were last in, unless you asked for the picker (?switch, the header wordmark's link).

export const dynamic = 'force-dynamic'

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const wantsPicker = 'switch' in (await searchParams)
  const user = await getCurrentUser()

  if (user && !wantsPicker) {
    const last = await lastCourse(user.id)
    if (last) redirect(`/${last}`)
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Claude certification</p>
        <h1 className={styles.title}>
          Read the course. <em>Drill the paper.</em>
        </h1>
        <p className={styles.lede}>
          The course material and an exam-shaped question bank in one place, with your progress
          kept where you left it.
        </p>
      </header>

      <hr className={styles.rule} />

      {user ? <CoursePicker userId={user.id} name={user.name} /> : <SignInPanel />}
    </main>
  )
}

async function SignInPanel() {
  const people = await everyone()
  return <SignIn people={people} />
}

async function CoursePicker({ userId, name }: { userId: string; name: string }) {
  const counts = await attemptCounts(userId)

  return (
    <section>
      <div className={styles.whoRow}>
        <h2 className={styles.heading}>
          Which exam, <em>{name}</em>?
        </h2>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <ul className={styles.courses}>
        {courseNames().map((course) => {
          const e = exam(course)
          const answered = counts.get(course) ?? 0
          return (
            <li key={course}>
              <Link href={`/${course}`} className={styles.course}>
                <span className={styles.courseCode}>{e.code}</span>
                <span className={styles.courseName}>{e.name}</span>
                <span className={styles.courseMeta}>
                  {e.items} items · {e.minutes} minutes · {e.pass_scaled_score} to pass
                </span>
                <span className={styles.courseYou}>
                  {answered === 0
                    ? `Not started · ${bank(course).length} questions banked across ${domains(course).length} domains`
                    : `${answered} ${answered === 1 ? 'answer' : 'answers'} recorded · ${mockLength(course)}-item mock`}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
