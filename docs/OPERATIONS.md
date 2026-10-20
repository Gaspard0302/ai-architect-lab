# Maintain the project through chat

## Current connections

| System | Evidence at preparation | Next step |
| --- | --- | --- |
| Local files and shell | Read/write available in the project workspace | Use deterministic repo commands |
| GitHub | Connected account and authenticated CLI: `Gaspard0302` | Public repo created; skills and app source publish together; study corpus excluded |
| Website host | Vercel CLI 54.20.1 authenticated as `gaspard0302`; no project linked | Link a new personal preview project when the website is ready |
| Progress database | Schema retained; no credentials or data migrated | Create a personal project and apply both SQL migrations |
| Browser QA | Browser automation available in the chat environment | Exercise a configured local app or preview |
| Learning operations MCP | Not implemented | Expose the shared service operations below |

GitHub tools/CLI cover issues, branches, changes, checks, and releases. For the retained
Next.js app, Vercel and Supabase are practical candidates because the implementation
already uses that shape. This is a proposal, not a configured deployment.
Their official MCP documentation is at [Vercel MCP](https://vercel.com/docs/mcp) and
[Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp). Connect only personal projects.
Development database inspection and learner-facing progress access are different concerns.

## Command surface today

| Intent | Command |
| --- | --- |
| Check the foundation | `pnpm check:foundation` |
| Check immutable raw/PDF files | `pnpm check:preserved` |
| Validate both question banks and anchors | `pnpm check:content` |
| Check formatted course structure | `pnpm check:lessons` |
| Assess raw/lesson sentence coverage | `python3 skills/format-course-module/scripts/validate.py --course architect --coverage` |
| Report blueprint coverage | `pnpm report --course architect` |
| Check public skill entrypoints and references | `pnpm check:skills` |
| Check skill/transcription overlap locally | `python3 scripts/check-skill-overlap.py` (private corpus required) |
| Build release artifacts | `pnpm skills:build` |
| Public code/skills CI gate | `pnpm check` then `pnpm build` |
| Local study corpus checks | `pnpm check:local-content` (requires private course files) |

Coverage checks can report inherited capture/formatting gaps. Keep their output visible
and resolve deliberately; do not call sentence coverage complete from a schema check.
Behavioral skill checks and learner walkthroughs remain manual until representative cases exist.

## Chat operations to implement

| Operation | Input | Result | Access |
| --- | --- | --- | --- |
| `learning_status` | Course; authenticated learner | Coverage, attempts, weak objectives with sample counts | Own progress only |
| `start_practice` | Course, objective/filter, item count | Session and safe questions without answer keys | Own session |
| `submit_answer` | Session, question, choices, request ID | Grade, explanation, next question | Own session; retries do not duplicate attempts |
| `record_lab_review` | Lab, artifact reference, rubric, request ID | Versioned review and next action | Own review; retain revisions |
| `project_health` | Branch or commit | Content/test/build/check/deployment status with URLs | Project contributor |

Implement these once in application services. The website, CLI, and a small MCP server
call the same functions. Keep operation schemas and sample requests in the repo. Return
structured failures with a retry decision; log request IDs without credentials or private
learner answers. Do not expose a service-role database key through a chat tool.

## Three acceptance walkthroughs

1. **Content:** “Add this source as an architect learning unit.” Capture raw bytes, format,
   add grounded practice, run checks, show changed files and a preview. Stop with an explicit
   gap if the supplied source does not support an objective.
2. **Fix:** “This practice answer is graded incorrectly.” Reproduce with a specific item,
   inspect source/answer/scoring, correct the cause, verify the regression, and report CI/preview.
3. **Share:** “Release the updated solution-design skill.” Check the canonical skill, run a
   realistic task and inspect the output, build the ZIP, install it in a clean target context,
   tag the checked commit, publish the artifact, and return the release URL.

These are proposed acceptance flows. They are not marked complete by creating these docs.

The [mock-exam and plugin proposal](MOCK-EXAM-AND-PLUGINS.md) adds the learner-facing
tool contract and product acceptance gates. These remain proposed until agreed.

## Recovery

Content and skills roll back through Git. App releases roll back to a verified build.
Database migrations need their own backup/restore plan before production writes; Git alone
does not roll back learner data. Keep local `.env.local` and hosted secrets out of commits.
