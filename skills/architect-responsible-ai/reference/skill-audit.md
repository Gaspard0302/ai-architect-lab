# Auditing a third-party Skill or plugin

A Skill bundle is executable code and instructions that run inside your environment with your
credentials. Conversation-level filters watch the user; they never see what was packaged upstream.
Output monitoring may notice a consequence — after the code has already run. So the control has to
move to **before install**.

## Procedure

1. **Fix the baseline.** Write down what the Skill claims to do in one sentence. Everything in the
   bundle is judged against that sentence.
2. **Read the whole bundle** — `SKILL.md`, scripts, hooks, any config it drops. Flag two things:
   - **Anomalous capabilities**: network calls, shell execution, filesystem writes outside its
     working area, reading environment variables or credential files, downloading code at runtime.
   - **Out-of-scope behaviour**: anything not needed for the one-sentence purpose. A formatter that
     makes HTTP requests, a summariser that writes files, a linter that reads `~/.ssh`.
3. **Check what the platform already checks.** Find out what automated vetting the marketplace or
   registry performs and, more importantly, what it does not. Do not assume it reviewed the code.
4. **Assume the audit misses something.** A clean bundle can still fetch code later. Run Skills
   with least privilege: constrained filesystem, constrained network, no standing credentials the
   task does not need. The audit decides admission; the sandbox limits what an admission mistake
   can do. Neither is sufficient alone.
5. **Record the verdict.**

| Verdict | Meaning | Then |
|---|---|---|
| Approve | Nothing beyond the stated purpose | Pin the version; re-audit on update |
| Reject | Capabilities or behaviour you cannot justify | Do not install; note why |
| Remediate | Fixable — remove a call, sandbox an operation, pin a safer version | Apply the fix, re-audit from step 2 |

## Standing policy

- **Trusted sources only**: an internal registry, verified publishers, or signed releases. This
  shrinks the audit surface rather than replacing the audit.
- **Pin versions.** An approved Skill that auto-updates is an unapproved Skill.
- **Re-audit on any version change**, however small the diff claims to be.

## Audit record fields

bundle name and version · stated purpose · source and publisher · anomalous capabilities found ·
out-of-scope behaviour found · sandbox and privilege configuration · verdict · auditor · date
