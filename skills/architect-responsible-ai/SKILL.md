---
name: architect-responsible-ai
description: >-
  Design the safety, risk and compliance layer of a Claude system — where guardrails go and
  which kind, prompt-injection defence, fail-open vs fail-closed, the human-review routing
  rule, fairness instrumentation, third-party Skill audits, and turning compliance obligations
  into controls with owners and evidence. Invoke explicitly (the user asks about guardrails,
  prompt injection, a risk assessment, human review gates, bias/fairness, a Skill audit, or a
  compliance control register). Do not self-invoke during ordinary implementation.
---

# Responsible AI, safety and risk

## Before you start

Read, in this order, whatever exists in the repo:

1. Every place the model is called (search for the SDK import or the model id) and the system
   prompt(s) each call uses.
2. Tool definitions — which ones have side effects (write, send, pay, delete) and what credentials
   they run with.
3. Where retrieved documents or tool results are appended to context.
4. Any existing screening, allowlist, approval step, or audit log.

Then ask the user the things the repo cannot tell you: who the users are, what data classes flow
through (PII, health, financial, minors), which regulation or contract governs it, and who signs
off when the system gets something wrong. If they cannot name that last person, the review-routing
design (section 5) has no owner yet — say so.

State which section you are working in. Do not invoke sibling skills yourself; when a question
belongs to one, tell the user which `/architect-…` skill covers it.

## 1 — What the model already does, and what it cannot do for you

The model ships with general safety behaviour trained in: it declines clearly dangerous requests
and prefers cautious defaults. That behaviour is generic by construction — it existed before your
deployment did — so **it enforces none of your rules**. Revealing one tenant's data to another,
quoting a price outside an approved range, giving advice beyond a scripted scope: all of these can
pass general alignment while breaking your policy.

| | Trained behaviour | Your runtime controls |
|---|---|---|
| Set by | The vendor, before deployment | You, per deployment |
| Covers | Broad harm categories | Your policy, data rules, authorization model |
| Enforced by | Weights — not configurable, does not fail open | Screening, authorization checks, review gates — components you build and operate |

A system prompt *shapes* behaviour. A rule becomes *enforced* only when a check outside the model
can block or reverse the action. Design as layers — trained behaviour, prompt, runtime screening,
authorization — each covering what the previous cannot and failing in a way the next one catches.
Never assume a layer enforces a rule it has never seen; never duplicate a protection a lower layer
already gives you.

## 2 — Risk assessment

Enumerate, don't brainstorm. Cross five sources against five risk categories and mark each cell
*controlled / uncontrolled / not applicable*.

**Sources** (where untrusted content enters): user input · retrieved content · tool results ·
the model's own output · logs and traces.

| Category | Meaning | Typically enters via |
|---|---|---|
| Direct injection | User text overrides instructions | User input |
| Indirect injection | Instructions hidden in documents or tool results the model treats as trusted | Retrieval, tools |
| Budget exhaustion | Oversized or padded input truncates work or inflates cost | User input, retrieval |
| Tool abuse | Model is steered into a side-effecting call outside policy | Any source, executed via tools |
| Data exposure | Sensitive fields land in context or logs where they should not — independent of model behaviour | Retrieval, tools, logs |

Every *uncontrolled* cell where the attack is plausible is a finding. Record each finding as:
category · component · likelihood × impact · mitigating control · owner · evidence artifact. That
record is what a security reviewer signs.

## 3 — Guardrail placement

Three control points answer three different questions. A control at one point does nothing for the
others.

| Control point | When it runs | Question it answers | Prefer |
|---|---|---|---|
| Input screen | Before the model sees the request | Should this reach the model at all? | Deterministic for defined rules (format, length, blocklist); a light classifier for ambiguous intent |
| Output screen | Before the user sees the final response | Is this safe to return? | Validator for schema, forbidden fields, known strings; a judge model for policy or tone |
| Tool-call authorization | Between the model emitting a tool call and the tool executing | May *this caller* do *this action* in *this context*? | **Deterministic, almost always** — allowlist, identity, scope. Authorization must be replayable and provable |

**Chain the two kinds because they fail differently.** A classifier can be *evaded* by phrasing; a
rule is *brittle* — it stops only the patterns it was written for and over-blocks look-alikes. Put them
in series and write down what each one misses so the gap is covered on purpose.

**The loop, drawn correctly.** In an agent, tool calls happen mid-turn, so authorization sits inside
the loop, not after the output screen:

```text
user ──▶ input screen ──▶ ┌─▶ model ──▶ (tool call?) ──▶ tool-call authz ──▶ tool ──┐
                         └──────────────────── result appended to context ◀─────────┘
                                   │ final answer
                                   ▼
                             output screen ──▶ user
every block / failure at any gate is logged with enough to reconstruct it
```

**Indirect injection is the main enterprise vector.** Input screening has already passed the
request by the time a retrieved page or tool result arrives, and agents tend to treat tool output
as authoritative. Any system with retrieval or tools needs the *same* screen applied to retrieved
content and tool results **before they are appended to context**. Name it as its own control or it
will not exist.

