'use client'

import { MarkdownInline } from '@/lib/markdown'
import styles from './OptionList.module.css'

/** What the list needs to paint a graded question. Named for the view, not the grader:
 *  `@/lib/grade` exports its own richer `Graded`. */
export type GradedView = {
  /** The key. Present only once the question has been submitted. */
  answer: string[]
  /** Per-option note explaining why the trap was tempting. */
  distractors?: Record<string, string>
}

export type OptionListProps = {
  /** Option letter → option text, as authored (A–E). */
  options: Record<string, string>
  /** How many must be chosen. 1 renders radios, more renders checkboxes. */
  select: number
  /** Chosen option letters. Controlled. */
  value: string[]
  /** Omit only when `graded` is set: a graded list is locked and never calls back. */
  onChange?: (chosen: string[]) => void
  /** Non-null once graded: locks the list and paints correct / wrong states. */
  graded?: GradedView | null
  disabled?: boolean
  /** Radio group name. Defaults to the question id when one is given. */
  name?: string
  className?: string
}

export function OptionList({
  options,
  select,
  value,
  onChange,
  graded = null,
  disabled,
  name = 'options',
  className,
}: OptionListProps) {
  const multi = select > 1
  const locked = Boolean(graded) || Boolean(disabled)
  const keys = Object.keys(options)

  function toggle(key: string) {
    if (locked || !onChange) return
    if (!multi) return onChange([key])
    if (value.includes(key)) return onChange(value.filter((k) => k !== key))
    if (value.length >= select) return
    onChange([...value, key])
  }

  return (
    <div className={className}>
      <p className={styles.hint}>
        {multi ? `Select ${select}` : 'Select one'}
        {multi && !graded ? ` · ${value.length} chosen` : ''}
      </p>

      <fieldset className={styles.list}>
        <legend className="srOnly">Answer options</legend>
        {keys.map((key) => {
          const chosen = value.includes(key)
          const isKey = graded?.answer.includes(key) ?? false
          const state = graded ? (isKey ? styles.correct : chosen ? styles.wrong : '') : chosen ? styles.chosen : ''
          const note = graded && !isKey ? graded.distractors?.[key] : undefined

          return (
            <label
              key={key}
              className={[styles.option, state, locked ? styles.locked : ''].filter(Boolean).join(' ')}
            >
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={name}
                value={key}
                checked={chosen}
                disabled={locked}
                onChange={() => toggle(key)}
              />
              <span className={styles.key} aria-hidden="true">
                {key}
              </span>
              <span className={styles.body}>
                <MarkdownInline className={styles.text}>{options[key]}</MarkdownInline>
                {graded && (isKey || chosen) && (
                  <span className={styles.mark}>
                    {isKey ? (chosen ? ' key · you chose this' : ' key') : ' you chose this'}
                  </span>
                )}
                {note && <MarkdownInline className={styles.note}>{note}</MarkdownInline>}
              </span>
            </label>
          )
        })}
      </fieldset>
    </div>
  )
}
