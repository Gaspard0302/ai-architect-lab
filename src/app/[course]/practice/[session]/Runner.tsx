'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Button, ButtonLink, OptionList, ProgressBar, Stars, STAR_CAPTION, STAR_LABELS } from '@/components'
import type { Term } from '@/lib/content/glossary'
import type { SafeQuestion } from '@/lib/content/types'
import type { Graded } from '@/lib/grade'
import { Markdown, sourceHref, sourceLabel } from '@/lib/markdown'
import { answer, rate } from '../actions'
import styles from './Runner.module.css'

export type RunnerProps = {
  course: string
  sessionId: string
  /** 0-based position in the set. */
  index: number
  total: number
  /** No answer key: this is the only shape allowed to cross to the browser. */
  question: SafeQuestion
  /** Glossary entries named in the stem, matched on the server. */
  terms: Term[]
  /** Present when this question has already been answered; the set is then locked. */
  initial: { chosen: string[]; graded: Graded } | null
  rating: number | null
  answered: number
  correct: number
}

export function Runner({
  course,
  sessionId,
  index,
  total,
  question,
  terms,
  initial,
  rating,
  answered,
  correct,
}: RunnerProps) {
  const [chosen, setChosen] = useState<string[]>(initial?.chosen ?? [])
  const [graded, setGraded] = useState<Graded | null>(initial?.graded ?? null)
  const [stars, setStars] = useState<number | null>(rating)
  const [error, setError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()
  const [, startRate] = useTransition()

  // Time on question, measured from the moment this question mounts in the browser.
  const mountedAt = useRef(Date.now())
  useEffect(() => {
    mountedAt.current = Date.now()
  }, [question.id])

  // Reset on navigation by comparing props to state during render rather than in an
  // effect: a revalidation after answering re-renders with a new `initial` object every
  // time, and an effect keyed on that would keep wiping the optimistic star.
  const [shownId, setShownId] = useState(question.id)
  if (shownId !== question.id) {
    setShownId(question.id)
    setChosen(initial?.chosen ?? [])
    setGraded(initial?.graded ?? null)
    setStars(rating)
    setError(null)
  }

  const locked = graded !== null
  const ready = chosen.length === question.select
  const answeredNow = answered + (locked && !initial ? 1 : 0)
  const correctNow = correct + (locked && !initial && graded.correct ? 1 : 0)

  const base = `/${course}/practice/${sessionId}`
  const backHref = index > 0 ? `${base}?q=${index}` : null
  const nextHref = index + 1 < total ? `${base}?q=${index + 2}` : `${base}?done=1`

  function submit() {
    if (!ready || locked) return
    const ms = Date.now() - mountedAt.current
    setError(null)
    startSubmit(async () => {
      try {
        const result = await answer(sessionId, question.id, chosen, ms)
        setChosen(result.chosen)
        setGraded(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not record that answer.')
      }
    })
  }

  function pickStars(next: number) {
    const previous = stars
    setStars(next) // optimistic: one tap, no confirm, never blocks Next
    startRate(async () => {
      try {
        await rate(course, question.id, next)
      } catch {
        setStars(previous)
        setError('Could not save that rating.')
      }
    })
  }

  return (
    <article className={styles.wrap}>
      <header className={styles.head}>
        <ProgressBar
          value={index + 1}
          max={total}
          label={`Question ${index + 1} of ${total}`}
          caption={`${correctNow} correct · ${answeredNow} answered`}
        />
        <p className={styles.meta}>
          <span className={styles.qid}>{question.id}</span>
          <span>Domain {question.domain}</span>
          <span>{question.objective}</span>
        </p>
      </header>

      <div className={styles.card}>
        <Markdown className={styles.stem}>{question.stem}</Markdown>

        {/* Closed by default: some definitions state the very distinction being tested. */}
        {terms.length > 0 && (
          <details key={question.id} className={styles.terms}>
            <summary className={styles.sectionTitle}>Terms in this question ({terms.length})</summary>
            <dl className={styles.termList}>
              {terms.map((t) => (
                <div key={t.id}>
                  <dt className={styles.term}>{t.term}</dt>
                  <dd>
                    <Markdown className={styles.prose}>{t.definition}</Markdown>
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        <OptionList
          className={styles.options}
          options={question.options}
          select={question.select}
          value={chosen}
          onChange={setChosen}
          graded={graded ? { answer: graded.answer, distractors: graded.distractors } : null}
          name={question.id}
        />

        {!locked && (
          <div className={styles.submitRow}>
            <Button variant="primary" size="lg" onClick={submit} disabled={!ready || submitting}>
              {submitting ? 'Grading…' : 'Submit answer'}
            </Button>
            {!ready && (
              <span className={styles.submitHint}>
                {question.select > 1
                  ? `Choose ${question.select} options to submit.`
                  : 'Choose an option to submit.'}
              </span>
            )}
          </div>
        )}

        {graded && (
          <section className={styles.verdictBlock}>
            <p className={[styles.verdict, graded.correct ? styles.ok : styles.no].join(' ')}>
              <span className={styles.verdictMark} aria-hidden="true">
                {graded.correct ? '✓' : '✕'}
              </span>
              {graded.correct ? 'Correct' : 'Not correct'}
              <span className={styles.verdictKey}>Key · {graded.answer.join(' + ')}</span>
            </p>

            {graded.rationale && (
              <div className={styles.rationale}>
                <h2 className={styles.sectionTitle}>Why</h2>
                <Markdown className={styles.prose}>{graded.rationale}</Markdown>
              </div>
            )}

            {graded.sources.length > 0 && (
              <div className={styles.sources}>
                <h2 className={styles.sectionTitle}>Read it in the course</h2>
                <ul className={styles.sourceList}>
                  {graded.sources.map((s) => (
                    <li key={s}>
                      <Link href={sourceHref(course, s)}>{sourceLabel(s)}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className={styles.rating}>
              <Stars
                value={stars}
                onChange={pickStars}
                labels={STAR_LABELS}
                caption={STAR_CAPTION}
              />
            </div>
          </section>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>

      <nav className={styles.nav} aria-label="Set navigation">
        {backHref ? (
          <ButtonLink href={backHref} variant="ghost" scroll={false}>
            ← Back
          </ButtonLink>
        ) : (
          <span />
        )}

        <ButtonLink
          href={nextHref}
          variant={graded ? 'primary' : 'secondary'}
          scroll={false}
        >
          {index + 1 < total ? 'Next →' : 'Finish set →'}
        </ButtonLink>
      </nav>
    </article>
  )
}
