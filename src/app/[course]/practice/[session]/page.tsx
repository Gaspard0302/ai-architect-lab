import { notFound, redirect } from 'next/navigation'
import { questions as bankQuestions } from '@/lib/content/bank'
import { glossary } from '@/lib/content/glossary'
import { domains } from '@/lib/content/objectives'
import { requireCourse } from '@/lib/content/paths'
import { db, type AttemptDbRow, type RatingRow, type SessionRow } from '@/lib/db'
import { grade, toSafeQuestion } from '@/lib/grade'
import { requireUserId } from '@/lib/session'
import { termsIn } from '@/lib/terms'
import { domainBreakdown, resolvePosition } from '../helpers'
import { Finish } from './Finish'
import { Runner } from './Runner'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Practice set' }

type Params = { course: string; session: string }
type Search = { q?: string; done?: string }

export default async function PracticeSetPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}) {
  const { course: rawCourse, session: sessionId } = await params
  const course = requireCourse(rawCourse)
  const search = await searchParams

  const userId = await requireUserId()

  // Every read is scoped to the signed-in user: the session id in the URL is a claim,
  // not a credential.
  const { data: sessionData, error } = await db()
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .eq('course', course)
    .eq('kind', 'practice')
    .maybeSingle()

  if (error) throw new Error(error.message)
  const session = sessionData as SessionRow | null
  if (!session) notFound()

  const items = bankQuestions(course, session.question_ids)
  const ids = items.map((q) => q.id)

  const [attemptsResult, ratingsResult] = await Promise.all([
    db()
      .from('attempts')
      .select('qid, chosen, correct, ms, created_at')
      .eq('user_id', userId)
      .eq('session_id', sessionId),
    // Scoped by course as well as user: qids are only unique within a course, and the
    // ratings table is keyed on (user_id, qid).
    db()
      .from('ratings')
      .select('qid, stars')
      .eq('user_id', userId)
      .eq('course', course)
      .in('qid', ids.length ? ids : ['']),
  ])

  if (attemptsResult.error) throw new Error(attemptsResult.error.message)

  const attempts = new Map(
    ((attemptsResult.data ?? []) as Pick<AttemptDbRow, 'qid' | 'chosen' | 'correct'>[]).map((a) => [
      a.qid,
      a,
    ]),
  )
  const ratings = new Map(
    ((ratingsResult.data ?? []) as Pick<RatingRow, 'qid' | 'stars'>[]).map((r) => [r.qid, r.stars]),
  )

  const answeredIds = new Set(attempts.keys())
  const correctCount = [...attempts.values()].filter((a) => a.correct).length
  const position = resolvePosition(ids, answeredIds, search)

  if (position.kind === 'finish') {
    const names = new Map(domains(course).map((d) => [d.id, d.name]))
    const correctByQid = new Map([...attempts].map(([qid, a]) => [qid, a.correct]))

    return (
      <Finish
        course={course}
        sessionId={sessionId}
        total={ids.length}
        correct={correctCount}
        answered={answeredIds.size}
        breakdown={domainBreakdown(items, correctByQid, names)}
        wrong={items
          .map((q, i) => ({ q, i }))
          .filter(({ q }) => attempts.get(q.id)?.correct === false)
          .map(({ q, i }) => ({
            qid: q.id,
            number: i + 1,
            objective: q.objective,
            stem: q.stem,
          }))}
      />
    )
  }

  // Canonicalise the URL. Without an explicit ?q the position would drift to the next
  // unanswered question the moment an answer revalidates the page, hiding the verdict.
  const asked = Number(search.q)
  if (asked !== position.index + 1) {
    redirect(`/${course}/practice/${sessionId}?q=${position.index + 1}`)
  }

  const question = items[position.index]
  const attempt = attempts.get(question.id)

  return (
    <Runner
      course={course}
      sessionId={sessionId}
      index={position.index}
      total={ids.length}
      question={toSafeQuestion(question)}
      terms={termsIn(glossary(course), question.stem)}
      initial={attempt ? { chosen: attempt.chosen ?? [], graded: grade(attempt.chosen ?? [], question) } : null}
      rating={ratings.get(question.id) ?? null}
      answered={answeredIds.size}
      correct={correctCount}
    />
  )
}
