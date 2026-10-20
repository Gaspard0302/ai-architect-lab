# Claude Code team configuration — mechanics

> Product surfaces change. Everything below was correct at the time of writing; before writing a
> settings file or a rollout doc, confirm key names, file paths and admin features against the
> live Claude Code documentation. Where confidence is lower, the line says so.

## Where configuration lives, and what wins

| Layer | File | Who controls it | Purpose |
|---|---|---|---|
| Managed (enterprise) | `managed-settings.json` in the OS system location (macOS `/Library/Application Support/ClaudeCode/`, Linux `/etc/claude-code/`, Windows `%ProgramData%\ClaudeCode\`) — deployed by MDM or provisioning; some plans also push it from the admin console | IT / platform team | Policy developers cannot override |
| Command line | `--model`, `--permission-mode`, … | The developer, per session | One-off overrides |
| Project local | `.claude/settings.local.json` (gitignored) | The developer | Personal overrides in one repo |
| Project | `.claude/settings.json` (committed) | The team, via code review | The shared baseline |
| User | `~/.claude/settings.json` | The developer | Personal defaults everywhere |

Precedence is top-down: managed beats everything; project beats user. A rollout decision is
therefore two decisions — **what goes in the committed project file** (baseline) and **what goes
in managed settings** (policy nobody may relax).

Content that is instructions rather than configuration: `CLAUDE.md` (project), `~/.claude/CLAUDE.md`
(personal), `.claude/rules/` if the team uses per-path rules. Instructions are advisory; hooks
and permission rules are enforced — put anything that *must* hold in the enforced layer.

## Enforce, don't describe

| Need | Mechanism | Example |
|---|---|---|
| Block an action outright | `permissions.deny` | `Bash(curl *)`, `Read(./.env)`, `Read(./secrets/**)` |
| Allow without prompting | `permissions.allow` | `Bash(pnpm test *)`, `Bash(git diff *)` |
| Always confirm | `permissions.ask` | `Bash(git push *)` |
| Run a check around a tool call | `hooks` — `PreToolUse` / `PostToolUse` / `Stop` etc. | Secrets scan before `Edit`, formatter after `Write`, test run on `Stop` |
| Forbid the no-prompt mode | `disableBypassPermissionsMode` (managed) | Set in managed settings for regulated teams |
| Control MCP servers | Project `.mcp.json` for the agreed set; settings keys for approving project servers; managed allow/deny lists for MCP servers — confirm current key names | Only the approved Jira and internal-docs servers; nothing that reaches production databases |
| Control which plugins/marketplaces can be added | Marketplace and plugin keys in managed settings — confirm current names | Only the team's marketplace repo |

A hook fails closed if it exits non-zero on the blocking exit code; test each hook on a sample
before rolling it out, or it will block the whole team on day one.

## Distributing Skills, agents, hooks and MCP config across repos

| Channel | Reaches | Versioning / revocation | Use for |
|---|---|---|---|
| `.claude/skills/` (and `.claude/agents/`, hooks in project settings) committed in the repo | Everyone in that repo | With the code; PR review | Procedures specific to one codebase |
| **Team plugin marketplace** — a git repo with `.claude-plugin/marketplace.json` listing plugins (each bundling skills, agents, hooks, MCP config); registered via `extraKnownMarketplaces` in settings so it is known to every developer, with `enabledPlugins` to turn plugins on; developers can also add it with `/plugin marketplace add <owner>/<repo>` | Every repo, every developer who has the marketplace | Git tags/versions; disable a plugin centrally by editing the settings entry | The default cross-repo channel for a team or org |
| Admin-console plugin management (where the plan offers it) | Org or group, from the console | Console-controlled install policy and updates | Prefer it when available; verify the exact policy options in the live docs — do not assume a specific vocabulary |
| `~/.claude/skills/` | One developer | None | Personal experiments — never a rollout channel |
| Skills attached to API requests in your own product | Your product's users | Pinned in code | A product feature, not a developer aid |

Managed settings **enforce** configuration; they are not how skills reach people. Do not conflate
the two.

## Spend controls

| Control | Where set | Owner |
|---|---|---|
| Billing route — seat-based plan vs API key through a Console workspace | Procurement decision; determines which of the rows below exist | Sponsor + platform owner |
| Default model | `model` in project or managed settings; `CLAUDE_CODE_SUBAGENT_MODEL` for subagents | Platform owner |
| Per-user spend cap | Admin console, for Claude Code seats on team/enterprise plans | Admin |
| Workspace spend / rate limits | Console workspace limits (API billing) | Admin |
| Effort / thinking guidance | `CLAUDE.md` guidance plus the model default; a per-user model allowlist is **not** something to promise — confidence low that one exists as a setting | Platform owner |
| Context hygiene | Keep `CLAUDE.md` short and stable so the prompt prefix caches; avoid giant always-loaded files; prefer skills that load on demand | Every repo owner |

Long, frequently edited `CLAUDE.md` files and huge tool outputs are the usual hidden cost driver
in a team rollout — they defeat prompt caching on every request.

## Measuring adoption

Claude Code can export usage metrics and events over OpenTelemetry (enable via the documented
telemetry environment variables, point at the team's collector). Use it for: active users per
squad, sessions, tokens and cost per user, lines changed, tool acceptance rates. Combine with
`git log` trailers or PR labels if the team marks assisted PRs. Confirm the current metric names in
the docs before promising a dashboard.

## Questions security will ask before day one

- Where does code and prompt content go, is it retained, and is it used for training under this
  plan? (Get the answer for *your* plan and route in writing.)
- Is a zero-retention arrangement available and required?
- Which files must never be read (`.env`, key material, customer exports) — enforced by deny
  rules, not by `CLAUDE.md`.
- Which MCP servers may be connected, and can any of them reach production data or take actions?
- What network egress does the tool need; is a proxy or gateway required?
- Who can turn off permission prompts, and is that mode disabled by policy?