**Fail direction — decide it, don't inherit it.** Every guardrail is a service that can time out.
If you do not choose, the surrounding code chooses, and its default is to let the request through
while the dashboard stays green. Rule: **controls fail closed.** A screening outage produces a
degraded *response* — a canned reply, a queued item, a human handoff — never an unscreened model
call. Fallback chains route around unavailable *model* or *tool* dependencies; they may never route
around a control point. (The vendor's trained safety behaviour is not a service you operate and has
no fail-open mode; this decision is about the components you run.)

**API refusals.** When the API itself refuses, the response carries a distinct stop reason and, on
current models, a details object with a policy category and explanation (both may be null). Branch
on the category rather than treating all refusals alike; tolerate the object being absent; and
reset the context — drop or rephrase the offending turn — because resending the same context
refuses again. Look up the current category list in the platform docs; do not hardcode it.

## 4 — Fairness is a property of the pipeline

An output can pass every screen and still treat groups differently. That is not a model
disposition to worry about; it enters at four places you can inspect and instrument:

1. **Retrieval corpus** — over- or under-representation skews context before the model speaks.
2. **Prompt framing** — an embedded assumption pushes outcomes one way.
3. **Few-shot examples** — carry whatever skew the corpus has.
4. **Downstream routing** — after the output, some groups take a different path.

For any decision that affects a person, four checks; a *no* anywhere is a design gap:

- Is each of the four points instrumented so skew would be visible?
- For an adverse decision, can you give the person the inputs and reason in terms they can act on?
- Can you show a regulator from the log that comparable cases were handled comparably?
- Can the team pull the full trace (prompt, retrieved context, output, routing) for a flagged case?

All four rest on **decision logging**: the same instrumentation as observability, but asked
"why did *this* decision happen?" rather than "is the system healthy?" — which changes the retention
period and the query path. See `reference/fairness.md` for the audience table and log fields.

## 5 — Route to humans by stakes, not volume

Reviewer attention is a budget. Spend it where a wrong decision hurts most.

Three variables: **reversibility** (can it be undone?), **cost of being wrong**, **confidence**
(the system's own score — only useful if calibrated, because models are confidently wrong).
Reversibility and cost set the stakes; confidence estimates how likely this particular output is
wrong, i.e. how much volume can pass unreviewed.

> **Rule:** route to a person when confidence is low **and** the action is irreversible or
> high-cost. Let confident, reversible, cheap decisions through. When the variables disagree,
> reversibility and cost win — they set the consequences.

Confirming that the confidence signal is actually calibrated is a separate task; do not assume it.
This rule is the single owner of "when does a human decide" across the suite — the solution-design
skill applies it when assigning work to humans, and in agent designs it becomes a checkpoint:
gate before irreversible actions, sample the rest.

| Placement | Buys | Costs |
|---|---|---|
| Pre-action approval | Nothing irreversible happens unreviewed | Latency per item and a person on call; does not scale |
| Post-action audit | Throughput | The action already happened — only for reversible, cheap decisions |
| Sampled review | System-level quality signal | Individual bad outcomes slip through; it monitors, it does not guard |

**The reviewer needs three things** — the inputs, the output, and *why it was flagged*. Missing
the reason, they cannot tell an edge case from routine; missing the inputs, they cannot judge
correctness. **Do not gate every step**: approvals in bulk become clicks in bulk, and the control
turns into a rubber stamp. Move review up to plan approval and exception handling; a person
monitoring and intervening beats a person approving each step.

## 6 — Compliance: obligation → control → owner → evidence

A route surviving the compliance pre-filter (done in `architect-evals-and-production`) means the
obligation *can* be met, not that it *is*. Frameworks specify outcomes; you own the implementation.
For every obligation write three things:

1. the **technical control** that achieves the outcome,
2. a **named owner** (a person, not a team),
3. the **evidence artifact** showing the control operating — a signed agreement, a configuration
   screenshot, an authorization record, a returned log query.

The artifact is the part teams skip and the part reviewers check. A control with no demonstrable
evidence is treated as absent. Format and worked rows: `reference/control-register.md`.

Two claims never to merge: *not used for training* and *not retained*. Data can be excluded from
training and still be kept for abuse monitoring, legal hold or audit. Say which claim each
assurance makes.

## 7 — Third-party Skills and plugins

A Skill is code plus instructions installed into your environment — a supply-chain surface your
input filters never see. Audit before install, run with least privilege, prefer a trusted-source
policy, and record a verdict (approve / reject / remediate). Procedure and checklist:
`reference/skill-audit.md`.

## Artifacts — only when asked

- **Risk assessment** — the sources × categories grid plus one record per finding.
- **Guardrail design** — control per point, kind and why, fail direction, what it misses and
  which other control covers that.
- **Review-routing spec** — the rule's thresholds for this system, placement per action type,
  reviewer payload.
- **Control register** — one row per obligation.
- **Skill audit record** — per bundle.

## Hand-offs

Do not chain skills yourself; name the one that applies.

- Pattern choice, multi-agent structure → `architect-solution-design`
- Observability fields, integration layers, the route pre-filter, fallback chains →
  `architect-evals-and-production`
- Presenting a compliance posture or limits to a stakeholder; the handoff document that carries
  the register → `architect-discovery-and-tradeoffs`
- Distributing audited Skills to a team, permission posture for developers →
  `architect-team-enablement`
