'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components'
import { PRACTICE_SET_SIZE, type Status } from '@/lib/select'
import { startPractice } from './actions'
import {
  countMatching,
  STATUSES,
  STATUS_HINTS,
  STATUS_LABELS,
  type CatalogItem,
} from './helpers'
import styles from './FilterForm.module.css'

export type DomainOption = {
  id: number
  name: string
  objectives: { id: string; text: string }[]
}

export function FilterForm({
  course,
  catalog,
  domains,
}: {
  course: string
  catalog: CatalogItem[]
  domains: DomainOption[]
}) {
  const [status, setStatus] = useState<Status>('all')
  const [domain, setDomain] = useState<number | null>(null)
  const [objective, setObjective] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // The objective list narrows to the chosen domain; choosing a domain that no longer
  // contains the selected objective clears it rather than leaving a contradiction.
  const objectives = useMemo(
    () => (domain == null ? domains : domains.filter((d) => d.id === domain)).flatMap((d) => d.objectives),
    [domains, domain],
  )

  const filters = { status, domain, objective }
  const matched = countMatching(catalog, filters)
  const setSize = Math.min(PRACTICE_SET_SIZE, matched)

  const perStatus = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((s) => [s, countMatching(catalog, { status: s, domain, objective })]),
      ) as Record<Status, number>,
    [catalog, domain, objective],
  )

  function pickDomain(next: number | null) {
    setDomain(next)
    if (next != null && objective && !domains.find((d) => d.id === next)?.objectives.some((o) => o.id === objective)) {
      setObjective(null)
    }
  }

  function pickObjective(next: string | null) {
    setObjective(next)
    if (next) {
      const owner = domains.find((d) => d.objectives.some((o) => o.id === next))
      if (owner) setDomain(owner.id)
    }
  }

  return (
    <form
      className={styles.form}
      action={() => {
        start(async () => {
          await startPractice(course, filters)
        })
      }}
    >
      <fieldset className={styles.field}>
        <legend className={styles.legend}>Status</legend>
        <div className={styles.segments}>
          {STATUSES.map((s) => (
            <label
              key={s}
              className={[styles.segment, s === status ? styles.segmentOn : ''].filter(Boolean).join(' ')}
              title={STATUS_HINTS[s]}
            >
              <input
                type="radio"
                name="status"
                value={s}
                checked={s === status}
                onChange={() => setStatus(s)}
                className="srOnly"
              />
              <span className={styles.segmentLabel}>{STATUS_LABELS[s]}</span>
              <span className={`${styles.segmentCount} tabular`}>{perStatus[s]}</span>
            </label>
          ))}
        </div>
        <p className={styles.hint}>{STATUS_HINTS[status]}</p>
      </fieldset>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.legend}>Domain</span>
          <select
            className={styles.select}
            value={domain ?? ''}
            onChange={(e) => pickDomain(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Every domain</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} · {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.legend}>Objective</span>
          <select
            className={styles.select}
            value={objective ?? ''}
            onChange={(e) => pickObjective(e.target.value || null)}
          >
            <option value="">
              {domain == null ? 'Every objective' : 'Every objective in this domain'}
            </option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.text}
              </option>
            ))}
          </select>
        </label>
      </div>

      <footer className={styles.footer}>
        <p className={styles.count} aria-live="polite">
          <strong className="tabular">{matched}</strong>{' '}
          {matched === 1 ? 'question matches' : 'questions match'}
          {matched > PRACTICE_SET_SIZE && (
            <span className={styles.countSub}> · {PRACTICE_SET_SIZE} drawn at random</span>
          )}
        </p>

        <Button type="submit" variant="primary" size="lg" disabled={pending || matched === 0}>
          {pending ? 'Drawing…' : matched === 0 ? 'Nothing to draw' : `Start ${setSize} questions`}
        </Button>
      </footer>
    </form>
  )
}
