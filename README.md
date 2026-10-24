# gt-agent

`/gt` is an [opencode](https://opencode.ai) agent that manages a project's stages as GitHub issues: it creates stage issues, plans them, verifies tests, and closes finished stages — it never edits code.

## Concept

`/gt` turns a project's roadmap into GitHub issues: one issue per stage, chained with native GitHub dependencies so a stage cannot advance while the previous one is open. Three labels track each issue's lifecycle — `stage` marks a stage issue, `planned` means a detailed plan is ready to build, and `skipped` marks a stage the owner chose to skip. Planning is exclusive to `/gt plan` and `/gt replan`: the plan is always appended as a NEW comment starting with `<!-- gt:plan -->` with fixed headings (Goal, Scope, Tests with a `Test command:` line, Acceptance criteria); an issue's original description is never rewritten. A stage closes only when every `- [ ]` item is checked AND that stage's tests pass AND the working tree is clean — `/gt next` enforces this gate.

## Prerequisites

- [opencode](https://opencode.ai) — hosts the agent and command files.
- The [`gh` CLI](https://cli.github.com/), authenticated once with `gh auth login`.
- Node.js — only needed to run the structural tests (`node --test tests/`).

## Install

Copy the two shipped files into your opencode config directory:

```bash
mkdir -p ~/.config/opencode/agents ~/.config/opencode/commands
cp agents/gt.md ~/.config/opencode/agents/gt.md
cp commands/gt.md ~/.config/opencode/commands/gt.md
```

`/gt` must be run from inside a project folder whose `origin` remote is a GitHub repository — it refuses to run anywhere else (repo guard).

## Quick start

Run `/gt help` first to see every mode. The basic cycle:

1. `/gt <repo> <prompt>` — kickoff: create one stage issue per stage (label `stage`, native dependencies).
2. `/gt plan 1` — plan stage 1 (appends the plan comment, adds `planned`).
3. Build mode — implement the stage; commits only via `/cp gt`.
4. `/gt verify 1` — optional dry-run of the close gate (runs the stage's tests).
5. `/gt next` — close stage 1 if all criteria are checked, tests pass and the tree is clean.
6. `/gt retro 1` — optional retrospective.
7. `/gt plan 2` — plan the next stage; repeat until done.

See [docs/usage.md](docs/usage.md) for the per-mode usage reference (all 13 modes: `help`, `plan`, `next`, `skip`, `status`, `verify`, `replan`, `retro`, `log`, `close stage`, `reopen`, `start`). `commands/gt.md` remains the machine-readable source of truth. For a worked end-to-end walkthrough with sample outputs, see [docs/example.md](docs/example.md). For the permission table, repo guard and workflow invariants, see [docs/safety.md](docs/safety.md).

## Structure

```
agents/gt.md      # agent definition (permissions, behavior rules)
commands/gt.md    # /gt command definition (all modes)
docs/usage.md     # per-mode usage reference
docs/example.md   # worked end-to-end workflow example
docs/safety.md    # permissions, safety model, repo guard
tests/            # structural checks (Node built-in test runner)
```

Run the tests with `node --test tests/`.
