# Output templates

Three files per module. Copy these skeletons.

---

## 1 · Lesson — `<Module Name>.md`

Lives in `courses/<course>/content/lessons/`, filename matching the raw file (add `.md` if the raw lacks it).

````markdown
---
title: "Enterprise Integration & Production"
course: <the course's full credential name>
module: 2
sections: 8
drills: drills/module-2-drills.md
topics:
  - evals as acceptance criteria
  - POC-to-production gap (cost, latency, reliability, failure modes)
  - ...one line per major topic, lowercase, searchable
---

# Module 2 — Enterprise Integration & Production

> **What this module is.** <the source's own framing sentence, verbatim>

## Contents

| # | Section | Screens |
|---|---------|---------|
| 01 | [Module Introduction](#01--module-introduction) | Orientation |
| 02 | [Evals](#02--evals) | Evals as acceptance criteria · Watch Out: wrong eval suite · Sort the eval types |
| … | | |

## Concept index

| Concept | Taught in |
|---------|-----------|
| Golden dataset | [Evals as acceptance criteria](#how-the-eval-workflow-runs-from-task-definition-to-result) |
| p95 latency | [Cost and latency modeling](#cost-and-latency-modeling-know-the-numbers-before-you-build) |
| Circuit breaker | [Reliability controls](#reliability-controls-what-to-build-into-every-model-call) |
| … | |

*Recurring across modules:* [four AI properties](<Claude Platform & Solution Design.md>#02--how-claude-behaves) ·
[AI Fluency competencies](#…) · [live state vs retrieval](<Claude Platform & Solution Design.md>#the-retrieval-principle)

---

## 01 · Module Introduction

### Orientation

…

---

## 02 · Evals

### Evals as acceptance criteria: building quality into the build process

…

#### Cost · Complexity · Risk

- **Cost:** …
- **Complexity:** …
- **Risk:** …

### Watch Out: wrong eval suite — the eval suite that measured the wrong thing

…

### Checkpoint: Sort the eval types

> ⚠️ **Capture gap.** …

---

## Appendix — capture gaps

| Section | Screen |
|---------|--------|
| 02 · Evals | Sort the eval types |
````

**Anchor rule.** GitHub slugs: lowercase, strip everything but word chars / spaces / hyphens, then
each space becomes one hyphen. `## 04 · Sizing` → `#04--sizing` (two hyphens — the `·` is stripped
but both surrounding spaces survive). `validate.py` checks these.

---

## 2 · Drill bank — `drills/module-<N>-drills.md`

````markdown
---
title: "Module 2 — Drill bank"
course: <the course's full credential name>
module: 2
lesson: "../Enterprise Integration & Production.md"
drills: 7
answers_given: 5
answers_inferred: 1
answers_missing: 1
---

# Module 2 — Drill bank

Every checkpoint, exercise, and interactive game from
[the lesson](<../Enterprise Integration & Production.md>), with its answer and what it tests.
Answers are collapsed so this file works as a self-test.

## Index

| ID | Type | Section | Tests | Answer |
|----|------|---------|-------|--------|
| [D2.02.1](#d2021--sort-the-eval-types) | sort | 02 · Evals | code vs model vs human grading | ⚠️ missing |
| [D2.04.1](#d2041--justify-the-feasibility-call--scenario-1) | multiple-choice | 04 · Sizing | feasibility verdict + load-bearing constraint | given |
| … | | | | |

---

## D2.04.1 · Justify the feasibility call — scenario 1

- **Type:** multiple-choice
- **Section:** [04 · Sizing](<../Enterprise Integration & Production.md>#04--sizing)
- **Tests:** naming both the feasibility verdict *and* the single load-bearing constraint
- **Answer status:** given

**Task.** For each scenario, choose the option that names both the correct feasibility verdict
**and** the single load-bearing constraint behind it.

**Scenario.** A professional-services firm wants a research assistant that summarizes 10–40 page
industry reports and drafts client briefings. 50 reports per week, briefings within 24 hours,
$500/month ceiling.

- **A.** Not feasible — the reports are too long for the context window.
- **B.** Feasible as scoped — input size fits the context window, and volume, latency, and cost are
  all within range at the Sonnet tier; no AI property presents a disqualifying constraint.
- **C.** Feasible with constraints — needs a human review gate on every briefing.

<details>
<summary><b>Answer</b></summary>

**B.**

All four AI properties are evaluated. The input size (10–40 pages) fits well within Sonnet's
context window. Volume (50/week) is low and easily handled. The 24-hour latency target is
generous. The $500/month ceiling is feasible at the Sonnet tier for this volume. No AI property
presents a disqualifying constraint.

</details>
````

**Field rules**

| Field | Values |
|---|---|
| `Type` | `sort` · `select-all` · `multiple-choice` · `grid-place` · `free-write` · `interactive` · `cumulative` |
| `Section` | Linked to the lesson's section anchor |
| `Tests` | One phrase naming the judgement being trained, not the topic |
| `Answer status` | `given` (course supplied it) · `inferred` (you derived it — say so in the answer block) · `missing` (no key survived; state the reasoning to apply and link the sections) |

ID scheme `D<module>.<section>.<n>`, `n` counting drills within that section in source order.

---

## 3 · Merged glossary — `GLOSSARY.md`

Rebuilt from scratch on every run, from every module's glossary section.

````markdown
---
title: "Glossary — <the course's full credential name>"
course: <the course's full credential name>
modules: [1, 2, 3]
terms: 58
---

# Glossary

Merged from all module glossaries. **Modules** shows where each term is defined; where two
modules define a term differently, both readings are kept.

## Index

`A` [Adaptive thinking](#adaptive-thinking) · [API](#api) · … `B` [BAA](#baa-business-associate-agreement) · …

---

### Adaptive thinking

**Modules:** 1

Extended thinking where the model itself, rather than you, decides whether to think and how much…

### Live state

**Modules:** 1, 2, 3

Data that changes during the lifetime of a conversation or process: an order status, an inventory
count, a price, a calendar slot, a user's current session…

### Eval

**Modules:** 1, 2

> **Module 1.** Eval, short for evaluations, is a structured test set used to measure…
>
> **Module 2.** A structured test set used to measure whether a model is performing well enough…
````

**Merge rules**

1. Normalise the term (trim, strip trailing punctuation). Case-insensitive match.
2. Definitions identical after whitespace normalisation → one entry, `Modules:` lists all.
3. Definitions differ → one entry, each module's wording quoted under a `**Module N.**` label.
   Never pick a winner and never blend them.
4. A truncated definition carries its ⚠️ marker into the merge.
5. Sort alphabetically, ignoring case and leading articles.
