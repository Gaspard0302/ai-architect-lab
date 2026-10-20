# Sizing, feasibility and the value case

## Sizing: a cost model before code

Rough is fine; wrong inputs are not. The model exists to test the architecture against the budget
and to force the token-distribution assumption into the open.

1. **Volume.** Requests per day or month, **from the business owner's operational data**. A
   developer's estimate or a sample dataset is not a source. Count continuations: a conversation
   is several calls, not one.
2. **Tokens per request, as a distribution.** Input (system prompt + retrieved passages + user
   turn + history) and output (expected reply length). Record the median *and* the tail; skewed
   workloads put most of the spend in the long requests. If the prefix is long and stable, model
   caching honestly: cache writes are dearer than plain input, reads are much cheaper, and a
   workload whose requests arrive less often than the cache lifetime sees little benefit.
3. **Monthly cost.** volume × input tokens × input rate + volume × output tokens × output rate,
   with cached input at the cache-read rate. Input and output are priced differently on every
   tier; check current prices before finalising. Compare to the ceiling. **Over the ceiling means
   the architecture changes now** — tier, context strategy, caching, batch processing where the SLA
   allows asynchronous work (confirm compliance coverage first).
4. **Sensitivity.** Volume doubles? Tail thickens? Cache hit rate halves? The answer tells you how
   fragile the model is and which assumptions to confirm with the owner before committing.

## Scoping: requirement → SOW in four steps

| Step | From → to | Do |
|---|---|---|
| 1 | Requirement → **capability list** | Break the goal into separately named capabilities. "Handle supplier onboarding" is a goal; the capabilities might be: extract fields from documents, check the supplier against a sanctions list, route by risk tier, draft the welcome pack |
| 2 | Capability list → **architecture sketch** | Give each capability one owner: the model, an existing system, or a person (delegation map — `architect-solution-design`) |
| 3 | Sketch → **boundary conditions** | Where does it work and where does it stop? "Handles documents up to 20 pages; longer ones go to a manual queue" is a boundary condition and must be written down |
| 4 | Boundaries → **SOW scope** | The statement of work carries the boundaries so delivery and the owner agree on what is in and out |

Skip a step and the commitment does not survive the next conversation with the owner.

## Feasibility through the model's properties

"Can the model do this?" is a capability check, not a feasibility assessment. For each capability,
run the four properties (table in `architect-solution-design`, Phase 0) as questions: does it need
precision on specific values? does it depend on knowledge the model will not have? does the input
fit the window in aggregate? are the instructions concrete and checkable? Each "problem" answer
names a compensating control — verification loop, retrieval or tool, chunking or pipeline, schema
or code execution — and every compensating control is part of the architecture and the cost.

## Three verdicts

| Verdict | Means | Document |
|---|---|---|
| **Feasible as scoped** | Every capability has an owner the properties support, cost fits the ceiling, p95 fits the SLA, no control changes the architecture | The assumptions, plainly. This verdict becomes the next one the moment an assumption moves |
| **Feasible with constraints** | Works under conditions that must be enforced — a length cap, an index refresh schedule, a human gate under a confidence threshold. The constraints *are* the architecture | Each constraint with what fails when it is violated, so delivery knows what it is designing for |
| **Not feasible** | A capability hits a property limit no control closes within scope and budget, or cost exceeds the ceiling by more than tiering, caching or redesign recover | The disqualifying constraint and why; the scope reduction that would change the verdict, if one exists, handed to the owner as a choice |

A "not feasible" delivered early is the cheapest outcome an engagement can have. Deliver it as a
finding, not an apology.

## The value case

Feasibility says it can be built within budget; it does not say it is worth building. Connect the
scoped architecture to outcomes in the unit the budget holder already tracks: hours per case, days
to resolution, error rate, revenue protected.

Tag each claim with the kind of value it represents so the statement carries number and kind:
**efficiency** (current tasks completed quicker or at lower cost) · **transformation** (things that could not be done
before) · **productivity** (the same team producing more) · **solution cost** (what running it
costs) · **service levels** (the SLAs the deployment must hold).

| Step | Do | Trap |
|---|---|---|
| 1. Baseline | Measure today's state in the business unit, from the owner's data | An estimated baseline yields a number finance will reject on first inspection |
| 2. Projected state | Same unit, with the system in the workflow — **including the human review the verdict requires** | Modelling review as eliminated when the design only reduces it; the shortfall shows in the first operating period |
| 3. Net of run cost | Subtract recurring run cost taken from the sizing model (build cost belongs in payback) | Run cost from an average rather than the distribution understates it on heavy-tailed workloads |
| 4. Payback and sensitivity | Months until cumulative gain covers build + run; how that moves if volume or gain-per-task is wrong | A single optimistic scenario presented as the forecast |

Output: a short value statement travelling with the feasibility verdict into the SOW — one answers
"can we build it?", the other "should we?". Because both draw on the same sizing numbers, a change
to tier or token budget updates them together.
