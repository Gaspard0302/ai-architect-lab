import Link from 'next/link'
import { ButtonLink, Card, ProgressBar } from '@/components'
import { requireCourse } from '@/lib/content/paths'
import { bankByDomain } from '@/lib/content/bank'
import { exam, mockLength } from '@/lib/content/objectives'
import { requireUser } from '@/lib/session'
import { homeData, type DomainGroup, type Home, type OpenSession } from './home-data'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

const pct = (n: number) => `${Math.round(n * 100)}%`

export default async function CourseHome({ params }: { params: Promise<{ course: string }> }) {
  const course = requireCourse((await params).course)
  const user = await requireUser()

  const e = exam(course)
  const home = await homeData(user.id, course)
  const fresh = home.answers === 0

  return (
    <>
      <div className={styles.head}>
        <p className={styles.eyebrow}>
          {e.code} · {e.items} items · {e.minutes} minutes · {e.pass_scaled_score} to pass
        </p>
        <h1 className={styles.title}>{e.name}</h1>
      </div>

      {fresh ? (
        <FirstTime course={course} />
      ) : (
        <>
          {(home.openPractice || home.openMock) && (
            <div className={styles.resumeRow}>
              {home.openPractice && <Resume course={course} session={home.openPractice} />}
              {home.openMock && <Resume course={course} session={home.openMock} />}
            </div>
          )}

          <Weakest home={home} />
        </>
      )}

      <Mastery course={course} home={home} fresh={fresh} />

      <div className={styles.twoUp}>
        <Mocks course={course} home={home} pass={e.pass_scaled_score} />
        <Coverage course={course} home={home} />
      </div>

      <p className={styles.rated}>
        {home.seen === 0
          ? 'Nothing rated yet. Stars appear under the rationale once a question is graded.'
          : `You have rated ${home.rated} of ${home.seen} questions you've seen.`}
      </p>
    </>
  )
}

/* ---------------------------------------------------------------- brand-new learner */

function FirstTime({ course }: { course: string }) {
  return (
    <Card marked eyebrow="Start here" title="Nothing recorded yet" className={styles.block}>
      <p className={styles.prose}>
        Two ways in, and they work best together. Read a module first if the exam blueprint below
        looks unfamiliar; otherwise drill a set of 25 and let the wrong answers tell you which
        module to open.
      </p>
      <div className={styles.actions}>
        <ButtonLink href={`/${course}/practice`} variant="primary">
          Start a practice set
        </ButtonLink>
        <ButtonLink href={`/${course}/learn`}>Read a module</ButtonLink>
      </div>
      <p className={styles.note}>
        Once you have answered a few questions this page fills in: mastery per objective, your
        weakest objectives, and your mock history.
      </p>
    </Card>
  )
}

/* ------------------------------------------------------------------------ resume card */

