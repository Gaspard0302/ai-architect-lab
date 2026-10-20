'use client'

import { useState } from 'react'
import styles from './Stars.module.css'

/** PRD F11. One fixed label per star; these are the words the learner is rating with. */
export const STAR_LABELS = [
  'Broken — wrong key or nonsense',
  'Unfair — ambiguous or trivia',
  'OK, not exam-like',
  'Good exam question',
  'Could be on the real paper',
] as const

/**
 * PRD F11's nudge line, verbatim. Practice and mock review show the same sentence; this
 * constant is the single source of it.
 */
export const STAR_CAPTION =
  'Rate this question. 1–2 stars get rewritten, 5 stars become the model for new ones.'

export type StarsProps = {
  /** 1–5, or 0/null for unrated. Controlled: the parent owns this. */
  value: number | null
  onChange: (stars: number) => void
  /** One label per star, lowest first. Shown on hover and printed once chosen. */
  labels?: readonly string[]
  /** The nudge line above the row. */
  caption?: string
  disabled?: boolean
  className?: string
}

function Star({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill={lit ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M12 3.2l2.62 5.83 6.38.72-4.75 4.3 1.3 6.25L12 17.1 6.45 20.3l1.3-6.25L3 9.75l6.38-.72z" />
    </svg>
  )
}

export function Stars({
  value,
  onChange,
  labels = STAR_LABELS,
  caption,
  disabled,
  className,
}: StarsProps) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0
  const label = shown ? labels[shown - 1] : null

  return (
    <div className={[styles.wrap, className ?? ''].filter(Boolean).join(' ')}>
      {caption && <p className={styles.caption}>{caption}</p>}

      <fieldset className={styles.row} onMouseLeave={() => setHover(null)}>
        <legend className="srOnly">Rate this question, 1 to 5 stars</legend>
        {labels.map((text, i) => {
          const star = i + 1
          return (
            <button
              key={star}
              type="button"
              className={[styles.star, star <= shown ? styles.lit : ''].filter(Boolean).join(' ')}
              aria-label={`${star} — ${text}`}
              aria-pressed={value === star}
              title={text}
              disabled={disabled}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onBlur={() => setHover(null)}
              onClick={() => onChange(star)}
            >
              <Star lit={star <= shown} />
            </button>
          )
        })}
      </fieldset>

      <p className={[styles.label, label ? '' : styles.pending].filter(Boolean).join(' ')} aria-live="polite">
        {label ? (
          <>
            <strong>{shown}</strong> · {label}
          </>
        ) : (
          'Not rated'
        )}
      </p>
    </div>
  )
}
