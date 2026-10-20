import { Button, ButtonLink, Card, ProgressBar } from '@/components'
import { bank } from '@/lib/content/bank'
import { domains } from '@/lib/content/objectives'
import { requireCourse } from '@/lib/content/paths'
import { db, userAttempts, type SessionRow } from '@/lib/db'
import { isRetired, isUnseen, masteryOf } from '@/lib/mastery'
import { requireUserId } from '@/lib/session'
import { archivePractice } from './actions'
import { FilterForm, type DomainOption } from './FilterForm'
import { describeFilters, normaliseFilters, resumeLabel, type CatalogItem } from './helpers'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Practice' }

type Params = { course: string }
type Search = { empty?: string }

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}) {
  const course = requireCourse((await params).course)
  const { empty } = await searchParams

  const userId = await requireUserId()

  const [attempts, openResult] = await Promise.all([
    userAttempts(userId, course),
    db()
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('course', course)
      .eq('kind', 'practice')
      .is('archived_at', null)
      .is('submitted_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const mastery = masteryOf(attempts)
  const open = (openResult.data ?? null) as SessionRow | null

  if (open) {
    const { count } = await db()
      .from('attempts')
      .select('qid', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('session_id', open.id)

    const answered = count ?? 0
    const total = open.question_ids.length

    return (
      <>
        <Header course={course} />

        <Card
          marked
          eyebrow="Open set"
          title={resumeLabel(answered, total)}
          aside={describeFilters(normaliseFilters(open.filters))}
        >
          <ProgressBar
            value={answered}
            max={total}
            label="Answered"
            caption={`${answered} / ${total}`}
          />

          <div className={styles.resumeActions}>
            <ButtonLink href={`/${course}/practice/${open.id}`} variant="primary">
              Resume set
            </ButtonLink>

            <form
              action={async () => {
                'use server'
                await archivePractice(course, open.id)
              }}
            >
              <Button type="submit" variant="ghost">
                Start a new set
              </Button>
            </form>
          </div>

          <p className={styles.fine}>
            Starting a new set archives this one. Answers you have already given are kept.
          </p>
        </Card>
      </>
    )
  }

  const catalog: CatalogItem[] = bank(course).map((q) => ({
    id: q.id,
    domain: q.domain,
    objective: q.objective,
    status: isUnseen(mastery, q.id) ? 'unseen' : isRetired(mastery, q.id) ? 'retired' : 'due',
  }))

  const domainOptions: DomainOption[] = domains(course).map((d) => ({
    id: d.id,
    name: d.name,
    objectives: d.objectives.map((o) => ({ id: o.id, text: o.text })),
  }))

  return (
    <>
      <Header course={course} />

      {empty === '1' && (
        <p className={styles.warning} role="status">
          Nothing matched those filters. Widen the status or drop the objective.
        </p>
      )}

      <FilterForm course={course} catalog={catalog} domains={domainOptions} />
    </>
  )
}

function Header({ course }: { course: string }) {
  return (
    <div className={styles.head}>
      <p className={styles.eyebrow}>{course}</p>
      <h1 className={styles.title}>Practice</h1>
      <p className={styles.lede}>
        Pick what to drill. Twenty-five questions at a time, graded one by one, with the
        rationale and a link to the lesson it came from.
      </p>
    </div>
  )
}
