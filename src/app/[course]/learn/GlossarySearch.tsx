'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './GlossarySearch.module.css'

export type GlossaryItem = {
  id: string
  term: string
  /** term + definition, lowercased once on the server so filtering is a substring test. */
  search: string
  modules: { label: string; href: string | null }[]
  /** Definition rendered on the server, so react-markdown stays out of this bundle. */
  body: ReactNode
}

/**
 * The whole glossary ships as props (86 terms at most) and filtering is local: typing
 * must not cost a round trip. `?q=` is kept in sync with replaceState so a search is
 * linkable without re-rendering the route.
 */
export function GlossarySearch({ items }: { items: GlossaryItem[] }) {
  const initial = useSearchParams().get('q') ?? ''
  const [q, setQ] = useState(initial)

  useEffect(() => {
    const url = new URL(window.location.href)
    if (q) url.searchParams.set('q', q)
    else url.searchParams.delete('q')
    window.history.replaceState(null, '', url)
  }, [q])

  const needle = q.trim().toLowerCase()
  const shown = useMemo(
    () => (needle ? items.filter((t) => t.search.includes(needle)) : items),
    [items, needle],
  )

  return (
    <section className={styles.panel} id="glossary">
      <header className={styles.head}>
        <div>
          <span className={styles.eyebrow}>Glossary</span>
          <h2 className={styles.title}>{items.length} terms</h2>
        </div>

        <div className={styles.searchWrap}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search terms and definitions"
            aria-label="Search the glossary"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className={styles.count} aria-live="polite">
            {shown.length} shown
          </span>
        </div>
      </header>

      {shown.length === 0 ? (
        <p className={styles.empty}>
          Nothing matches <strong>{q}</strong>.
        </p>
      ) : (
        <dl className={styles.list}>
          {shown.map((t) => (
            <div key={t.id} className={styles.entry} id={`term-${t.id}`}>
              <dt className={styles.term}>
                {t.term}
                {t.modules.length > 0 && (
                  <span className={styles.modules}>
                    {t.modules.map((m) =>
                      m.href ? (
                        <Link key={m.label} href={m.href} className={styles.moduleLink}>
                          {m.label}
                        </Link>
                      ) : (
                        <span key={m.label} className={styles.moduleLink}>
                          {m.label}
                        </span>
                      ),
                    )}
                  </span>
                )}
              </dt>
              <dd className={styles.definition}>{t.body}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
