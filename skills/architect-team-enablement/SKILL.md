---
name: architect-team-enablement
description: >-
  Roll Claude Code out to a team and keep it healthy — shared and enforced configuration,
  champion-then-batch adoption with a success signal, how to distribute Skills across repos,
  spend controls, a verification checklist for AI-generated code, and symptom-to-cause support
  with runbooks and escalation paths. Invoke explicitly (the user is setting up Claude Code for
  a team, planning an adoption rollout, choosing how to share Skills, or supporting a team with a
  live deployment). Do not self-invoke during ordinary implementation.
---

# Team enablement and operational support

Configuring Claude for one person takes minutes. Configuring it for a team is a different job:
common defaults every developer inherits, policy nobody can relax, reusable assets that can be
updated and revoked centrally, spend that stays bounded as usage multiplies, and a support model
that leaves the team more capable after each incident rather than more dependent on you.

Four decisions (§1–§4), then two disciplines (§5–§6). Say which one you are working on.

## Before you start

**Read** what the repo already has: `CLAUDE.md`, `.claude/` (settings, `settings.local.json`,
skills, agents, hooks), `.mcp.json`, any plugin marketplace already registered, and any CI step
that runs Claude. **Ask** for what the repo cannot tell you:

- How many people, in how many teams, and who leads each?
- Which plan or billing route — seat-based plan, API key through a Console workspace, or a cloud
  provider? It decides which distribution and spend controls exist.
- Who approves spend, and what is the monthly ceiling?
- Has security already answered the data questions (retention, training, secrets, MCP reach)?
  If not, §1 starts there.
- Has a rollout already started? If the team is live and the ask is support, skip to §5–§6.

**Stop and route** when the ask is really something else: which model or context strategy a
product should use → `architect-solution-design`; whether a deployment is production-ready →
`architect-evals-and-production`; a control register or a third-party Skill audit →
`architect-responsible-ai`; presenting the rollout to a sponsor → `architect-discovery-and-tradeoffs`.
Name the skill; do not invoke it.

Mechanics — file paths, precedence, permission rule syntax, hooks, marketplace registration,
spend settings — are in `reference/claude-code-team-config.md`. Verify against the live docs
before writing config; those details change.

## 1 — Shared baseline, enforced policy

Two layers, decided separately:

| Layer | Question | Lives in | Who changes it |
|---|---|---|---|
| **Baseline** — what every developer starts from | Conventions, commands, agreed tools, default permission posture, team Skills | Committed project files: `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`, `.claude/skills/` | The team, by PR |
| **Policy** — what no developer may relax | Denied actions (secrets, network, destructive commands), approved MCP servers and marketplaces, whether the no-prompt mode is allowed | Managed settings (org-level, highest precedence) | Platform / security owner |
| **Personal** — what stays individual | Editor habits, personal experiments | `~/.claude/`, `.claude/settings.local.json` | Each developer |

Rule of thumb: **instructions describe, hooks and permission rules enforce.** If something *must*
hold ("never read `.env`", "run the secrets scan before commit"), it goes in a deny rule or a
hook, not in a sentence in `CLAUDE.md`.

**Security's questions come first** — retention and training terms for this plan, secrets
exclusion, MCP server allowlist, network egress, who may disable prompts (list in the reference
file). A rollout that starts before these are answered gets paused by security at the worst
moment. Hand the *control register* format to `architect-responsible-ai`; the answers themselves
belong here.

**Starting from an existing setup:** classify what you find into the three layers. The rollout
question is usually "what should move from personal to baseline, and what from baseline to
policy".

**Exit criterion:** the committed baseline is reviewed and merged; the policy layer is deployed
to at least the pilot machines; security's questions have written answers.

## 2 — Roll out through champions, then batches

An all-hands switch-on produces a spike of confused first prompts and a quiet retreat to old
habits. The pattern that works:

1. Pick one champion per team. Give them access first and a fixed window (about two weeks) to
   convert **one real workflow** — review assistance on PRs, or generating tests for a module.
2. The champion tunes the shared `CLAUDE.md`, builds the first Skills and hooks, and records a
   before/after on the workflow they converted.
3. The champion runs a short session for their first batch of peers, then the next batch.
4. Broad rollout happens only when every team has a working example and a local expert.

The champion takes the early friction and answers the first questions, so you are not the only
person who can.

**Success signal — name it before the first batch.** Pick one or two: weekly active users per
team; share of PRs marked as assisted; time-to-first-merged-PR for new joiners; the champion's
before/after on the converted workflow. Measure through the telemetry export (reference file) or
PR labels. **Stop rule:** batch N+1 starts only when batch N has hit the signal; if a batch
stalls, fix the baseline before adding people.

**Two adoption failures this prevents:**

- **Uneven uptake** — a few heavy users, the rest barely touching it; the practice never
  standardises and the team never sees the real gain.
- **Stuck in chat mode** — Claude used as a question box; nobody enabled tool use, repository
  awareness or packaged Skills past the first step. A licence in hand is not a tool in use.

## 3 — Distribute Skills by audience and control needed

A Skill turns a good local practice into a governed team standard: updates propagate through
versions rather than re-explanation. Pick the channel by who should have it and how much control
you need over access, versioning and rollback.

| Channel | Reaches | Control | Pick when |
|---|---|---|---|
| Project Skill in the repo (`.claude/skills/`) | Whoever works in that repo | Versions with the code; PR review | The procedure is specific to one codebase |
| **Team plugin marketplace** — a git repo of plugins (skills, agents, hooks, MCP config), registered in shared settings so every developer sees it | Every repo, every developer | Versioned by git; a plugin is disabled centrally by editing one settings entry | The default for anything shared across repos or teams |
| Admin-console plugin management (where the plan provides it) | Org or a group, from the console | Console-controlled install policy and updates — verify the current options in the docs | The org has it and wants governed rollout without touching repos |
| Personal skills (`~/.claude/skills/`) | One developer | None | Experiments only — never a rollout channel |
| Skills attached to API calls in your own product | Your product's users | Pinned in code | The Skill is a product feature, not a developer aid |

