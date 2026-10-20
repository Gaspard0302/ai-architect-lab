# AI Architect Lab

A personal learning lab for designing, building, evaluating, and operating AI systems.
Share reusable architecture skills, practise decisions in the planned mock-exam website,
then demonstrate them in working projects. This is an independent learning project.

## Public repository and local study corpus

| Component | Location | Role |
| --- | --- | --- |
| Local-only captures and exam guides | Ignored `courses/architect/`, `courses/developer/` | Preserved study material |
| Local-only formatted lessons, drills, glossary | Ignored course directories | Readable, source-linked learning |
| Local-only objective maps and question banks | Ignored course directories | Retained as study references |
| Seven canonical skills | `skills/` | Five architecture procedures and two content authoring procedures |
| Study app foundation | `src/` | Lessons, practice, mock exams; personal redesign pending |
| Checks and packaging | `scripts/`, `.github/workflows/` | Repeatable maintenance |

The editable skills exist only under `skills/`. `.agents/skills` and `.claude/skills`
are discovery symlinks to that directory. ZIP exports are generated and ignored.

Read [the proposed project plan](PLAN.md) to decide what to build next,
[the mock-exam and plugin proposal](docs/MOCK-EXAM-AND-PLUGINS.md) for the learner experience,
[the operating guide](docs/OPERATIONS.md) for chat workflows and tool readiness,
and [content provenance](docs/CONTENT.md) before sharing course captures.
See [the preparation baseline](docs/BASELINE.md) for checks that passed and remaining setup work.

## Local use

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm skills:build
```

To run the retained app, create a **personal** Supabase project, apply both migrations
in `supabase/migrations/` in order, and populate `.env.local` using `.env.example`.
Then run `pnpm dev`. The database and hosting connections are not configured yet.
The current name/PIN login is a prototype; replace it before a public deployment.

## Share skills

Browse [the skill catalog](skills/README.md). Build one ZIP per canonical skill with
`pnpm skills:build`. Each ZIP contains the same files as its source directory.
No generated variant is edited separately.

The skills and mock-exam website will share one public repository:
[AI Architect Lab](https://github.com/Gaspard0302/ai-architect-lab).
Course captures, formatted transcripts, PDFs, and inherited banks stay local.
The public website curriculum will contain original material; see `courses/README.md`.
