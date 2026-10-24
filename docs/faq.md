# Troubleshooting FAQ

Every answer below quotes the refusal the agent actually prints (verbatim from `commands/gt.md`) and points at the doc that owns the depth. This file is a troubleshooting index, not a second reference manual.

## Setup refusals

**"`/gt` says it must run from the project folder that pushes to GitHub"**
Cause: the repo guard runs `git remote get-url origin` before any `gh` call — the command fails (no `origin` remote) or the URL is not a GitHub URL. Fix: run `/gt` from inside the project folder whose `origin` is the GitHub repository. The full four-case table lives in [safety.md](safety.md#repo-guard) — this FAQ does not repeat it.

**"Kickoff refuses because the `<repo>` argument does not match"**
Cause: kickoff reduces your `<repo>` argument the same way as `origin` (drop scheme, host and `.git`, keep the last two path segments) and compares — on mismatch it STOPs. Fix: pass the `origin` remote's `owner/repo` or its URL. Two repositories are never mixed; see [safety.md](safety.md#repo-guard) for the reduction rule.

**"`gh` fails / not authenticated"**
Cause: kickoff runs `gh auth status` first and stops on failure. Fix: run `gh auth login` once (README Prerequisites), then retry.

**"Kickoff says stage issues already exist"**
Cause: kickoff runs `gh issue list --label stage --state open` and refuses while any stage issue is open — duplicates are never created. Fix: use `/gt status` on the existing chain instead, or `/gt skip` / `/gt next` to finish it first.

## /gt next refuses

**Unplanned stage**
`Etapa <N> ainda não planejada — rode /gt plan <N>.` — `/gt next` never plans; `/gt plan <N>` (or `/gt plan all`) adds the plan comment and the `planned` label, then `/gt next` can evaluate.

**Unchecked `- [ ]` items**
The issue lists them and stops. Items are counted across the description and every comment (lines starting with `- [ ]` / `* [ ]`; fenced code blocks and the plan's own footer sentence are ignored). Fix: implement each item in build mode and check it off; checked boxes alone still are not enough — tests and a clean tree are required too.

**No test command defined**
The stage is unverifiable: the plan comment (the last one containing the marker `<!-- gt:plan -->`) must carry a non-empty `Test command:` line inside its `## Tests` section. Fix with `/gt replan <N>`. Only when no plan defines one does `/gt next` fall back to the project's own test script — and only if the project clearly defines one.

**Test files or command do not exist**
The plan was not fully implemented — build mode must create the test files the plan names. Fix: implement them, then re-run.

**Failing tests**
The failures are listed and the issue is not closed. Fix the failures before re-running — failed tests never close an issue, even with every box checked.

**Dirty working tree**
`git status --porcelain` printed files, so the tests just ran on uncommitted work. Fix: commit first via `/cp gt`, then re-run `/gt next`. Details in [safety.md](safety.md#commits-and-cp).

**Consistency warning (non-blocking)**
No subject in `git log --oneline -50` ends with `(#<N>)` for this stage. This is a warning only — it does not block the close. Commit via `/cp gt` with the reference to keep history traceable.

**Next stage unplanned (after a close)**
After closing N, if the next open stage M has no `planned` label, `/gt next` prints `Etapa <M> ainda não planejada — rode /gt plan <M>.` and stops. Run `/gt plan <M>` — `/gt next` never plans the next stage itself.

## /gt close stage and /gt verify

**`/gt close stage` refusals**
- No open stage issue, or you cancel the selection → nothing is touched.
- No `Test command:` line in the stage's plan → it stops and never closes unverified.
- Failing tests → listed, not closed.
- Dirty working tree → stops; commit via `/cp gt` first.

Gate difference: `/gt close stage` is owner-driven — you pick the issue and tests passing is the gate; unchecked boxes are only reported as a note. The close comment is `Stage complete. Tests passed: \`<test command>\`` (plus the pass count in the report). The alternative, `/gt next`, applies the full gate: every `- [ ]` checked AND tests pass AND tree clean, then closes with `Stage complete.`

**`/gt verify <N>` refusals**
- The issue does not exist or does not have the `stage` label → STOP; `/gt` never touches other issues.
- No test command defined → STOP, nothing is run.

Otherwise `/gt verify` is a pure dry-run: it reports the `planned` label, the test result, the unchecked `- [ ]` items, the tree status (`git status --porcelain`), and ends with what `/gt next` would do right now — then edits nothing, closes nothing, and adds or removes no labels.

**Wrong-mode confusions**
- `/gt replan <N>` on a closed stage → STOP; reopen it first with `/gt reopen <N>`.
- `/gt plan <N>` on an already-planned stage → use `/gt replan <N>` instead (old plans stay as history).

## Keeping the docs in sync

`agents/gt.md` and `commands/gt.md` are **byte-copies** of the owner's live opencode config and the source of truth. README and the files under `docs/` are derived from them, and the structural tests check quoted literals and heading order — not prose fidelity. If the live config changes, the docs go stale: re-run the consistency sweep (13 modes and syntaxes, refusal strings, plan format with its `<!-- gt:plan -->` marker and `Test command:` line, the three labels, the close gate and its two exceptions) and fix the doc files only — never the two source files.

Doc map: [usage.md](usage.md) for the per-mode reference, [example.md](example.md) for the worked walkthrough, [safety.md](safety.md) for permissions, the repo guard and invariants, and the [README](../README.md) for install and quick start.
