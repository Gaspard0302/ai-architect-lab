# AI Architect Lab — proposed scope

Status: clean personal foundation prepared; product choices remain open for discussion.
Name: AI Architect Lab. One public GitHub repository will hold the skills and the mock-exam website.
Initial audience: Gaspard, then other independent learners.
Both source courses are retained; the architect path leads the first website version.

## Product promise

Learn an architecture concept, make a decision in a realistic case, build something
small that exercises it, and get evidence-based feedback. Turn reusable methods into
agent skills others can install. Certification preparation is one learning path.

## Keep, remove, defer

| Decision | Material | Reason |
| --- | --- | --- |
| Keep | Both courses' raw captures and exam guide PDFs, byte for byte | Recoverable source of truth |
| Keep | Ten formatted lessons, ten drill files, two glossaries | Readable teaching base with existing anchors |
| Keep | Objective maps and both question banks | Useful coverage model and immediate practice |
| Keep | Five architecture skills, each with its references | Reusable practical methods |
| Keep | Two authoring skills | Maintain lessons and question quality through chat |
| Keep provisionally | App, scoring, selection, mastery, tests, SQL migrations | Useful implementation foundation to assess during the redesign |
| Remove from the personal copy | Prior Git metadata, remotes, branding, hosting links, environment files | Independent identity and infrastructure |
| Remove from the personal copy | Nested checkouts, build caches, installed dependencies, generated skill variants | One maintained source of each artifact |
| Remove from the personal copy | Existing learner ratings and runtime data | Personal learning begins with fresh state |
| Replace | Existing product plans and agent instructions | Align maintenance with this project's purpose |
| Defer | Payments, teams, leaderboards, complex agent orchestration | Establish the learning loop first |

## Four success criteria

1. **A clean, recoverable foundation.** Original captures and PDFs match their recorded
   SHA-256 hashes; source content survives the migration; each skill has one canonical
   directory; no credentials, runtime data, nested checkout, or prior infrastructure
   linkage enters the new initial commit. `pnpm check` passes for public code/skills; `pnpm check:local-content` checks the private corpus.
2. **One complete learning loop.** A learner can open an architect lesson, answer a short
   sourced practice set, see explanations and a weak-objective recommendation, complete
   one practical lab, and save a review. Show this with one end-to-end walkthrough before
   expanding the curriculum. Attempt history stays private to the learner.
3. **Evidence of architecture ability.** First milestone: three original cases covering
   system design, evaluations/production, and safety. Each produces a decision record,
   a runnable demonstration, and an evaluation result. Proposed completion bar: at least
   4/5 on correctness, tradeoff reasoning, evaluation quality, and operational clarity;
   any critical safety or correctness issue remains open. A quiz score alone is insufficient.
4. **Maintenance through chat.** Demonstrate three workflows: add a sourced learning unit;
   diagnose and fix a reported issue through a checked preview; and publish an installable
   skill release. Each ends with changed files, checks, and a verifiable URL or artifact.
   Chat can read progress and recommend practice once the private data tool exists.

The lab count and rubric threshold above are proposals, not measured outcomes.

## Website shape

| Area | Learner action | Evidence |
| --- | --- | --- |
| Learn | Read a short route through a lesson and its concepts | Source links and objective coverage |
| Practise | Answer fresh scenarios and revisit weak concepts | Attempts, explanations, confidence, delayed retry |
| Build | Complete a bounded lab with a dataset and constraints | Runnable artifact, architecture decision, measured eval |
| Review | Explain a tradeoff and revise after feedback | Rubric, reviewer notes, next action |
| Skills | Inspect, install, and use a practical method | Versioned source, examples, release ZIP |

Keep source-derived lessons distinct from original teaching, examples, and labs. Do not
rewrite the raw captures into a supposedly provider-neutral course. Original lessons can
compare providers with links to current primary documentation.

## Build sequence and exit checks

| Phase | Deliverable | Exit check |
| --- | --- | --- |
| 0 — Personal foundation | Clean repository, preserved content, canonical skills, plan | Preservation check, content checks, lint, unit tests, build; fresh Git history |
| 1 — One vertical slice | Architect lesson → practice → practical lab → saved review | Manual learner walkthrough, meaningful regression checks, private progress verified |
| 2 — Chat operations | Shared application operations exposed through CLI/MCP | Same operation produces the same result through chat and website; ownership checks and retry tests |
| 3 — Share | Skill catalog and tagged releases; selected original public learning units | Clean install outside the repo, links resolve, release artifact matches source |
| 4 — Expand | More cases and developer foundations where needed | Add only in response to observed learning gaps or usage |

## Check loops

- **Content:** capture source → format → verify preserved raw → validate structure and
  question schema → resolve source anchors → review semantic fidelity → preview. Existing
  course validators are retained; their current limitations must be recorded, not hidden.
- **Skills:** change canonical source → validate frontmatter/references → check accidental
  transcription overlap → run a realistic task with a rubric → build ZIP → clean install.
  Syntax checks and word-overlap checks do not establish usefulness or publication rights.
- **Software:** describe observable issue → reproduce → implement → focused checks → CI →
  preview walkthrough → release → verify deployment. Revert the release if the live check fails.
- **Learning:** diagnose with enough attempts → choose a concept → practise → build → review
  against an explicit rubric → revisit on a different case later. Keep quiz familiarity and
  demonstrated design competence separate.

## Decisions to make together

1. Confirmed: one public `Gaspard0302/ai-architect-lab` repository for skills and the mock-exam website.
   Confirmed: raw captures, formatted transcripts, and source PDFs remain local.
   Inherited objective maps and question banks also remain local while original website
   content is developed. Publish skills, application source, and original project material.
2. Confirm whether “one skill” means one canonical source per skill (current preparation)
   or a single architect entrypoint with the five procedures as references.
3. Choose the first practical case. A support-triage workflow is a manageable candidate:
   classify requests, retrieve stable policy, query live status, route exceptions, and evaluate.
4. Confirm whether this stays a personal learner tool or supports public learner accounts.
   Start personal; retain an upgrade path without implementing teams now.
5. Vercel CLI is authenticated as `gaspard0302`. Connect a new personal project when the
   website is ready. The personal progress database is still unconfigured.