function Resume({ course, session }: { course: string; session: OpenSession }) {
  const label = session.kind === 'practice' ? 'Practice set' : 'Mock paper'
  return (
    <Card
      marked
      eyebrow="Open right now"
      title={label}
      aside={new Date(session.startedAt).toLocaleDateString()}
      className={styles.block}
    >
      <ProgressBar
        value={session.answered}
        max={session.total}
        label="Answered"
        complete={session.answered >= session.total}
      />
      <div className={styles.actions}>
        <ButtonLink href={`/${course}/${session.kind}/${session.id}`} variant="primary">
          Resume ({session.answered}/{session.total})
        </ButtonLink>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ weakest objectives */

function Weakest({ home }: { home: Home }) {
  const { ranked, lowSample } = home.weakest
  if (ranked.length === 0 && lowSample.length === 0) return null

  return (
    <Card
      eyebrow="Weakest objectives"
      title="What to study next"
      aside="minimum 3 answers"
      className={styles.block}
    >
      {ranked.length > 0 ? (
        <ol className={styles.weakList}>
          {ranked.slice(0, 6).map((s) => (
            <li key={s.objective} className={styles.weakItem}>
              <span className={styles.weakId}>{s.objective}</span>
              <span className={styles.weakText}>{home.objectiveText.get(s.objective) ?? ''}</span>
              <span className={styles.weakScore}>
                {pct(s.wrongRate)} wrong
                <small>
                  {s.wrong}/{s.attempts}
                </small>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.prose}>
          Nothing has three answers behind it yet, so nothing can honestly be called weak.
        </p>
      )}

      {lowSample.length > 0 && (
        <p className={styles.lowSample}>
          <span className={styles.lowLabel}>Too few answers to rank</span>
          {lowSample.map((s) => (
            <span key={s.objective} className={styles.chip}>
              {s.objective}
              <small>
                {s.wrong}/{s.attempts}
              </small>
            </span>
          ))}
        </p>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------- mastery by domain */

function Mastery({ course, home, fresh }: { course: string; home: Home; fresh: boolean }) {
  return (
    <section className={styles.block}>
      <h2 className={styles.sectionTitle}>Mastery by objective</h2>
      <p className={styles.sectionNote}>
        Retired means two consecutive correct answers, recomputed from your whole log every
        time this page loads. {fresh && 'Everything below is waiting for its first answer.'}
      </p>

      <div className={styles.domains}>
        {home.domains.map((d) => (
          <DomainBlock key={d.id} course={course} group={d} />
        ))}
      </div>
    </section>
  )
}

function DomainBlock({ course, group }: { course: string; group: DomainGroup }) {
  const attempted = group.objectives.reduce((n, o) => n + o.attempted, 0)
  const retired = group.objectives.reduce((n, o) => n + o.retired, 0)

  return (
    <Card
      eyebrow={`Domain ${group.id}`}
      title={group.name}
      aside={`${retired} of ${group.banked} retired`}
      className={styles.domain}
    >
      <ProgressBar
        value={retired}
        max={group.banked || 1}
        label="Retired"
        caption={`${attempted} attempted`}
        complete={group.banked > 0 && retired === group.banked}
      />

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Objective</th>
            <th scope="col" className={styles.num}>
              Att.
            </th>
            <th scope="col" className={styles.num}>
              Ret.
            </th>
            <th scope="col" className={styles.num}>
              Acc.
            </th>
          </tr>
        </thead>
        <tbody>
          {group.objectives.map((o) => (
            <tr key={o.id} className={o.attempted === 0 ? styles.untouched : undefined}>
              <th scope="row">
                <Link href={`/${course}/practice?objective=${o.id}`} className={styles.objLink}>
                  <span className={styles.objId}>{o.id}</span>
                  <span className={styles.objText}>{o.text}</span>
                </Link>
              </th>
              <td className={styles.num}>
                {o.attempted}/{o.banked}
              </td>
              <td className={styles.num}>{o.retired}</td>
              <td className={styles.num}>{o.accuracy === null ? '—' : pct(o.accuracy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

/* ---------------------------------------------------------------------- mock history */

function Mocks({ course, home, pass }: { course: string; home: Home; pass: number }) {
  return (
    <Card eyebrow="Mock history" title="Full papers sat" className={styles.block}>
      {home.mocks.length === 0 ? (
        <>
          <p className={styles.prose}>
            No full paper yet. A mock is {mockLength(course)} items under a clock, with no feedback
            until you submit — the only way to find out how your pacing holds up.
          </p>
          <div className={styles.actions}>
            <ButtonLink href={`/${course}/mock`}>Open the mock lobby</ButtonLink>
          </div>
        </>
      ) : (
        <>
          <ul className={styles.mockList}>
            {home.mocks.map((m) => {
              const passed = m.scaled >= pass
              return (
                <li key={m.id} className={styles.mockItem}>
                  <Link href={`/${course}/mock/${m.id}`} className={styles.mockLink}>
                    <span className={styles.mockDate}>
                      {new Date(m.submittedAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className={styles.mockRaw}>
                      {m.correct}/{m.items} · {pct(m.pct)}
                    </span>
                    <span className={passed ? styles.pass : styles.fail}>
                      ≈{m.scaled} / {pass}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className={styles.note}>
            The scaled figure is <strong>approximate</strong>: round(percentage × 1000). Anthropic
            does not publish its scaling, so treat it as a direction, not a verdict.
          </p>
        </>
      )}
    </Card>
  )
}

/* -------------------------------------------------------------------- bank coverage */

function Coverage({ course, home }: { course: string; home: Home }) {
  const counts = bankByDomain(course)
  const short = home.domains.filter((d) => (counts.get(d.id) ?? 0) < d.itemsInMock)

  return (
    <Card eyebrow="Bank coverage" title="Questions available per domain" className={styles.block}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Domain</th>
            <th scope="col" className={styles.num}>
              Banked
            </th>
            <th scope="col" className={styles.num}>
              In a mock
            </th>
          </tr>
        </thead>
        <tbody>
          {home.domains.map((d) => {
            const banked = counts.get(d.id) ?? 0
            return (
              <tr key={d.id} className={banked < d.itemsInMock ? styles.thin : undefined}>
                <th scope="row">
                  <span className={styles.objId}>D{d.id}</span>
                  <span className={styles.objText}>{d.name}</span>
                </th>
                <td className={styles.num}>{banked}</td>
                <td className={styles.num}>{d.itemsInMock}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className={styles.note}>
        {short.length === 0
          ? 'Every domain has enough banked items to fill a full paper.'
          : `${short.length} ${short.length === 1 ? 'domain is' : 'domains are'} under-banked (${short
              .map((d) => `D${d.id}`)
              .join(', ')}); a mock repeats items or runs short there.`}
      </p>
    </Card>
  )
}
