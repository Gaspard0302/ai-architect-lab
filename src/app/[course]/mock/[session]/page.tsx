import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { questions as lookup } from '@/lib/content/bank'
import { domains } from '@/lib/content/objectives'
import { requireCourse } from '@/lib/content/paths'
import { grade, toSafeQuestion } from '@/lib/grade'
import { sourceHref, sourceLabel } from '@/lib/markdown'
import { requireUserId } from '@/lib/session'
import { attemptsOf, closeIfExpired, deadlineMs, loadMock, ratingsOf } from '../data'
import { domainBreakdown, hhmmss, percentage, scaledScore } from '../scoring'
import { Exam } from './Exam'
import { Results, type ReviewItem } from './Results'

export const metadata: Metadata = { title: 'Mock exam' }

// Reads the session cookie and the learner's rows: never prerendered.
export const dynamic = 'force-dynamic'

type Params = { course: string; session: string }

export default async function MockSitting({ params }: { params: Promise<Params> }) {
  const raw = await params
  const course = requireCourse(raw.course)

  const userId = await requireUserId()

  const found = await loadMock(userId, course, raw.session)
  if (!found) notFound()
  if (found.archived_at && !found.submitted_at) redirect(`/${course}/mock`)

  // The clock is the server's. A refresh after time ran out submits the paper rather
  // than handing back a runner the learner could keep typing into.
  const session = await closeIfExpired(userId, found)

  const attempts = await attemptsOf(userId, session.id)
  const flagged = session.flagged ?? []

  if (!session.submitted_at) {
    // Nothing graded reaches the browser here: only the letters already chosen.
    const chosen: Record<string, string[]> = {}
    for (const a of attempts) chosen[a.qid] = a.chosen

    const paper = lookup(course, session.question_ids).map(toSafeQuestion)

    return (
      <Exam
        course={course}
        sessionId={session.id}
        deadline={new Date(deadlineMs(session)).toISOString()}
        paper={paper}
        initialChosen={chosen}
        initialFlagged={flagged}
      />
    )
  }

  // --- submitted: results and review ---
  const bankItems = lookup(course, session.question_ids)
  const correctByQid = new Map(attempts.map((a) => [a.qid, a.correct] as const))
  const chosenByQid = new Map(attempts.map((a) => [a.qid, a.chosen] as const))

  const slots = bankItems.map((q) => ({ qid: q.id, domain: q.domain }))
  const total = slots.length
  const correct = slots.filter((s) => correctByQid.get(s.qid)).length

  const stars = await ratingsOf(userId, course, [...new Set(session.question_ids)])

  const seen = new Set<string>()
  const review: ReviewItem[] = []
  bankItems.forEach((q, i) => {
    if (seen.has(q.id)) return
    seen.add(q.id)
    const g = grade(chosenByQid.get(q.id) ?? [], q)
    review.push({
      number: i + 1,
      question: toSafeQuestion(q),
      chosen: chosenByQid.get(q.id) ?? [],
      correct: g.correct,
      answer: g.answer,
      rationale: g.rationale,
      distractors: g.distractors,
      sources: g.sources.map((s) => ({ href: sourceHref(course, s), label: sourceLabel(s) })),
      flagged: flagged.includes(q.id),
      stars: stars[q.id] ?? null,
    })
  })

  const elapsed =
    (new Date(session.submitted_at).getTime() - new Date(session.started_at).getTime()) / 1000

  return (
    <Results
      course={course}
      correct={correct}
      total={total}
      pct={percentage(correct, total)}
      scaled={scaledScore(correct, total)}
      timeUsed={hhmmss(elapsed)}
      submittedAt={session.submitted_at}
      breakdown={domainBreakdown(slots, correctByQid, domains(course))}
      review={review}
    />
  )
}
