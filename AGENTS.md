# Work in AI Architect Lab

Read `README.md` and `PLAN.md` for scope; `docs/OPERATIONS.md` records tool readiness.
Use pnpm. Keep the project manageable from chat with deterministic commands and observable results.

## Content and skills

- `courses/*/content/_raw/` and source PDFs are immutable. Preserve exact bytes.
- Formatted lessons preserve source wording and mark capture gaps; original explanations
  and labs must be identified as original work. Cite course paths and heading anchors.
- Course-specific commands require `--course <name>`. Establish the course
  from context; ask only when it cannot be inferred. Both courses are retained.
- Use `skills/format-course-module/SKILL.md` for formatting and
  `skills/write-quiz-questions/SKILL.md` for bank authoring.
- `skills/` is the only editable skill source. Discovery symlinks are aliases; `dist/`
  is generated. Never maintain separate desktop or plugin procedures.
- Missing personal ratings mean there is no rating evidence yet. Do not reconnect a
  database just to obtain a style model; assess source-grounded item quality directly.
- Preserve third-party attribution and distinguish it from this project's identity.

## App invariants

- Grade on the server. Answer keys, rationales, distractor notes, and sources are withheld
  from the browser until the relevant submission/review step.
- The service-role database client is server-only; queries use the authenticated user ID
  and course. A session ID alone never authorizes access.
- Mastery is derived from attempt history. The server owns mock-exam deadlines.
- Keep source anchors stable or repair all affected question links in the same change.
- The retained name/PIN login is a prototype. Replace it before public learner hosting.

## Verification and operations

Run `pnpm check` for public skills, lint, and unit tests;
run `pnpm check:local-content` for private source/content checks; run `pnpm build` for app changes
and before a release. Use `docs/QA.md` for affected user flows. Record failures accurately.
Do not claim semantic review, deployment, or learning progress based on static checks alone.

Read-only status uses connected tools or authenticated CLIs. Mutations follow the user's
authorized scope. Do not contact people or change unrelated projects. Secrets belong in
ignored local environment files or the selected host's secret store.

Use `docs/OPERATIONS.md` as the contract for future CLI/MCP operations. Shared operations
belong in application services; browser handlers and chat tools call those same services.

## Publication boundary

Keep `courses/architect/`, `courses/developer/`, and `.local/` out of public Git history.
They hold the retained study corpus; publish original curriculum in new course directories.
Public CI must work without the private corpus. Do not treat an absent corpus as a passing
content-fidelity or overlap check; those checks run explicitly in the local content gate.
