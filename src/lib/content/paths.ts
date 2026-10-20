import 'server-only'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { notFound } from 'next/navigation'

/** Absolute path of courses/ — the app runs from the repo root. */
export const COURSES_DIR = join(process.cwd(), 'courses')

let cached: string[] | null = null

/**
 * The course names that exist on disk. This is the whitelist: nothing else may reach
 * the filesystem helpers, so a `[course]` route segment can never traverse out.
 */
export function courseNames(): string[] {
  if (!cached) {
    cached = readdirSync(COURSES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  }
  return cached
}

export function isCourse(name: string): boolean {
  return courseNames().includes(name)
}

/** Absolute path of one course's directory. Throws on an unknown course. */
export function courseRoot(course: string): string {
  if (!isCourse(course)) throw new Error(`unknown course: ${course}`)
  return join(COURSES_DIR, course)
}

/** Memoise a loader per course, in module scope. */
export function perCourse<T>(load: (course: string) => T): (course: string) => T {
  const store = new Map<string, T>()
  return (course: string) => {
    if (!store.has(course)) store.set(course, load(course))
    return store.get(course)!
  }
}

/**
 * Validate a `[course]` route segment. 404s instead of throwing, so every page and
 * layout under src/app/[course]/ can open with `const course = requireCourse(raw)`.
 */
export function requireCourse(course: string): string {
  if (!isCourse(course)) notFound()
  return course
}
