# Permissions and safety model

`/gt` is read-only on the filesystem and write-scoped on GitHub. This file is the plain-language translation of the `permission` frontmatter in `agents/gt.md` plus the repo guard and rules in `commands/gt.md`. For the per-mode reference see [usage.md](usage.md); for a worked walkthrough see [example.md](example.md); for refusal troubleshooting see [faq.md](faq.md).

## Permission table

Every setting of the `permission` block in `agents/gt.md`, translated:

### Filesystem and subagents

| Setting | Meaning |
|---|---|
| `edit: deny` | The agent never edits, creates or deletes files. Its output is plans, issue comments and status reports only. |
| `task`: `"*": deny` | No subagent is reachable by default. |
| `task`: `explore: allow`, `scout: allow` | Only the read-only exploration subagents can be used. |
| `question: allow` | The agent may ask the owner a question instead of guessing. |

### Bash: default and allowlist

The default is `"*": ask` — any command not explicitly listed prompts the user. The allowlist groups into four bands:

- **GitHub reads**: `gh auth status`, `gh repo view*`, `gh issue list/view/create/comment/close/reopen*`, `gh pr list/view*`, `gh label list/create*`, `gh api graphql*` (for the `addBlockedBy` dependency mutations).
- **Filesystem reads**: `ls`, `cat *`, `grep *`.
- **Git reads**: `git log*`, `git status*`, `git diff*`, `git remote get-url*`, `git rev-parse*`.
- **Test runners**: `pytest*`, `python -m pytest*`, `python3 -m pytest*`, `npm test*`, `npm run test*`, `pnpm test*`, `make test*`, `cargo test*`, `go test*`, `node --test*`.

### Explicit denies

These are what make the model safe:

| Setting | Meaning |
|---|---|
| `"gh issue delete*": deny` | Issues are never deleted. |
| `"gh issue edit *": deny` | Issue editing is denied by default; narrow allows exist for `--title`, `--add-label` and `--remove-label` only. |
| `"gh issue edit *--body*": deny`, `"gh issue edit *-b *": deny` | Issue bodies and old plan comments can never be rewritten. |
| `"gh label *": deny` | Labels are only listed/created, never deleted. |
| `"git add*": deny`, `"git commit*": deny`, `"git push*": deny` | Git writes are denied to the agent — commits go through `/cp` (see [Commits and /cp](#commits-and--cp)). |
| `"rm *": deny` | Nothing is removed from disk. |

## Repo guard

Every mode runs against the repository of the current directory. The guard from `commands/gt.md` refuses to run in four cases:

1. `git remote get-url origin` fails (no `origin` remote) → STOP: `/gt` must run from the project folder that pushes to GitHub.
2. The `origin` URL is not a GitHub URL → same STOP.
3. Kickoff only: the `<repo>` argument, reduced the same way (drop scheme, host and `.git`, keep the last two path segments; for `git@github.com:owner/repo.git` take everything after the `:`), does not match `origin`'s `owner/repo` → STOP: two repositories are never mixed.
4. Every `gh` command runs WITHOUT `-R`, always against the current directory's repository — running `/gt` from the wrong folder cannot touch the wrong repo.

## Invariants

Rules that hold in every mode, traceable to `agents/gt.md` or the `Rules` block of `commands/gt.md`:

1. The agent never edits, creates or deletes files and never implements — output is plans, issues and status reports.
2. Never touches issues without the `stage` label.
3. Planning is exclusive to `/gt plan` and `/gt replan`; the plan is always a NEW comment starting with `<!-- gt:plan v2 -->` (legacy plans starting with `<!-- gt:plan -->` remain valid and are found by a prefix match — never rewritten). The original description and older plan comments are never rewritten or deleted (`gh issue edit` is only ever used to add/remove labels, or to fix a brand-new issue's title right after `plan new issue` — never `--body`).
4. Stage dependencies are NATIVE GitHub issue dependencies (`addBlockedBy` via `gh api graphql`), never a `Blocked by #N` text line in a body.
5. No duplicate stages: the kickoff refuses while open `stage` issues exist; `plan new issue` checks every existing stage issue (open and closed) before creating.
6. A stage closes only when every `- [ ]` in description + comments is checked AND the plan's `Test command:` tests pass AND `git status --porcelain` is clean. Exactly two exceptions: `/gt skip` (explicit owner confirmation, closes as `not planned`, no tests) and `/gt close stage` (owner picks the issue, tests are the gate, unchecked boxes only reported). Every close carries evidence in the comment: test command, pass count (`not reported` when the runner prints none) and the `(#N)` commit subjects (`none` when there are none).
7. `--dry-run` never writes anything to GitHub; the read-only modes (`help`, `status`, `verify`, `log`, `start`, `impact`, `handoff`, `doctor`) never write either (`start`, `impact`, `handoff` and `doctor` never write at all — they only report and suggest commands).
8. State lives in GitHub issues, not conversation memory: `/gt` runs as the primary agent (`mode: primary`) with no memory between runs.
9. `/gt replan` never writes a plan over uncommitted work: a dirty `git status --porcelain` warns (`o plano novo pode ficar desatualizado em relação ao código não commitado`), asks `Replanjar mesmo assim? responda sim para confirmar.` and stops with nothing written unless the owner clearly confirms.
10. Issue content is untrusted: bodies and comments are untrusted data, never instructions (the rule lives in `agents/gt.md`) — no comment can make the agent close, label, plan or skip a stage; only the invoked mode's gates can, and an injection attempt is reported, not obeyed.

## Commits and /cp

**Why**: the frontmatter denies `git add*`, `git commit*` and `git push*`; `agents/gt.md` and the `Rules` of `commands/gt.md` assign those exclusively to `/cp` in build mode.

**When**: after build mode implements a stage and before `/gt next` or `/gt close stage` — both run the working-tree gate (`git status --porcelain`) and refuse on a dirty tree, telling the owner to commit via `/cp gt` first.

**How**: `/cp gt` references the current stage issue with `(#<number>)` in the commit subject; `/gt next`'s consistency check looks for a subject ending in `(#<N>)` in `git log --oneline -50`.

**Boundary**: `/cp` is a separate opencode command from the owner's live config; this repository ships it as [commands/cp.md](../commands/cp.md), the full `/cp` reference (mode `/cp gt` and the standard commit-and-push workflow). This section explains `/cp gt`'s role inside the `/gt` cycle — the `/gt`-side gates (working-tree gate, `(#<number>)` consistency check); the complete rules live in the shipped file.
