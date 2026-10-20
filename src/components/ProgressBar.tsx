import styles from './ProgressBar.module.css'

export type ProgressBarProps = {
  value: number
  max: number
  /** Uppercase label on the left of the caption row. */
  label?: string
  /** Right side of the caption row. Defaults to "value / max". */
  caption?: string
  /** Paint the fill in the success colour instead of the accent. */
  complete?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max,
  label,
  caption,
  complete,
  className,
}: ProgressBarProps) {
  const safeMax = Math.max(1, max)
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100))

  return (
    <div className={[styles.wrap, complete ? styles.ok : '', className ?? ''].filter(Boolean).join(' ')}>
      {(label || caption !== '') && (
        <div className={styles.row}>
          {label && <span className={styles.label}>{label}</span>}
          <span className="tabular">{caption ?? `${value} / ${max}`}</span>
        </div>
      )}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
