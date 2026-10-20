import type { ReactNode } from 'react'
import styles from './Card.module.css'

export type CardProps = {
  /** Small uppercase label above the title. */
  eyebrow?: ReactNode
  title?: ReactNode
  /** Right-aligned secondary text on the title row. */
  aside?: ReactNode
  /** Accent rule down the leading edge. For the one card that matters on a page. */
  marked?: boolean
  /** Drop the internal padding, for cards that hold their own full-bleed content. */
  flush?: boolean
  className?: string
  children?: ReactNode
}

export function Card({ eyebrow, title, aside, marked, flush, className, children }: CardProps) {
  const cls = [styles.card, flush ? styles.flush : styles.pad, marked ? styles.marked : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={cls}>
      {(title || eyebrow || aside) && (
        <header className={styles.header}>
          <div>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            {title && <h2 className={styles.title}>{title}</h2>}
          </div>
          {aside && <span className={styles.aside}>{aside}</span>}
        </header>
      )}
      {children}
    </section>
  )
}
