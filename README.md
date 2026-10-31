# gt-agent

`/gt` is an [opencode](https://opencode.ai) agent that manages a project's stages as GitHub issues: it creates stage issues, plans them, verifies tests, and closes finished stages — it never edits code. Its companion command `/cp` handles the commit-and-push workflow in build mode, including the stage-reference commits that `/gt next` expects.

## Concept

`/gt` turns a project's roadmap into GitHub issues: one issue per stage, linked with native GitHub dependencies that encode real dependencies — decided at creation time from the prompt and the code, so independent stages are not artificially blocked and `/gt status` can honestly show multiple unblocked stages; `/gt next` still advances the lowest open stage. Three labels track each issue's lifecycle — `stage` marks a stage issue, `planned` means a detailed plan is ready to build, and `skipped` marks a stage the owner chose to skip. Planning is exclusive to `/gt plan` and `/gt replan`: the plan is always appended as a NEW comment starting with `<!-- gt:plan v2 -->` with fixed headings (Goal, Scope, Constraints — the rules inherited from the project's AGENTS.md, Technical approach, Tests with a `Test command:` line, verifiable Acceptance criteria); legacy plans starting with `<!-- gt:plan -->` stay valid via prefix match, and an issue's original description is never rewritten. A stage closes only when every `- [ ]` item is checked AND that stage's tests pass AND the working tree is clean — `/gt next` enforces this gate and records the evidence in the close comment (test command, pass count, `(#N)` commits). Planning and closing never touch code; commits belong exclusively to `/cp` in build mode.

## Prerequisites

- [opencode](https://opencode.ai) — hosts the agent and command files.
- The [`gh` CLI](https://cli.github.com/), authenticated once with `gh auth login`.
- Node.js — only needed to run the structural tests (`node --test tests/`).

## Install

Copy the three shipped files into your opencode config directory:

```bash
mkdir -p ~/.config/opencode/agents ~/.config/opencode/commands
cp agents/gt.md ~/.config/opencode/agents/gt.md
cp commands/gt.md ~/.config/opencode/commands/gt.md
cp commands/cp.md ~/.config/opencode/commands/cp.md
```

`/gt` must be run from inside a project folder whose `origin` remote is a GitHub repository — it refuses to run anywhere else (repo guard). `commands/gt.md` and `commands/cp.md` live next to each other in `~/.config/opencode/commands/`; the agent definition goes in `~/.config/opencode/agents/`.

## Quick start

Run `/gt help` first to see every mode. The basic cycle:

1. `/gt <repo> <prompt>` — kickoff: create one stage issue per stage (label `stage`, real-dependency `addBlockedBy` edges from the prompt + code analysis; independent stages get no edge).
2. `/gt plan 1` — plan stage 1 (appends the plan comment, adds `planned`).
3. Build mode — implement the stage; commits only via `/cp gt`, with the commit subject referencing the stage as `(#<number>)`.
4. `/gt verify 1` — optional dry-run of the close gate (runs the stage's tests).
5. `/gt next` — close stage 1 if all criteria are checked, tests pass and the tree is clean.
6. `/gt retro 1` — optional retrospective.
7. `/gt plan 2` — plan the next stage; repeat until done.

### Mode overview

Sixteen modes, all defined in `commands/gt.md` (the machine-readable source of truth) and documented with what each one reads and writes in [docs/usage.md](docs/usage.md):

- `/gt help` — the full help text; `/gt status` — read-only dashboard of every stage, labels, criteria progress and a one-line integrity summary.
- `/gt <repo> <prompt>` — kickoff; `/gt plan <N>` / `/gt plan all` / `/gt plan new issue <prompt>` — planning (with optional `--dry-run`).
- `/gt next` — evaluate-and-close gate; `/gt skip` — close the current stage as `not planned` (confirmation required); `/gt close stage` — owner-driven close with tests as the gate.
- `/gt verify <N>` — dry-run of the close gate; `/gt replan <N>` — append a new plan comment; `/gt impact <N>` — read-only pre-replan advisory (what changing stage N affects downstream); `/gt handoff <N>` — conversation-only build handoff from the stage's latest plan (writes nothing); `/gt retro <N>` — append a retrospective.
- `/gt log` — changelog of closed stages; `/gt reopen <N>` — bring a closed stage back; `/gt start` — read-only survey of a repo that already has its own issues.
- `/gt doctor` — read-only integrity audit of the stage chain: errors vs warnings, suggested commands only, never auto-corrects.

Commits in build mode go through `/cp` (shipped as `commands/cp.md`): `/cp gt` finds the current stage issue and puts `(#<number>)` in the commit subject; plain `/cp` is the general review-then-commit-then-push helper. The full `/cp` rules live in the shipped file; the `/gt`-side gates that consume those commits are explained in [docs/safety.md](docs/safety.md#commits-and-cp).

### Docs map

- [docs/usage.md](docs/usage.md) — the per-mode usage reference: syntax, what each mode reads, writes and refuses.
- [docs/example.md](docs/example.md) — a worked end-to-end walkthrough of the basic cycle with sample outputs.
- [docs/safety.md](docs/safety.md) — the permission table, repo guard and workflow invariants (why `/gt` never edits code or commits).
- [docs/faq.md](docs/faq.md) — the troubleshooting FAQ: every refusal message with its cause and fix.

`commands/gt.md` remains the machine-readable source of truth for the agent; `agents/gt.md` for its permissions.

## In a company

The following is an illustrative scenario of a small product team (a tech lead and two developers) running `/gt` on a feature roadmap — same register as the sample outputs in [docs/example.md](docs/example.md): the situation, the command, and the documented behavior behind it. Every command and refusal below is defined in [docs/usage.md](docs/usage.md) or quoted in [docs/faq.md](docs/faq.md); nothing here invents behavior.

1. **Sprint planning.** The tech lead turns the quarter roadmap into stages: `/gt <repo> <prompt>` creates one `stage` issue per stage, linked with native `addBlockedBy` edges only where the analysis finds a real dependency (independent stages stay unblocked). The kickoff refuses while open stage issues exist, so the chain is never duplicated.
2. **Handoff to build.** The tech lead runs `/gt plan 1` (or `/gt plan all`) — each plan lands as a NEW `<!-- gt:plan v2 -->` comment (with the `## Constraints` section) and the issue gains `planned`. The developer implements the stage in build mode and commits only via `/cp gt`, which references the stage in the subject as `(#<number>)` (rules in [commands/cp.md](commands/cp.md); the `/gt`-side gates in [docs/safety.md](docs/safety.md#commits-and-cp)). When the stage closes, the comment carries the evidence: test command, pass count and the `(#N)` commits.
3. **Stand-up check.** Any developer runs `/gt status` for a read-only panel: current stage, labels, criteria progress, and the sensible next action — no GitHub writes.
4. **CI is red.** `/gt next` refuses on failing tests and lists the failures; checked boxes alone never close an issue. The developer fixes, commits via `/cp gt`, and retries (see [docs/faq.md](docs/faq.md)).
5. **Forgot to commit.** `/gt next` refuses on a dirty working tree (`git status --porcelain`) because the tests just ran on uncommitted work — commit first via `/cp gt`, then re-run (see [docs/faq.md](docs/faq.md)).
6. **Requirement cancelled mid-sprint.** The tech lead runs `/gt skip`: after an explicit confirmation it comments, labels the issue `skipped`, and closes it as `not planned`. The chain can then advance.
7. **Bug in a closed stage.** A developer reopens it with `/gt reopen <N>` (removing `skipped` if present), fixes it, and the tech lead runs `/gt replan <N>` so the new plan lands as a fresh comment — old plans stay as history.
8. **Manager wants to unblock.** `/gt close stage` is owner-driven: the manager picks any open stage; tests passing is the gate; unchecked boxes are only reported. This and `/gt skip` are the only two exceptions to the full three-part gate.
9. **New requirement mid-project.** `/gt plan new issue <prompt>` adds new stage issues to the existing set (linking real-dependency `addBlockedBy` edges where the analysis finds them, none for independent work) without touching what is already planned; `/gt plan all --dry-run` drafts the plans in-conversation before writing anything.
10. **Retrospective and onboarding.** After a stage closes, `/gt retro <N>` appends what was delivered vs the plan and the lessons — which feed the next stage's plan. New teammates start at `/gt help`, the docs map above, and [docs/faq.md](docs/faq.md).

The mechanical walkthrough of each command — including sample outputs for skip, reopen and close stage — is [docs/example.md](docs/example.md).

## Structure

```
agents/gt.md      # agent definition (permissions, behavior rules)
commands/gt.md    # /gt command definition (all modes)
commands/cp.md    # /cp command definition (commit and push)
docs/usage.md     # per-mode usage reference
docs/example.md   # worked end-to-end workflow example
docs/safety.md    # permissions, safety model, repo guard
docs/faq.md       # troubleshooting FAQ
tests/            # structural checks (Node built-in test runner)
```

Run the tests with `node --test tests/`.
