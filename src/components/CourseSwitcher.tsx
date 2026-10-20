'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Sections that exist under every course, so the switch can stay where you are. */
const SECTIONS = ['learn', 'practice', 'mock'] as const

export type CourseSwitcherProps = {
  courses: readonly string[]
  current: string
  className?: string
  linkClassName?: string
  activeClassName?: string
}

/**
 * PRD F2: switching course keeps you on the equivalent page. The section is carried
 * across, the rest of the path is not — a lesson slug or a session id belongs to one
 * course and means nothing in the other.
 */
export function sectionOf(pathname: string): string | null {
  const segment = pathname.split('/')[2]
  return (SECTIONS as readonly string[]).includes(segment) ? segment : null
}

export function CourseSwitcher({
  courses,
  current,
  className,
  linkClassName,
  activeClassName,
}: CourseSwitcherProps) {
  const section = sectionOf(usePathname())

  return (
    <nav className={className} aria-label="Course">
      {courses.map((name) => {
        const on = name === current
        return (
          <Link
            key={name}
            href={section ? `/${name}/${section}` : `/${name}`}
            className={[linkClassName ?? '', on ? activeClassName ?? '' : ''].filter(Boolean).join(' ')}
            aria-current={on ? 'true' : undefined}
          >
            {name}
          </Link>
        )
      })}
    </nav>
  )
}
