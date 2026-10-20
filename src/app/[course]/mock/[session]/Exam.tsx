'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, OptionList, ProgressBar, Timer } from '@/components'
import { Markdown } from '@/lib/markdown'
import type { SafeQuestion } from '@/lib/content/types'
import { saveAnswer, submitMock, toggleFlag } from '../actions'
import styles from './Exam.module.css'

export type ExamProps = {
  course: string
  sessionId: string
  /** ISO. Computed server-side from started_at + time_limit_s. */
  deadline: string
  /** One entry per slot, in paper order. A thin bank may repeat a question. */
  paper: SafeQuestion[]
  /** qid → option letters already recorded. No verdicts: this is all the client knows. */
  initialChosen: Record<string, string[]>
  initialFlagged: string[]
}

export function Exam({
  course,
  sessionId,
  deadline,
  paper,
  initialChosen,
  initialFlagged,
}: ExamProps) {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<Record<string, string[]>>(initialChosen)
  const [flags, setFlags] = useState<string[]>(initialFlagged)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  const current = paper[idx]
  const total = paper.length

  // Time on question, accumulated per qid and sent with every save.
  const spent = useRef<Record<string, number>>({})
  const enteredAt = useRef<number>(Date.now())
  useEffect(() => {
    enteredAt.current = Date.now()
  }, [idx])

  const msFor = (qid: string) =>
    (spent.current[qid] ?? 0) + (Date.now() - enteredAt.current)

  const finish = useCallback(() => {
    startTransition(async () => {
      await submitMock({ course, sessionId })
      router.refresh()
    })
  }, [course, sessionId, router])

  // Expiry is authoritative on the server; this only gets the learner to the results
  // page without a manual refresh.
  const onExpire = useCallback(() => finish(), [finish])

  async function choose(next: string[]) {
    if (!current) return
    const qid = current.id
    spent.current[qid] = msFor(qid)
    enteredAt.current = Date.now()

    setChosen((prev) => ({ ...prev, [qid]: next }))
    setStatus('saving')

    const result = await saveAnswer({
      course,
      sessionId,
      qid,
      chosen: next,
      ms: spent.current[qid],
    })

    if ('expired' in result) return finish()
    setStatus('ok' in result ? 'saved' : 'error')
  }

  async function flag() {
    if (!current) return
    const qid = current.id
    const on = !flags.includes(qid)
    setFlags((prev) => (on ? [...prev, qid] : prev.filter((f) => f !== qid)))

    const result = await toggleFlag({ course, sessionId, qid, flagged: on })
    if ('expired' in result) finish()
  }

  const answeredSlots = paper.filter((q) => (chosen[q.id]?.length ?? 0) > 0).length
  const unanswered = total - answeredSlots

  if (!current) {
    return <p className={styles.empty}>This paper has no questions. Abandon it and draw a new one.</p>
  }

  const value = chosen[current.id] ?? []

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.barLeft}>
          <span className={styles.eyebrow}>{course} · mock</span>
          <span className={styles.count}>
            <strong className="tabular">{idx + 1}</strong>
            <span className={styles.of}>/{total}</span>
          </span>
        </div>
        <Timer deadline={deadline} onExpire={onExpire} warnAtS={600} className={styles.clock} />
      </header>

      <ProgressBar
        value={answeredSlots}
        max={total}
        label="Answered"
        caption={`${answeredSlots} / ${total}`}
        className={styles.progress}
      />

      <div className={styles.body}>
        <article className={styles.paper} aria-live="polite">
          <div className={styles.stemHead}>
            <span className={styles.qid}>Q{idx + 1}</span>
            <span className={styles.meta}>
              D{current.domain} · {current.objective}
            </span>
            <button
              type="button"
              className={[styles.flag, flags.includes(current.id) ? styles.flagOn : '']
                .filter(Boolean)
                .join(' ')}
              onClick={flag}
              aria-pressed={flags.includes(current.id)}
            >
              {flags.includes(current.id) ? 'Flagged' : 'Flag for review'}
            </button>
          </div>

          <Markdown className={styles.stem}>{current.stem}</Markdown>

          <OptionList
            options={current.options}
            select={current.select}
            value={value}
            onChange={choose}
            name={current.id}
            className={styles.options}
          />

          <p className={styles.noFeedback} role="status">
            {status === 'saving' && 'Saving…'}
            {status === 'saved' && 'Saved. No marking until you submit.'}
            {status === 'error' && 'That answer did not save. Try again.'}
            {status === 'idle' && 'Nothing is marked right or wrong until you submit.'}
          </p>

          <nav className={styles.moves} aria-label="Move through the paper">
            <Button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
              ← Previous
            </Button>
            <Button
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              disabled={idx === total - 1}
              variant="primary"
            >
              Next →
            </Button>
          </nav>
        </article>

        <aside className={styles.side}>
          <h2 className={styles.sideTitle}>Navigator</h2>
          <ol className={styles.grid}>
            {paper.map((q, i) => {
              const answered = (chosen[q.id]?.length ?? 0) > 0
              const isFlagged = flags.includes(q.id)
              const cls = [
                styles.cell,
                i === idx ? styles.cellCurrent : '',
                answered ? styles.cellAnswered : styles.cellBlank,
                isFlagged ? styles.cellFlagged : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <li key={`${q.id}-${i}`}>
                  <button
                    type="button"
                    className={cls}
                    onClick={() => setIdx(i)}
                    aria-current={i === idx ? 'true' : undefined}
                    aria-label={`Question ${i + 1}${answered ? ', answered' : ', blank'}${
                      isFlagged ? ', flagged' : ''
                    }`}
                  >
                    {i + 1}
                  </button>
                </li>
              )
            })}
          </ol>

          <ul className={styles.legend}>
            <li>
              <span className={`${styles.swatch} ${styles.cellAnswered}`} /> answered
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.cellBlank}`} /> blank
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.cellFlagged}`} /> flagged
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.cellCurrent}`} /> current
            </li>
          </ul>

          <Button variant="primary" block onClick={() => setConfirming(true)} disabled={pending}>
            Submit exam
          </Button>
        </aside>
      </div>

      {confirming && (
        <div className={styles.scrim} role="dialog" aria-modal="true" aria-labelledby="confirm-h">
          <div className={styles.dialog}>
            <h2 id="confirm-h" className={styles.dialogTitle}>
              Submit this paper?
            </h2>
            <p className={styles.dialogBody}>
              {unanswered === 0
                ? `All ${total} questions answered. Submitting ends the sitting and shows the key.`
                : `${unanswered} of ${total} question${unanswered === 1 ? '' : 's'} left blank. ` +
                  'Blank counts as wrong. Submitting ends the sitting; you cannot come back to it.'}
            </p>
            <div className={styles.dialogActions}>
              <Button onClick={() => setConfirming(false)} disabled={pending}>
                Keep working
              </Button>
              <Button variant="primary" onClick={finish} disabled={pending}>
                {pending ? 'Submitting…' : 'Submit exam'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
