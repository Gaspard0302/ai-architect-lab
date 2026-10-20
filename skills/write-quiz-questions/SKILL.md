---
name: write-quiz-questions
description: >-
  Write practice exam questions into a course's question bank. Use when asked to
  generate, add, or expand quiz questions, drill a domain or objective, fill
  blueprint coverage gaps, or write questions targeting objectives the learner keeps
  failing. Handles item authoring, dedup against the existing bank, and validation.
---

# Write quiz questions

## What this produces

Exam-faithful practice items in `courses/<course>/questions/D<n>-<slug>.yaml`, keyed to
that course's `objectives.yaml`, every one traceable to a heading in its formatted
lessons.

**Establish the course first.** Everything below is relative to `courses/<course>/`, and
every command takes `--course <name>`. `courses/` lists what exists. If the request does
not name one and the conversation has not already settled it, ask — writing architect
items into the developer bank is not recoverable by validation, since both banks are
structurally identical.

**The bank is the manifest.** There is no separate log of what has been written — a
side file would drift out of sync the first time generation was interrupted. Before
writing anything, read the existing questions for the target objective. That is the
dedup step, and it is not optional.

## Non-negotiables

| Rule | Why |
|---|---|
| Only `multi_choice` (select 1) and `multi_response` (select N ≥ 2) | The guide specifies exactly these two. Nothing else appears on the exam. |
| `select` must equal `len(answer)` | The real exam always states how many to pick. |
| Every question carries ≥1 resolving `sources` anchor | Course-sourced-only policy. `validate-bank.js` fails otherwise. |
| Never write items for objectives marked `course_coverage: none` | The learner chose course-sourced-only. Those stay at zero and surface in the report as a reading list. |
| Every wrong option gets a `distractors` note | Knowing *why the trap was tempting* is most of the learning. |
| 4–5 options | Matches the guide's sample items. |

## Workflow

1. **Read the target.** `objectives.yaml` for the objective text and its
   `course_coverage`. Stop immediately if it is `none`.
2. **Read what exists.** Every question already filed under that objective. You are
   looking for the *judgement* each one trains, not just the wording — two items can
   share no phrasing and still test the identical decision.
3. **Read the ratings.** `courses/<course>/ratings.yaml` (committed) holds every
   learner's exam-fidelity stars per question: `avg`, `n`, and the histogram.
   - **4–5 stars are the style models.** Pull those `qid`s from the bank and read them
     first, whatever objective they belong to. They are worked examples of what a good
     item feels like — match their calibration, do not invent a house style.
   - **1–2 stars are the rewrite queue.** Fix those before writing new items; a broken
     or unfair question costs more than a missing one.
   - Weigh `n` before acting: one 2-star rating is an opinion, five is a verdict.
   - The file is generated, not hand-edited. If it is missing or stale, run
     `pnpm ratings:pull --course <name>` (needs the Supabase service key in `.env.local`)
     or ask the learner to run it. If this personal project has no ratings yet,
     say so and judge items against the source and the quality criteria below; do not
     connect a different project to obtain ratings.
4. **Read the source material.** Find the actual lesson sections that teach this. Use
   the lesson Concept index to locate them, and the drill banks
   (`content/drills/module-*-drills.md`) for the course's own checkpoint framing.
5. **Write the items** per the schema below.
6. **Validate:** `pnpm validate --course <name>`. Fix everything it reports.
7. **Report coverage:** `pnpm report --course <name>` and tell the learner what moved.

## Schema

```yaml
- id: Q-D3-007              # Q-D<domain>-<3 digits>, sequential within the domain
  domain: 3
  objective: D3.5
  format: multi_response    # multi_choice | multi_response
  select: 2                 # must equal len(answer)
  stem: |
    A regulated insurer runs a claims-triage agent...
  options:
    A: ...
    B: ...
    C: ...
    D: ...
    E: ...
  answer: [B, D]
  rationale: |
    Why the key is right, in the course's own terms.
  distractors:
    A: "Attractive because ... but fails because ..."
    C: "..."
    E: "..."
  sources:
    - "lessons/Enterprise Integration & Production.md#04--sizing"   # relative to content/
  provenance: course
  difficulty: 2             # 1 recall · 2 application · 3 multi-constraint judgement
```

## What makes an item exam-grade

The guide's own samples all share a shape: **a scenario with enough constraints that
the answer turns on a judgement, not a definition.** Study the three samples in the
exam guide PDF (§8) before writing your first batch.

- **Scenario-led.** Open with a concrete situation carrying real parameters — volume,
  latency budget, regulatory posture, team shape. Not "What is prompt caching?"
- **Distractors must be defensible.** Each wrong option should be the right answer to
  a *slightly different* question. The classic exam pattern: a detective control
  offered where a preventive one is required, a compensating control offered where
  removal is required.
- **Test the load-bearing constraint.** The best items hinge on identifying which
  single constraint decides the design — the course teaches this explicitly.
- **Difficulty 3 items make two things true at once.** The learner must name both the
  verdict and the reason; getting the verdict right by luck should still fail.

### Converting course checkpoints

The course's sort/bucket and grid-place checkpoints are *not* exam formats, but their
pedagogy converts losslessly:

| Course device | Exam item |
|---|---|
| Sort N items into buckets | `multi_response`: "Which of these belong to \<bucket\>? Select 3." |
| Grid-place on two axes | `multi_choice`: describe one item, ask for its cell |
| Select-all-the-flawed-components | `multi_response`, verbatim — already exam-shaped |

Do not build a separate sort renderer. One format, one UI.

## Targeting weak spots

Attempts live in Supabase (`attempts` table), not in a repo file. Query it — group by
`objective`, rank by wrong-answer rate, require at least 3 attempts before calling an
objective weak — or ask the learner to read their Home dashboard, which shows the same
ranking. Then write new items against that objective that **test the same judgement from
a different angle**.
Do not rephrase the failed item; that trains recognition of the wording, not the
concept.

## Batch sizing

Write **8–12 items per call**. Larger batches degrade: distractors get formulaic and
scenarios start reusing the same industry. If a large bank is needed, do several
passes over different objectives rather than one giant pass.
