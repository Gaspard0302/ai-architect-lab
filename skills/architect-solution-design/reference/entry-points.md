# Entry point, build-time interface, delivery route

Three independent decisions, made for three different audiences. Muddled architecture
conversations almost always come from treating them as one.

| Decision | Answers | Decided by |
|---|---|---|
| **Entry point** | What does the user actually touch? | Who the user is and what their work looks like |
| **Build-time interface** | How does an engineer program against the model? | The engineering team and the integration shape |
| **Delivery route** | Whose infrastructure terminates the API call, in which region? | Existing cloud commitments and compliance posture |

Decide in that order, and name the user before the entry point — otherwise engineering tools get
proposed to non-engineering audiences because "it's all the same model underneath". It is; the
wrapper is what the audience experiences.

## Entry points

| Surface | Audience | Trade |
|---|---|---|
| Consumer / enterprise chat app (web, desktop, mobile) | People who want a collaborator, not a build project. Business tiers add admin controls, SSO, retention settings, audit logs, and eligibility for health-data agreements | No build cost, no integration surface — you get what ships |
| Claude Code (terminal, IDE, desktop, web) | Engineers working in a codebase under configurable permissions | Excellent for engineering; wrong shape for anyone else |
| Desktop agent for non-developers (local files and apps) | Knowledge workers who need actions taken, not text produced | Real side effects, so permission scoping and review matter more than in chat |
| Browser extension | Work that lives inside web applications | Action anchored to the browser |
| Spreadsheet add-in | Analysts whose tool is the spreadsheet | Action anchored to the workbook |

Product names, availability and capabilities change; confirm against current documentation before
committing a design to any surface.

## Build-time interfaces — layers, not rivals

| Interface | Gives you | Trade |
|---|---|---|
| Raw HTTP API | Everything, with nothing done for you: retries, streaming, tool plumbing, telemetry are all yours | Total control, total responsibility; use when an SDK lacks a feature |
| Language SDK | Typed calls with auth, retries, streaming and tool plumbing handled; any agent loop is still your code | Ergonomics over control — **the default for embedding the model in a product** |
| MCP | A protocol for publishing tools, prompts and resources so any compatible client discovers them | Reuse across clients at the cost of a server to run; with a single client it is pure overhead |
| Agent SDK | The managed agent loop (iteration, tool execution, termination) running inside your own app | A working loop immediately, less say over how it iterates |

The decision people get wrong:

| Need | Reach for |
|---|---|
| One request in, one response out | API / SDK |
| The same tools available to several different clients | MCP |
| Multi-turn autonomous action inside your product | Agent SDK |

MCP is how a tool surface is *published and found*; API tool use is how the model *invokes* a tool
inside one request. An MCP server publishes tools that clients then invoke through ordinary tool
use. The plain SDK runs no loop; the Agent SDK is the loop.

## Claude Code — shaping versus governing

Two separate groups of configuration. Shaping decides what the agent knows and tends to do;
governing decides what it is permitted to touch. Confusing them produces agents that are either
useless or unsafe.

**Shaping**

| Layer | Use for |
|---|---|
| `CLAUDE.md` | Context every task needs: conventions, layout, standards |
| Skills | Procedures the team repeats; loaded on demand so they do not bloat every session |
| Subagents | Work that should run isolated — restricted tools, a different prompt, its own context |
| MCP servers | A tool surface more than one client needs |

**Governing**

| Layer | Use for |
|---|---|
| Hooks | A check that must be deterministic and impossible to skip — the guarantee comes from code |
| Permissions and approval flows | Any environment where an unintended action costs something |
| Sandboxing / restricted execution | Consequences are real and an approval prompt is not enough — the environment holds the line, not the model's judgement |

Permissions bound *what may be touched*; hooks bound *what must happen around an action*. One does
not replace the other.

Permission modes at the time of writing: `default` (prompt on each sensitive action) · `acceptEdits`
(file edits and routine filesystem commands pre-approved; other shell commands still prompt) ·
`plan` (read-only until a plan is approved) · `auto` (a classifier approves safe actions and blocks
risky ones) · `dontAsk` (anything that would prompt is denied; only allow-listed actions run — the
CI lockdown) · `bypassPermissions` (no checks; isolated containers only). Confirm the current list
in the Claude Code docs.

## Delivery routes

The model behaves identically on every route. The decision is about **what the organisation has
already committed to**: which cloud account absorbs the spend, which identity system authenticates,
which region traffic terminates in, and which procurement contract already exists.

| Route | Pick when |
|---|---|
| Anthropic first-party API | No binding cloud commitment; wants features the day they ship; happy to hold AI spend with the vendor. **Default absent a procurement or residency pull** |
| AWS Bedrock | Committed AWS agreement and AWS-hosted stack; spend should draw down the commitment; identity, networking and audit inherit from the account. Region must be set explicitly; cross-region routing has its own configuration objects |
| GCP Vertex AI | Stack on GCP, ML tooling already in Vertex, wants one billing and audit surface; models enabled per project |
| Microsoft Foundry | Microsoft agreement, identity in Entra ID, footprint on Azure. Hosting arrangements differ by model — confirm where inference actually runs before relying on it for residency or GDPR claims |

Routes operated by the cloud partner rather than by Anthropic tend to receive new features later —
sometimes weeks, sometimes longer for major capabilities. Ask whether an Anthropic-operated hosting
option exists inside the cloud you need before accepting that lag.

Portable across routes: prompts, eval strategy, tool use, context behaviour. Route-specific: model
identifier strings, regional availability, and the cloud's wrappers around inference (inference
profiles, deployments, per-project enablement).

## Skills as a delivery mechanism

Beyond packaging a procedure, a Skill can be attached to API requests, published and versioned
through the platform, and kept under version control like any deployed asset. Running one requires
a code-execution sandbox, which becomes a dependency of the design. When the question is "how does
a reusable procedure reach the model?", the three answers are direct tool use, MCP, or a versioned
Skill.
