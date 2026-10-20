# Section taxonomy

Every screen in a Claude certification module is one of the types below. Classify, then
render with that type's required structure. This is what makes the four modules interchangeable
to a teaching agent.

Heading levels are fixed:

| Level | What it is | Example |
|---|---|---|
| `#` | Module | `# Module 2 — Enterprise Integration & Production` |
| `##` | Numbered section, from the TOC | `## 04 · Sizing` |
| `###` | Screen, from the TOC | `### Watch Out: scoping call — the scoping call that skipped the constraints` |
| `####` | Sub-topic within a screen | `#### The five pillars of the business case` |
| `#####` | Item within a sub-topic | `##### Step 1 — Estimate call volume` |

Screen headings use the TOC name, an em-dash, then the body's own title when the two differ:
`### <TOC name> — <body title>`.

---

## 1 · Orientation

Opens every module. Always contains, in this order:

1. A framing paragraph, often with a numbered decision table.
2. `#### Learning objectives` — a numbered list. The source glues the number to the first word
   (`1Break down…`); split it.
3. `#### Who this module is for` — keep in full; it names the reader's posture.
4. `#### "The work" in this module` / the section map — convert each mapped section into a bullet
   that **links to that section**.
5. The disclaimer, as a blockquote titled
   `> **Disclaimer / Notice for Educational Content**`.

## 2 · Concept screen

The workhorse. Prose teaching + tables. Requirements:

- Lead paragraph verbatim.
- Every tab-delimited run becomes a markdown table. If the source's implied columns are
  `Thing | What it is | When it earns its place`, keep those exact header words.
- "Select each X to see …" indicates a collapsed interactive component. Render as a table if all
  panels were captured; if only some were, render the table with `⚠️ *not captured*` in the empty
  cells and add a capture-gap note.
- Closes with `#### Cost · Complexity · Risk` — three bullets, bold labels **Cost:**,
  **Complexity:**, **Risk:**. Some screens add a fourth (**Data handling:**); keep it.

## 3 · Watch Out (failure case)

The module's core teaching device. **Four beats, four subheadings, never merged:**

```markdown
### Watch Out: <toc name> — <body title>

**Setup hook.** <why a competent architect makes this mistake>

**<The artifact's own label>.** <framing sentence>

> <transcript / quote / postmortem, as a blockquote>
```text
<or a fenced block for traces, request paths, annotated diagrams>
```

#### What broke and why
<enumerated mechanisms — numbered list if the source enumerates, bullets if not>

**Why this broke.** <the one-line transferable principle>
```

Artifact sub-types and their rendering:

| Artifact | Render as |
|---|---|
| Scoping-call dialogue | Blockquote, `> **Speaker:** "…"`, blank `>` between turns, `> *[Two weeks later]*` for stage directions |
| Retrospective quotes | One blockquote each, labelled `> **Quote 1** — "…"` |
| API / request trace | Fenced ```text block, aligned |
| Annotated architecture diagram | Fenced ```text block with `↓` flow and `⚠` annotations |
| Numbers (cost overrun, scores) | Pull into a small table; keep the surrounding sentences |

The **Setup hook** is the highest-value beat and the easiest to lose — it is the psychology of the
error. Never summarise it.

## 4 · Checkpoint

A graded in-course exercise. Types seen so far:

| Type | Shape | Answer rendering |
|---|---|---|
| `sort` | Drag items into buckets | Answer-key table: item → bucket → why |
| `select-all` | Click the flawed components | Answer-key table: component → Problem/Sound/Gap → why |
| `multiple-choice` | A/B/C/D, sometimes several scenarios | ✅ on the correct option, then `> **Why X is correct.**` |
| `grid-place` | Two-axis placement | Answer-key table shaped like the grid, `*(empty)*` for unused cells |

Render as:

```markdown
### Checkpoint: <name>

**Task.** <the instruction, verbatim>

<the items / scenarios>

> **Answer key**
>
> <table or ✅-marked options>
>
> **The principle:** <the source's closing lesson, if it gave one>
```

Also emit a drill entry.

## 5 · Exercise (free-write + reveal)

Learner writes an answer, then reveals a model answer.

```markdown
### Exercise: <name>

#### The brief
<verbatim; parameters into a two-column table where the source lists them>

#### Your task
<the instruction>

> **Model answer**
>
> <verbatim; structure into tables where it enumerates>
```

If the learner typed their own answer into the raw file, insert before the model answer:

```markdown
> **Your recorded answer** *(preserved from the source file)*
>
> <verbatim>
```

Also emit a drill entry.

## 6 · Interactive / game

Calculators, experiment-design planes, cost sliders. Usually the body text survives but the
component does not.

- Keep the instruction paragraph verbatim.
- Keep any decision question the screen poses.
- Render the scenario list as a lettered table.
- If no answer key survived: `> ⚠️ **No answer key in the captured source.**` plus links to the
  sections carrying the reasoning.

Also emit a drill entry with `Answer status: missing`.

## 7 · Cumulative assembly

The end-of-module synthesis. One brief, several sequenced decisions.

- `#### The brief` with a parameters table.
- `##### Decision N — <name>` per decision, prompt first, then
  `> **Model answer**` as a blockquote.
- Where the model answer contains figures, break them into sub-tables **inside** the blockquote.
- Where the source presents options A–D with one correct, add an answer block naming the winner
  and a table of *the one decision that fails* in each other option — marked ⚠️ if inferred.

## 8 · Glossary

Alphabetical definition list. Render with markdown definition-list style:

```markdown
**Term**
: Definition, verbatim.
```

A truncated final entry (the paste often cuts it) gets
`: ⚠️ *The captured source lists this term but its definition was truncated.*`

## 9 · Recap / takeaways

Numbered `#### 01 · <title>` blocks, one per takeaway, body verbatim.

## 10 · Sources / What comes next

- Sources → bullet list, italicising work titles, backticking URLs.
- "What comes next" → its own `###`, with a real link to the next module's file.

## 11 · Appendix — capture gaps

Last section of every lesson. A table of `Section | Screen or item` for everything the paste
lost, plus a sentence pointing at any inferred answer keys.
