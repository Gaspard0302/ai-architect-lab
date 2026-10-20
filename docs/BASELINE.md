# Preparation baseline — 2026-10-20

## Verified

- 51 retained course files match the initial source bytes, including all raw and formatted content.
- All 12 immutable sources (10 raw captures and 2 PDFs) match their recorded SHA-256 hashes.
- Lesson validators pass for both courses; their sentence-coverage heuristic reports 100% for each lesson.
- Both question banks validate: 246 architect questions and 54 developer questions.
- All 440 question source anchors resolve.
- Seven canonical skill entrypoints and their named references validate.
- The five architecture skills have zero 10-word overlaps detected against formatted architect lessons/drills.
- Seven generated ZIPs have the same file lists and bytes as their canonical skill directories.
- The prepared text files contain no prior company branding or prior repository identifier.
- Git history is initialized independently; no remote is linked and no environment secrets or learner data are included.
- GitHub account access is verified for `Gaspard0302`.

## Still open

- A fresh locked dependency install did not finish: restricted network failed first, then
  the network-enabled attempt encountered repeated download failures. The temporary
  installation was removed.
- Reusing AirDropped dependencies allowed content checks but was insufficient for full
  app verification: ESLint could not resolve `eslint-plugin-react-hooks`, and Vitest
  stalled while importing native tooling. Those processes were stopped and the temporary
  dependency copy removed. Local macOS lint and unit tests remain **unverified**;
  the clean Linux CI run below subsequently passed both.
- The production build subsequently passed in CI. The browser walkthrough has **not been run**.
- The public CI workflow subsequently **passed end to end** on `8bc28eb`: public code/skill
  checks, unit tests, skill packaging, and production build. See the
  [verified CI run](https://github.com/Gaspard0302/ai-architect-lab/actions/runs/39463712992).
  Local macOS dependency problems remain separate from the successful clean CI run.
- Skill behavior and clean installation in recipient tools have **not been evaluated**.
- The user confirmed one public repo for skills and the future mock-exam website. The
  public repository is created. The user confirmed the private corpus stays local;
  public source history excludes it.
- Vercel CLI is authenticated as `gaspard0302`. No website project is linked or deployed.
  A personal progress database and learner-facing MCP operations remain unconfigured.

The raw captures intentionally retain their original whitespace. Do not apply blanket
whitespace cleanup to immutable source material.
