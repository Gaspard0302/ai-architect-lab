# Canonical skills

| Skill | Use |
| --- | --- |
| `architect-solution-design` | Work allocation, patterns, context, retrieval, entrypoints |
| `architect-evals-and-production` | Evaluation datasets, change gates, costs, observability |
| `architect-responsible-ai` | Guardrails, injection, human review, risk controls |
| `architect-discovery-and-tradeoffs` | Discovery, decisions, documentation, outcomes |
| `architect-team-enablement` | Team tooling, distribution, runbooks |
| `format-course-module` | Preserve raw content while formatting lessons and drills |
| `write-quiz-questions` | Author sourced questions with explanations and validation |

Each directory is the source of truth for that skill. The first five are the shareable
architecture methods; the last two support this repository's content format.

Run `pnpm skills:build` to generate `dist/skills/<name>.zip`. A ZIP has a single top-level
skill directory and copies its source files unchanged. The build writes no rewritten
descriptions, combined bundle, plugin variant, or editable duplicate.

Project discovery is provided through symlinks at `.agents/skills` and `.claude/skills`.
For another tool, use its documented local skill installation method with the canonical
directory, or upload a ZIP if it supports that format. A clean install in the target
tool remains part of release verification; packaging alone does not prove compatibility.
