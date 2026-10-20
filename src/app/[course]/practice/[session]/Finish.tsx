import { Button, ButtonLink, Card } from '@/components'
import { Markdown } from '@/lib/markdown'
import { archivePractice } from '../actions'
import type { DomainScore } from '../helpers'
import styles from './Finish.module.css'

export type WrongItem = {
  qid: string
  /** 1-based position in the set, so the link can go straight back to it. */
  number: number
  objective: string
  stem: string
}

export type FinishProps = {
  course: string
  sessionId: string
  total: number
  correct: number
  answered: number
  breakdown: DomainScore[]
  wrong: WrongItem[]
}

export function Finish({
  course,
  sessionId,
  total,
  correct,
  answered,
  breakdown,
  wrong,
}: FinishProps) {
  const pct = total ? Math.round((correct / total) * 100) : 0
  const complete = answered >= total

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{course} · practice set</p>
        <h1 className={styles.score}>
          <span className="tabular">{correct}</span>
          <span className={styles.of}>/ {total}</span>
        </h1>
        <p className={styles.pct}>
          <span className="tabular">{pct}%</span>
          {complete ? ' · set complete' : ` · ${total - answered} still unanswered`}
        </p>
      </header>

      <Card eyebrow="By domain" title="Where the marks went">
        <ul className={styles.domains}>
          {breakdown.map((d) => (
            <li key={d.domain} className={styles.domain}>
              <span className={styles.domainName}>
                <span className={styles.domainId}>D{d.domain}</span> {d.name}
              </span>
              <span className={styles.bar} aria-hidden="true">
                <span
                  className={styles.barFill}
                  style={{ width: `${d.total ? (d.correct / d.total) * 100 : 0}%` }}
                />
              </span>
              <span className={`${styles.domainScore} tabular`}>
                {d.correct}/{d.total}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        eyebrow="Review"
        title={wrong.length ? `${wrong.length} to go back over` : 'Nothing wrong'}
        marked={wrong.length > 0}
      >
        {wrong.length === 0 ? (
          <p className={styles.clean}>
            Every question you answered in this set was correct. Two in a row retires a
            question, so some of these will drop out of the “due” filter.
          </p>
        ) : (
          <ol className={styles.wrong}>
            {wrong.map((w) => (
              <li key={w.qid} className={styles.wrongItem}>
                <a
                  className={styles.wrongLink}
                  href={`/${course}/practice/${sessionId}?q=${w.number}`}
                >
                  <span className={styles.wrongMeta}>
                    <span className="tabular">#{w.number}</span>
                    <span className={styles.wrongQid}>{w.qid}</span>
                    <span>{w.objective}</span>
                  </span>
                  <Markdown className={styles.wrongStem}>{firstLine(w.stem)}</Markdown>
                </a>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <footer className={styles.actions}>
        <form
          action={async () => {
            'use server'
            await archivePractice(course, sessionId)
          }}
        >
          <Button type="submit" variant="primary" size="lg">
            Start another set
          </Button>
        </form>

        <ButtonLink href={`/${course}`} variant="ghost">
          Back to home
        </ButtonLink>
      </footer>
    </div>
  )
}

/** Stems can be several paragraphs; the review list only needs the question itself. */
function firstLine(stem: string): string {
  const line = stem
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .pop()
  return line ?? stem
}
