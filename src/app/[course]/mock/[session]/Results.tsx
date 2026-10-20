'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, ButtonLink, OptionList, Stars, STAR_CAPTION } from '@/components'
import { Markdown } from '@/lib/markdown'
import type { SafeQuestion } from '@/lib/content/types'
import { rateQuestion } from '../actions'
import {
  PASS_SCALED,
  SCALED_DISCLAIMER,
  SCALE_MAX,
  type DomainResult,
} from '../scoring'
import styles from './Results.module.css'

export type ReviewItem = {
  /** Position on the paper, 1-based. */
  number: number
  question: SafeQuestion
  chosen: string[]
  correct: boolean
  answer: string[]
  rationale: string
  distractors: Record<string, string>
  sources: { href: string; label: string }[]
  flagged: boolean
  stars: number | null
}

export type ResultsProps = {
  course: string
  correct: number
  total: number
  pct: number
  scaled: number
  timeUsed: string
  submittedAt: string
  breakdown: DomainResult[]
  review: ReviewItem[]
}

type Filter = 'all' | 'wrong' | 'flagged'

export function Results({
  course,
  correct,
  total,
  pct,
  scaled,
  timeUsed,
  submittedAt,
  breakdown,
  review,
}: ResultsProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [stars, setStars] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(review.map((r) => [r.question.id, r.stars])),
  )

  const pass = scaled >= PASS_SCALED
  const wrongCount = review.filter((r) => !r.correct).length
  const flaggedCount = review.filter((r) => r.flagged).length

  const shown = review.filter((r) =>
    filter === 'wrong' ? !r.correct : filter === 'flagged' ? r.flagged : true,
  )

  function rate(qid: string, value: number) {
    setStars((prev) => ({ ...prev, [qid]: value }))
    void rateQuestion({ course, qid, stars: value })
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: review.length },
    { key: 'wrong', label: 'Wrong', count: wrongCount },
    { key: 'flagged', label: 'Flagged', count: flaggedCount },
  ]

  return (
    <>
      <header className={styles.head}>
        <p className={styles.eyebrow}>
          {course} · submitted {new Date(submittedAt).toLocaleString()}
        </p>
        <h1 className={styles.title}>Result</h1>
      </header>

      <section className={[styles.score, pass ? styles.pass : styles.fail].join(' ')}>
        <div className={styles.scoreMain}>
          <p className={styles.raw}>
            <span className="tabular">{correct}</span>
            <span className={styles.rawOf}>/{total}</span>
          </p>
          <p className={styles.rawLabel}>raw score · {pct}%</p>
        </div>

        <div className={styles.scaled}>
          <p className={styles.scaledValue}>
            <span className="tabular">{scaled}</span>
            <span className={styles.scaledOf}>/{SCALE_MAX}</span>
          </p>
          <p className={styles.scaledLabel}>
            approximate scaled score · pass mark {PASS_SCALED}
          </p>
          <p className={styles.verdict}>{pass ? 'Above the pass mark' : 'Below the pass mark'}</p>
        </div>

        <div className={styles.time}>
          <p className={styles.timeValue}>{timeUsed}</p>
          <p className={styles.timeLabel}>time used</p>
        </div>
      </section>

      <p className={styles.disclaimer}>{SCALED_DISCLAIMER}</p>

      <section className={styles.block} aria-labelledby="domains-h">
        <h2 id="domains-h" className={styles.h2}>
          By domain
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col" className={styles.num}>
                  Items
                </th>
                <th scope="col" className={styles.num}>
                  Correct
                </th>
                <th scope="col" className={styles.num}>
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((d) => (
                <tr key={d.domain}>
                  <th scope="row" className={styles.rowHead}>
                    <span className={styles.dNum}>D{d.domain}</span> {d.name}
                  </th>
                  <td className={`${styles.num} tabular`}>{d.items}</td>
                  <td className={`${styles.num} tabular`}>{d.correct}</td>
                  <td className={`${styles.num} tabular`}>
                    <span className={styles.bar} style={{ '--pct': `${d.pct}%` } as React.CSSProperties}>
                      {d.pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.block} aria-labelledby="review-h">
        <div className={styles.reviewHead}>
          <h2 id="review-h" className={styles.h2}>
            Review
          </h2>
          <div className={styles.filters} role="group" aria-label="Filter review">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={[styles.filter, filter === f.key ? styles.filterOn : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
              >
                {f.label} <span className={styles.filterCount}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className={styles.empty}>
            {filter === 'wrong' ? 'Nothing wrong on this paper.' : 'You flagged nothing.'}
          </p>
        ) : (
          <ol className={styles.items}>
            {shown.map((r) => (
              <li
                key={r.question.id}
                className={[styles.item, r.correct ? styles.itemOk : styles.itemNo].join(' ')}
              >
                <div className={styles.itemHead}>
                  <span className={styles.itemNum}>Q{r.number}</span>
                  <span className={styles.itemMeta}>
                    D{r.question.domain} · {r.question.objective} · {r.question.id}
                  </span>
                  {r.flagged && <span className={styles.chipFlag}>flagged</span>}
                  <span className={r.correct ? styles.chipOk : styles.chipNo}>
                    {r.correct ? 'correct' : r.chosen.length ? 'wrong' : 'blank'}
                  </span>
                </div>

                <Markdown className={styles.stem}>{r.question.stem}</Markdown>

                <OptionList
                  options={r.question.options}
                  select={r.question.select}
                  value={r.chosen}
                  graded={{ answer: r.answer, distractors: r.distractors }}
                  name={`review-${r.question.id}`}
                  className={styles.options}
                />

                {r.rationale && (
                  <div className={styles.rationale}>
                    <h3 className={styles.rationaleH}>Why</h3>
                    <Markdown className={styles.rationaleBody}>{r.rationale}</Markdown>
                  </div>
                )}

                {r.sources.length > 0 && (
                  <p className={styles.sources}>
                    <span className={styles.sourcesLabel}>Source</span>
                    {r.sources.map((s) => (
                      <Link key={s.href} href={s.href} className={styles.source}>
                        {s.label}
                      </Link>
                    ))}
                  </p>
                )}

                <Stars
                  value={stars[r.question.id] ?? null}
                  onChange={(value) => rate(r.question.id, value)}
                  caption={STAR_CAPTION}
                  className={styles.stars}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className={styles.foot}>
        <ButtonLink href={`/${course}/mock`} variant="primary">
          Back to the lobby
        </ButtonLink>
        <ButtonLink href={`/${course}`} variant="ghost">
          Home
        </ButtonLink>
        <Button className={styles.top} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to top
        </Button>
      </div>
    </>
  )
}
