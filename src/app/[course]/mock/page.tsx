import type { Metadata } from 'next'
import { Button, ButtonLink, Card } from '@/components'
import { bankByDomain } from '@/lib/content/bank'
import { domains, mockLength } from '@/lib/content/objectives'
import { requireCourse } from '@/lib/content/paths'
import { requireUserId } from '@/lib/session'
import { abandonMock, startMock } from './actions'
import { attemptsOfSessions, deadlineMs, openMock, submittedMocks } from './data'
import {
  MOCK_TIME_LIMIT_S,
  PASS_SCALED,
  SCALED_DISCLAIMER,
  SCALE_MAX,
  hhmmss,
  percentage,
  scaledScore,
} from './scoring'
import styles from './page.module.css'

export const metadata: Metadata = { title: 'Mock exam' }

// Reads the session cookie and the learner's rows: never prerendered.
export const dynamic = 'force-dynamic'

const RULES = [
  ['No feedback until you submit', 'No key, no rationale, nothing marked right or wrong while the clock runs.'],
  ['Flag for review', 'Mark any question and come back to it from the navigator grid.'],
  ['Auto-submit at zero', 'The clock is the server’s. Closing the tab does not pause it; the paper submits itself when it runs out.'],
] as const

export default async function MockLobby({ params }: { params: Promise<{ course: string }> }) {
  const course = requireCourse((await params).course)
  const userId = await requireUserId()

  const items = mockLength(course)
  const banked = bankByDomain(course)
  const shortfall = domains(course)
    .map((d) => ({ ...d, have: banked.get(d.id) ?? 0 }))
    .filter((d) => d.items_in_mock > d.have)

  const open = await openMock(userId, course)
  const history = await submittedMocks(userId, course)
  const attempts = await attemptsOfSessions(userId, history.map((s) => s.id))

  const correctByQid = new Map<string, Map<string, boolean>>()
  for (const a of attempts) {
    if (!correctByQid.has(a.session_id)) correctByQid.set(a.session_id, new Map())
    correctByQid.get(a.session_id)!.set(a.qid, a.correct)
  }

  const sittings = history.map((s) => {
    const graded = correctByQid.get(s.id) ?? new Map<string, boolean>()
    const total = s.question_ids.length
    const correct = s.question_ids.filter((qid) => graded.get(qid)).length
    const elapsed = s.submitted_at
      ? (new Date(s.submitted_at).getTime() - new Date(s.started_at).getTime()) / 1000
      : 0
    return {
      id: s.id,
      when: s.submitted_at ?? s.started_at,
      total,
      correct,
      pct: percentage(correct, total),
      scaled: scaledScore(correct, total),
      time: hhmmss(elapsed),
    }
  })

  const remaining = open ? Math.max(0, Math.round((deadlineMs(open) - Date.now()) / 1000)) : 0

  return (
    <>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{course} · full paper</p>
        <h1 className={styles.title}>Mock exam</h1>
        <p className={styles.lede}>
          Exam conditions, end to end. Pacing and fatigue should surprise you here, not there.
        </p>
      </header>

      <div className={styles.spec}>
        <div className={styles.specItem}>
          <span className={styles.specValue}>{items}</span>
          <span className={styles.specLabel}>items, weighted to the blueprint</span>
        </div>
        <div className={styles.specItem}>
          <span className={styles.specValue}>{MOCK_TIME_LIMIT_S / 60}</span>
          <span className={styles.specLabel}>minutes, server-timed</span>
        </div>
        <div className={styles.specItem}>
          <span className={styles.specValue}>
            {PASS_SCALED}
            <span className={styles.specOf}>/{SCALE_MAX}</span>
          </span>
          <span className={styles.specLabel}>pass mark, approximate scale</span>
        </div>
      </div>

      {open ? (
        <Card
          marked
          eyebrow="Sitting in progress"
          title="Resume exam"
          aside={<span className="tabular">{hhmmss(remaining)} left</span>}
          className={styles.resume}
        >
          <p className={styles.body}>
            Started {new Date(open.started_at).toLocaleString()}. The clock has been running since.
          </p>
          <div className={styles.actions}>
            <ButtonLink href={`/${course}/mock/${open.id}`} variant="primary">
              Resume exam
            </ButtonLink>
            <form action={abandonMock.bind(null, course, open.id)}>
              <Button type="submit" variant="ghost">
                Abandon
              </Button>
            </form>
          </div>
          <p className={styles.fine}>Abandoning closes the sitting unscored. It will not appear in your history.</p>
        </Card>
      ) : (
        <Card marked eyebrow="Ready" title="Start a new paper" className={styles.resume}>
          <p className={styles.body}>
            {items} questions drawn fresh across {domains(course).length} domains, unseen items first.
            The clock starts the moment you press the button.
          </p>
          <div className={styles.actions}>
            <form action={startMock.bind(null, course)}>
              <Button type="submit" variant="primary" size="lg">
                Start exam
              </Button>
            </form>
          </div>
        </Card>
      )}

      <section className={styles.rules} aria-labelledby="rules-h">
        <h2 id="rules-h" className={styles.h2}>
          Rules
        </h2>
        <dl className={styles.ruleList}>
          {RULES.map(([term, detail]) => (
            <div key={term} className={styles.rule}>
              <dt>{term}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      {shortfall.length > 0 && (
        <section className={styles.shortfall} aria-labelledby="shortfall-h">
          <h2 id="shortfall-h" className={styles.h2}>
            Bank shortfall
          </h2>
          <p className={styles.body}>
            These domains cannot fill their quota without repeating questions. The paper repeats
            rather than shrinking, so the weighting stays honest even where the bank is thin.
          </p>
          <ul className={styles.shortList}>
            {shortfall.map((d) => (
              <li key={d.id}>
                <strong>D{d.id}</strong> wants {d.items_in_mock}, bank has {d.have}: items repeat
                <span className={styles.shortName}> — {d.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.history} aria-labelledby="history-h">
        <h2 id="history-h" className={styles.h2}>
          Your sittings
        </h2>

        {sittings.length === 0 ? (
          <p className={styles.empty}>No submitted papers yet. The first one is the useful one.</p>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Submitted</th>
                    <th scope="col" className={styles.num}>
                      Raw
                    </th>
                    <th scope="col" className={styles.num}>
                      %
                    </th>
                    <th scope="col" className={styles.num}>
                      Approx. scaled
                    </th>
                    <th scope="col" className={styles.num}>
                      Time
                    </th>
                    <th scope="col">
                      <span className="srOnly">Review</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sittings.map((s) => (
                    <tr key={s.id}>
                      <td>{new Date(s.when).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                      <td className={`${styles.num} tabular`}>
                        {s.correct}/{s.total}
                      </td>
                      <td className={`${styles.num} tabular`}>{s.pct}%</td>
                      <td className={`${styles.num} tabular`}>
                        <span className={s.scaled >= PASS_SCALED ? styles.pass : styles.fail}>{s.scaled}</span>
                      </td>
                      <td className={`${styles.num} tabular`}>{s.time}</td>
                      <td className={styles.num}>
                        <ButtonLink href={`/${course}/mock/${s.id}`} size="sm" variant="ghost">
                          Review
                        </ButtonLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.fine}>{SCALED_DISCLAIMER}</p>
          </>
        )}
      </section>
    </>
  )
}
