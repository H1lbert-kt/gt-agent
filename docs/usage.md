# Usage reference

Human-readable companion to `commands/gt.md` (the machine-readable source of truth). Every mode below is defined there; this file documents syntax, what each mode reads, what it writes on GitHub, and what it refuses to do. For a worked walkthrough see [example.md](example.md); for permissions, the repo guard and invariants see [safety.md](safety.md); for the refusal-by-refusal troubleshooting index see [faq.md](faq.md).

## Labels

- `stage` — marks a stage issue. `/gt` never touches issues without this label.
- `planned` — the stage is ready to build. Only `/gt plan` and `/gt replan` add it; `/gt next`, `/gt skip` and `/gt close stage` never plan.
- `skipped` — the owner chose to skip the stage; `/gt skip` adds it and closes as `not planned`.

## Plan marker

A stage plan is always a NEW comment starting with the marker `<!-- gt:plan v2 -->`, using fixed headings (Goal, Scope, Included, Not included, Constraints, Technical approach, Implementation steps, Tests, Acceptance criteria, Risks) and a non-empty `Test command:` line. `## Constraints` holds the rules inherited from the project's AGENTS.md/README that bound the technical approach, as a plain placeholder line (never a `- [ ]` item, which would block `/gt next` forever); acceptance criteria must be verifiable — a named command, a file/line, or an observable behavior. Plans written by older versions start with `<!-- gt:plan -->` and stay valid: every lookup matches the prefix `<!-- gt:plan`, so legacy plans keep working and are never rewritten. An issue's original description is never rewritten; old plans stay as history. Modes `next`, `verify` and `close stage` find a stage's test command by taking the LAST comment with the marker and reading its `Test command:` line — never guessing a command.

## Stage dependencies

Stage issues are chained with NATIVE GitHub issue dependencies via the `addBlockedBy` GraphQL mutation (`gh api graphql`), never a `Blocked by #N` text line in an issue body. Node IDs come from `gh issue view <N> --json id`; verification via `--json blockedBy`. Bodies stay untouched.

## Read-only modes

These modes never write to GitHub (no comment, label, close, create or edit):

- `/gt help` — prints the built-in help.
- `/gt status` — dashboard of all stages, current stage, criteria progress, plus a one-line integrity summary when the error-class checks fail.
- `/gt verify <N>` — dry-run of the `/gt next` gate: runs the stage's tests, reports criteria and tree state, closes nothing.
- `/gt log` — changelog of closed stages.
- `/gt start` — surveys existing (non-stage) issues and reports where to begin.
- `/gt impact <N>` — pre-replan advisory: what changing stage N would affect downstream (native dependencies, confidence-graded plan file overlap, retrospective history); signals, never conclusions.
- `/gt doctor` — deep integrity audit of the stage chain: reports errors vs warnings and only suggests commands, never auto-corrects.

The `--dry-run` flag on `/gt plan` is also read-only: it drafts plans in the conversation and never writes comments, labels or issues.

## Writing modes

These modes write to GitHub:

- **kickoff** (`/gt <repo> <prompt>`) — creates stage issues with the `stage` label and native dependencies.
- **plan** (`/gt plan …`) — appends plan comments (`<!-- gt:plan v2 -->`) and adds the `planned` label; `plan new issue` also creates new stage issues.
- **next** (`/gt next`) — closes the current stage when the gate passes.
- **skip** (`/gt skip`) — comments, adds `skipped`, closes as `not planned` (after confirmation).
- **close stage** (`/gt close stage`) — closes an owner-chosen open stage when tests pass.
- **replan** (`/gt replan <N>`) — appends a new plan comment; keeps `planned`.
- **reopen** (`/gt reopen <N>`) — reopens a closed stage; removes `skipped` if present.
- **retro** (`/gt retro <N>`) — appends a retrospective comment.

## Mode reference

Every mode runs against the repository of the current directory (repo guard: `git remote get-url origin` must be a GitHub URL; argument repo must match for kickoff). Two repositories are never mixed; no `gh` command uses `-R`.

### /gt help

- Syntax: `/gt help` (also `help`, `-h`, `--help` or empty arguments).
- Reads: nothing.
- Writes: nothing.
- Refuses: nothing — always prints the built-in help text.

### /gt \<repo\> \<prompt\>

- Syntax: `/gt <owner/repo|URL> <prompt>`.
- Reads: whole project (AGENTS.md, README, code, tests, git state), existing issues.
- Writes: one issue per stage (label `stage`, no `planned`), labels `stage`/`planned`/`skipped` (created if missing), native `addBlockedBy` dependencies between consecutive stages.
- Refuses: repo-guard mismatch (argument repo ≠ origin), no prompt, open `stage` issues already present (no duplicates).

### /gt plan

- Syntax: `/gt plan <N>` · `/gt plan stage <N>` · `/gt plan all` · `/gt plan new issue <prompt>` · any of these with `--dry-run`.
- Reads: whole project analysis, the stage issue's description and comments, stage history.
- Writes: appends a plan comment (`<!-- gt:plan v2 -->`) and adds `planned`; `plan new issue` creates new stage issues (label `stage`, no `planned`).
- Refuses: issue without `stage` label; already-planned stage (use `/gt replan <N>`); `--dry-run` never writes anything.

