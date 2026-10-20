'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Nav.module.css'

export type NavItem = {
  href: string
  label: string
  /** Match only this exact path. Otherwise any sub-path counts as active. */
  exact?: boolean
}

export type NavProps = {
  items: NavItem[]
  className?: string
  'aria-label'?: string
}

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function Nav({ items, className, 'aria-label': ariaLabel = 'Sections' }: NavProps) {
  const pathname = usePathname()

  return (
    <nav className={[styles.nav, className ?? ''].filter(Boolean).join(' ')} aria-label={ariaLabel}>
      {items.map((item) => {
        const active = isActive(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[styles.link, active ? styles.active : ''].filter(Boolean).join(' ')}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
