'use client'

import { useEffect, useRef, useState } from 'react'
import type { Heading } from '@/lib/content/lessons'
import styles from './Toc.module.css'

/** Matches `scroll-margin-top` on the headings: the sticky header's height plus air. */
const OFFSET = 96

/**
 * Sticky table of contents with scroll-spy. On narrow screens the same list collapses
 * into a disclosure pinned under the header, so a 160 KB lesson still has a way out.
 */
export function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string>(headings[0]?.id ?? '')
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (headings.length === 0) return

    let frame = 0
    const spy = () => {
      frame = 0
      let current = headings[0].id
      for (const h of headings) {
        const el = document.getElementById(h.id)
        if (!el) continue
        if (el.getBoundingClientRect().top - OFFSET <= 1) current = h.id
        else break
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(spy)
    }

    spy()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [headings])

  // Keep the current entry visible in a long rail without moving the page itself.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(active)}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (headings.length === 0) return null

  const list = (
    <ul className={styles.list} ref={listRef}>
      {headings.map((h, i) => (
        <li key={`${h.id}-${i}`} data-id={h.id}>
          <a
            href={`#${h.id}`}
            className={[
              styles.link,
              h.depth === 3 ? styles.sub : '',
              h.id === active ? styles.on : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={h.id === active ? 'location' : undefined}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  )

  const current = headings.find((h) => h.id === active)?.text ?? headings[0].text

  return (
    <>
      <details className={styles.disclosure}>
        <summary className={styles.summary}>
          <span className={styles.summaryLabel}>Contents</span>
          <span className={styles.summaryCurrent}>{current}</span>
        </summary>
        <div
          className={styles.disclosureBody}
          onClick={(e) => {
            // Close once a section is picked; a list left open would cover the target.
            if ((e.target as HTMLElement).closest('a')) {
              ;(e.currentTarget.parentElement as HTMLDetailsElement).open = false
            }
          }}
        >
          {list}
        </div>
      </details>

      <nav className={styles.rail} aria-label="On this page">
        <p className={styles.railHead}>On this page</p>
        {list}
      </nav>
    </>
  )
}
