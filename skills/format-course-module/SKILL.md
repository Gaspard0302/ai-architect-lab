---
name: format-course-module
description: Use when a raw Claude certification course module (pasted website text, unformatted, in courses/<course>/content/_raw/) needs converting into the repo's lesson format, or when a lesson, drill bank, or the merged glossary needs updating. Triggers on "format this module", "convert the raw file", "new module in content/_raw", "rebuild the drills", "update the glossary".
---

# Format a course module

## Overview

Turns one raw pasted course module into three artifacts that together let an AI teach the
material without ever reading the raw file again.

**Core principle: restructure, never rewrite.** The course's *way of explaining* — its failure
narratives, its triads, its exact phrasing of a distinction — is the content being preserved. A
tightened sentence is a lost teaching move.

## Inputs and outputs

**Establish the course first.** Every path below is relative to `courses/<course>/`;
`courses/` lists what exists. If the request does not name one and the conversation has
not settled it, ask — the two courses have separately-formatted lessons and one shared
glossary each, and writing into the wrong one is silent.

```
content/_raw/<Module Name>.md          <- pasted text, NEVER edited
        │
        ▼  this skill
content/lessons/<Module Name>.md       <- lesson (prose, tables, callouts, concept index)
content/drills/module-<N>-drills.md    <- every checkpoint/exercise/game + answer + what it tests
content/GLOSSARY.md                    <- merged across all modules, rebuilt each run
```

## Workflow

1. **Back up.** If the raw file is not already in `content/_raw/`, copy it there. Never edit `content/_raw/`.
2. **Read the whole raw file** in chunks (they run 600–1200 lines). Do not skim — you cannot
   restructure what you have not read.
3. **Extract the course TOC.** It is the first ~50 lines: a module title, then numbered sections
   each followed by its screen names. This is the skeleton; use these names verbatim as headings.
4. **Diff TOC against body.** Screens listed in the TOC with no body text are *capture gaps* —
   see [Capture gaps](#capture-gaps). Do not invent them.
5. **Classify every screen** against `reference/section-taxonomy.md` and render it with that
   type's required structure. The taxonomy is the unified format.
6. **Write the lesson** using `reference/output-templates.md`.
7. **Write the drill bank** — one entry per checkpoint, exercise, and interactive game.
8. **Rebuild `content/GLOSSARY.md`** by merging every module's glossary.
9. **Validate:** `python3 skills/format-course-module/scripts/validate.py --course <name>` and fix
   everything it reports.

## The fidelity rule

Near-verbatim. Structure is added; words are not changed.

| Allowed | Forbidden |
|---|---|
| Add headings, tables, lists, blockquotes, fenced blocks | Rewriting, tightening, or splitting a sentence |
| Bold/italicise words **already in the source** | Substituting a synonym or "better" term |
| Reflow a tab-delimited run into a markdown table | Summarising a passage |
| Fix paste artifacts (glued numbers `1Break`, missing spaces, broken md tables, smart-quote noise) | Dropping a clause as redundant |
| Add a callout label whose text comes from the source | Merging two source sentences into one |
| Reorder cells into table columns | Reordering *prose* |
| Wrap lines at ~100 chars | Omitting a repeated idea because it appeared earlier |

If a sentence reads badly, it ships reading badly. `validate.py --course <name> --coverage` fails the run when
source sentences go missing.

## Capture gaps

Pasted text routinely loses interactive screens (tab components, calculators, drag-drops) and
truncates the last glossary entry. Three markers, used consistently:

| Situation | Marker |
|---|---|
| Screen in TOC, no body text | `> ⚠️ **Capture gap.** …not present in the captured source.` + pointer to the material it draws on |
| Exercise present, answer absent | `> ⚠️ **No answer key in the captured source.**` + the reasoning to apply |
| Answer you worked out yourself | `> ⚠️ …inferred from the module's own reasoning; verify against the course.` |

Every gap also gets a row in the lesson's **Appendix — capture gaps** table. Never silently fill
a gap, and never present an inferred answer as the course's.

## Preserving the pedagogy

These recur in every module and each carries a teaching move. Never collapse or merge them.

- **The Watch Out four-beat arc** — Setup hook (*why a smart person makes this mistake*) → the
  artifact (trace / transcript / quotes / postmortem) → *What broke and why* (enumerated
  mechanisms) → *Why this broke* (the one-line principle). Four beats, four subheadings.
- **Cost · Complexity · Risk** — the closing triad on nearly every concept screen. Always a
  three-bullet list with those exact bold labels, never a table, never merged into prose.
- **Distinction passages** — "X and Y: different layers, not alternatives". These are the
  vocabulary-fixing moves; keep them as their own subheading.
- **AI Fluency competencies** — Delegation, Description, Discernment, Diligence. Tag each where
  it appears; they thread across all four modules.
- **Forward/backward pointers** — "covered in Module 3", "the decomposition step from Module 1".
  Convert to real cross-module links (see below), keep the sentence.
- **Verify-at-publish-time hedges** — every "verify current X against platform.claude.com" stays.

## Cross-module links and the concept index

- **Concept index:** a table directly after the lesson's Contents listing every named concept and
  the heading that teaches it. Derived only from headings and bolded source terms — invent nothing.
- **Cross-module links:** when the source points at another module, link the file:
  `[Module 3](<Responsible AI, Safety & Risk for Architects.md>)` (lessons sit side by side, so links between them need no prefix). When a concept recurs
  (the four AI properties, the four AI Fluency competencies, live state vs retrieval), link the
  fullest treatment.

## Drill bank

One entry per checkpoint, exercise, or interactive game. ID scheme `D<module>.<section>.<n>`
(e.g. `D2.04.1`). Every entry declares `Type`, `Section` (linked), `Tests`, and `Answer status`
(`given` | `inferred` | `missing`). The answer sits in a `<details>` block so the file doubles as
a self-test. Full template in `reference/output-templates.md`.

If the learner recorded their own answer in the raw file, keep it, labelled
`**Your recorded answer** *(preserved from the source file)*`, alongside the model answer.

## Common mistakes

| Mistake | Fix |
|---|---|
| Skimming the raw file and writing from the TOC | Read every chunk; the TOC omits screen bodies |
| "Improving" clumsy source prose | Ship it verbatim; run `--coverage` |
| Answering an exercise the source left open | Mark it `missing` and say what reasoning applies |
| Collapsing the Watch Out arc into one paragraph | Four subheadings, always |
| Dropping a duplicate glossary term on merge | Keep it, tag it with every module that defines it |
| Editing `content/_raw/` | It is the source of truth; copy, never modify |

## Reference

- `reference/section-taxonomy.md` — every recurring screen type and its required output shape
- `reference/output-templates.md` — lesson, drill, and glossary skeletons
- `scripts/validate.py` — anchors, frontmatter, drill IDs, gap-appendix consistency, source coverage