Managed settings **enforce** configuration; they do not distribute Skills. Do not conflate the
two.

Before distributing any third-party Skill or plugin, audit it (`architect-responsible-ai`, Skill
supply-chain section) — a marketplace entry is code that runs with the developer's permissions.

## 4 — Decide spend controls before invoice one

| Control | Decides | Where set | Owner |
|---|---|---|---|
| Billing route | Seat-based plan vs API key via a Console workspace vs cloud provider — determines which other controls exist | Procurement | Sponsor + platform owner |
| Default model | Which tier a session and its subagents start on | `model` in project/managed settings; subagent model env var | Platform owner |
| Per-user and workspace caps | The ceiling on consumption per person and in total | Admin console (seats) / Console workspace limits (API) | Admin |
| Effort guidance | When to raise effort or tier; default is the mid tier | `CLAUDE.md` guidance, model default | Platform owner |
| Context hygiene | Short, stable `CLAUDE.md`; skills that load on demand; no giant always-loaded files | Repo conventions, code review | Each repo owner |

One person leaving model choice unmanaged sends work to a stronger, pricier tier than the task
needs; across a team that choice is paid on every member and every request. The other hidden
driver is a bloated, frequently edited instruction file that defeats prompt caching. For the
model-selection reasoning itself, see `architect-solution-design`.

## 5 — Diligence: the verification checklist

AI assistance pays off inside the existing workflow — editor, review, test loop — not in a
separate chat window. Integration is also how team knowledge gets encoded: conventions and review
standards move from people's heads into Skills, hooks and project configuration.

Moving faster must not mean reviewing less. The subtle failure is an engineer merging code they
can no longer fully explain, because it reads well and a check passed. The countermeasure is a
**verification checklist** every AI-generated change must pass before production, covering four
dimensions:

| Dimension | Example check |
|---|---|
| Correctness | Tests exist and pass; behaviour matches the requirement including edge cases |
| Security | No secrets in code; inputs validated; tools and external calls use least privilege |
| Maintainability | Reads clearly, follows team conventions, no unexplained complexity |
| Human understanding | The submitting developer can explain what it does and why, including inputs it was not tested against |

Wherever a check can be automated, automate it: a regression suite, an eval set and a hook turn
correctness from a reviewer's judgement into an automated gate on each change. The checklist says
what must be true; tests and evals prove it repeatably. Have the team write their own checklist —
the four dimensions are fixed, the concrete checks are theirs.

## 6 — Operational support: translate symptoms, then leave a runbook

When a live deployment surprises the team, they report a symptom — latency spiked, outputs
degraded, a tool started failing — not a cause. Your value is connecting the symptom to its
architectural cause. Resolving the incident yourself is firefighting; teaching the path the team
can walk again is support that lasts.

**Symptom → likely cause → first action** (starting points, not a diagnosis):

| Symptom | Look first at | First action |
|---|---|---|
| Latency spike | Growing context per call; a model change; retries hiding rate limits; a slow tool | Compare p95 by step; check context size and retry counts in the logs |
| Output quality drifted, nothing deployed | Input distribution shift; a retrieval index gone stale; a model version rolled forward | Re-run the eval set; diff inputs against the eval distribution; check the pinned model id |
| Tool started failing | Credential rotation; schema change upstream; permission tightened | Reproduce the tool call outside the model; check auth and schema |
| Cost jumped | Volume; longer conversations; cache misses after a prompt edit; model tier drift | Cost per interaction over time; cache hit rate; model mix |
| Agent loops or stalls | Ambiguous stop condition; tool errors returned as text | Read one full trace end to end before changing anything |
| Sudden refusals or off-policy answers | Guardrail or system prompt change; injected content in retrieved data | Diff the prompt; inspect the retrieved context of a failing case |

For the fuller failure-mode-by-architecture reasoning, see `architect-evals-and-production`. The
governance table that says *who acts on which signal* belongs to
`architect-discovery-and-tradeoffs`; this skill owns *how to diagnose once they act*.

**Leave behind two artifacts:**

- **Runbook** — the known symptom → cause → action paths, so recurring issues are resolved
  without you. Every incident you handle adds a row.
- **Escalation path** — who handles what, and the boundary at which an issue leaves the team.

The goal: a team that calls you for novel problems, never for familiar ones.

## Artifacts — only when asked

- **Team baseline**: proposed `CLAUDE.md` sections, tool/MCP list, permission rules and hooks,
  Skills list — split into baseline vs policy layer.
- **Rollout plan**: champions per team, the workflow each converts, batch schedule, success
  signal and stop rule.
- **Skills distribution decision**: channel per Skill with the audience/control reason.
- **Spend posture**: the table in §4 with values, locations and owners.
- **Verification checklist**: the team's concrete checks under the four dimensions.
- **Runbook + escalation path**: the §6 table filled with this deployment's actual incidents.

Default to reasoning in the conversation; write files when the user asks for them.

## Hand-offs

Name the skill; do not invoke it.

- Which model a product should default to, context strategy → `architect-solution-design`;
  permission-mode semantics → `architect-solution-design/reference/entry-points.md`
- Failure modes by architecture, observability fields the runbook depends on →
  `architect-evals-and-production`
- Auditing third-party Skills and plugins before distribution, control register format →
  `architect-responsible-ai`
- Presenting the rollout or its cost to a sponsor, SLA and governance table →
  `architect-discovery-and-tradeoffs`
