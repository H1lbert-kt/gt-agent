# Workflow example

A worked walkthrough of the `/gt` basic cycle on a fictional mini-project. Issue numbers and counts in the sample outputs are illustrative — they are not this repository's own stage issues. For the full per-mode reference see [usage.md](usage.md); for permissions and the repo guard see [safety.md](safety.md); for refusal troubleshooting see [faq.md](faq.md).

## Setup

Prerequisites are already in place: opencode installed with `agents/gt.md` and `commands/gt.md` copied (see the README's Install section), `gh auth login` done once, and Node.js available for the project's tests. Run `/gt` from the project folder whose `origin` remote is a GitHub repository — the repo guard refuses to run anywhere else. Kickoff creates the `stage`, `planned` and `skipped` labels if they are missing.

## The basic cycle

The cycle from Mode H's FLUXO, in order:

1. `/gt <repo> <prompt>` — **kickoff (Mode A)**. Creates one stage issue per stage with the `stage` label (never `planned`) and chains them with native GitHub dependencies. Refuses to run if open `stage` issues already exist.
2. `/gt plan all --dry-run` — **plan, dry-run (Mode D)**. Drafts plans in the conversation only; writes nothing to GitHub. Optional.
3. `/gt plan 1` — **plan (Mode D)**. Appends the plan as a new `<!-- gt:plan -->` comment and adds the `planned` label. Never rewrites the original description. See [Sample outputs](#sample-outputs).
4. Build mode — implement the stage; commits only via `/cp gt` (the commit subject references the stage with `(#<number>)`).
5. `/gt verify 1` — **verify (Mode V)**. Optional dry-run of the close gate: runs the stage's tests, reports unchecked criteria and tree state, closes nothing.
6. `/gt next` — **next (Mode B)**. Closes stage 1 only if every `- [ ]` is checked, the plan's tests pass and `git status --porcelain` is clean; otherwise lists what is missing and stops.
7. `/gt retro 1` — **retro (Mode R)**. Optional retrospective comment on what was delivered vs the plan.
8. `/gt plan 2` — plan the next stage; repeat until done. See [usage.md](usage.md) for all 13 modes.

## Sample outputs

Illustrative samples of the four commands users ask about most. Outputs are restated from the contracts in `commands/gt.md`; numbers are fictional.

### plan

```
$ /gt plan 1
Plano da etapa 1 anexado como comentário novo em
https://github.com/example/mini-project/issues/1
e label `planned` adicionada.
```

The plan comment itself starts with `<!-- gt:plan -->` and carries the fixed headings ending in a `Test command:` line.

### status

```
$ /gt status
Stage | Issue | Title                    | State | Labels         | Criteria | Note
1     | #1    | Stage 1: Scaffold        | open  | stage, planned | 3/8      | atual
2     | #2    | Stage 2: Core logic      | open  | stage          | 0/5      | sem plano, Blocked by #1
3     | #3    | Stage 3: Polish          | closed| stage, skipped | done     | skipped
Próximo: /gt plan 2
```

### verify

```
$ /gt verify 1
Etapa 1 planejada (planned).
Test command: node --test tests/
Testes: 12 pass, 0 fail.
Critérios: 0 de 8 pendentes.
Árvore de trabalho: limpa.
/gt next fecharia a etapa 1 agora.
```

### next

Success — the gate passes and the stage closes:

```
$ /gt next
Etapa 1 fechada.
Próxima etapa: #2 — Stage 2: Core logic (sem plano — rode /gt plan 2).
```

The close comment on the issue is `Stage complete.`

Refusal — the next stage is not planned yet:

```
$ /gt next
Etapa 2 ainda não planejada — rode /gt plan 2.
```

## Skip, reopen and close stage

A stage turns out to be unnecessary. The owner runs `/gt skip`; the agent asks for confirmation first:

```
Fechar a etapa 2 ("Stage 2: Core logic") como skipped? responda sim para confirmar.
```

After a clear yes: a `Skipped by owner` comment, the `skipped` label, and the issue is closed as `not planned`.

Later the stage is needed again. `/gt reopen 2` reopens the issue and removes the `skipped` label, suggesting `/gt replan 2` (a closed stage cannot be replanned until reopened). The owner can also drive the close themselves with `/gt close stage`: they pick any open stage, tests passing is the gate, and the close comment is `Stage complete. Tests passed: \`<test command>\`` — unchecked boxes are only reported, never blocking.

## Closing gate

A stage issue closes only when all three conditions hold:

1. Every `- [ ]` item in the description **and** all comments is checked.
2. The stage's tests pass, using the `Test command:` line from the plan comment located via the `<!-- gt:plan -->` marker (never a guessed command).
3. `git status --porcelain` is clean — commit first via `/cp gt`.

Two exceptions: `/gt skip` closes without tests or checked boxes, but only after explicit owner confirmation; `/gt close stage` is owner-driven — the owner picks the issue and tests passing is the gate, with unchecked boxes only reported.