### /gt next

- Syntax: `/gt next`.
- Reads: lowest open `stage` issue, its checkboxes (description + comments), its plan's `Test command:` line, git state.
- Writes: closes the stage with an evidence comment — `Stage complete. Tests passed: \`<test command>\` — pass: <count|not reported>. Commits: <subjects|none>.` — when the gate passes.
- Refuses: unplanned stage; any unchecked `- [ ]`; no test command defined; failing tests; dirty working tree (`git status --porcelain`). Never plans the next stage itself.

### /gt skip

- Syntax: `/gt skip`.
- Reads: lowest open `stage` issue.
- Writes: `Skipped by owner` comment, `skipped` label, closes as `not planned`.
- Refuses: without explicit owner confirmation (asks first); does not advance the chain automatically.

### /gt status

- Syntax: `/gt status`.
- Reads: all `stage` issues (open + closed), checkboxes of open ones, native `blockedBy` dependencies.
- Writes: nothing.
- Refuses: nothing — read-only dashboard.

### /gt verify \<N\>

- Syntax: `/gt verify <N>`.
- Reads: issue N's labels, plan marker and `Test command:` line, checkboxes, git state.
- Writes: nothing (dry-run of the `/gt next` gate).
- Refuses: issue without `stage` label; no test command defined. Never closes, never edits, never changes labels.

### /gt replan \<N\>

- Syntax: `/gt replan <N>`.
- Reads: whole project analysis, issue N's description and plan history, git state (`git status --porcelain`); asks for a one-line reason (optional).
- Writes: appends a NEW plan comment (`<!-- gt:plan v2 -->`); ensures `planned` is present.
- Refuses: issue without `stage` label; closed stage (use `/gt reopen <N>` first); a dirty working tree — it warns `o plano novo pode ficar desatualizado em relação ao código não commitado`, asks `Replanjar mesmo assim? responda sim para confirmar.` and stops without writing anything unless confirmed. Never deletes old plans.

### /gt impact \<N\>

- Syntax: `/gt impact <N>`.
- Reads: issue N's labels/state, native dependency edges (`gh issue view <N> --json blockedBy,blocking`), plan comments of every stage (prefix `<!-- gt:plan`), `## Retrospective` comments of N and the surfaced stages.
- Writes: nothing — advisory only; requires no `planned` label and works on open or closed stages.
- Refuses: issue without `stage` label (same refusal as `verify`/`replan`/`retro`/`reopen`). File-mention overlap is graded high/medium/low and always labeled a signal, never a conclusion; impact never plans — `/gt replan <N>` does that.

### /gt retro \<N\>

- Syntax: `/gt retro <N>`.
- Reads: whole project analysis, issue N's description, plan comments, checked criteria, commits referencing `(#N)`.
- Writes: appends a `## Retrospective` comment.
- Refuses: issue without `stage` label. Never closes the stage, never changes labels; touches only the named issue.

### /gt log

- Syntax: `/gt log`.
- Reads: closed `stage` issues (number, title, close date, `stateReason`).
- Writes: nothing.
- Refuses: nothing — read-only changelog.

### /gt close stage

- Syntax: `/gt close stage`.
- Reads: open `stage` issues (owner picks one), its plan's `Test command:` line, git state.
- Writes: closes the chosen stage with an evidence comment — `Stage complete. Tests passed: \`<test command>\` — pass: <count|not reported>. Commits: <subjects|none>.`
- Refuses: no test command defined; failing tests; dirty working tree (tell owner to commit via `/cp gt` first). Owner-driven: the gate is tests passing; unchecked boxes are only reported.

### /gt reopen \<N\>

- Syntax: `/gt reopen <N>`.
- Reads: issue N's state and labels.
- Writes: reopens the issue; removes `skipped` if present.
- Refuses: issue without `stage` label; already-open stage (nothing to do). Never plans or closes.

### /gt start

- Syntax: `/gt start`.
- Reads: all open issues (labels, assignees, dependencies, PRs), deep-reads at most the top 5.
- Writes: nothing — report only.
- Refuses: nothing — read-only. Suggests adopting the stage workflow but never executes it.

### /gt doctor

- Syntax: `/gt doctor` (no further arguments).
- Reads: all `stage` issues (open + closed: body, comments, labels, state, native `blockedBy`), `git log --oneline -50`, `git status --porcelain`.
- Writes: nothing — report only, never auto-corrects (suggests commands instead).
- Refuses: nothing beyond the repo guard. Errors (E1-E5): `planned` stage without a valid plan comment / `Test command:` line; plan heading order violated; `blockedBy` chain diverging from stage numbering; `skipped` label on an open stage; a `- [ ]` item inside `## Constraints`. Warnings (W1-W5): open stage without `planned`; closed stage with no `(#N)` commit; skipped stage with unwired dependents; orphan checkboxes; inconsistent labels. A skip-induced chain gap is reported once as W3, not as E3.
