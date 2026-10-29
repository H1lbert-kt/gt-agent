---
description: Stage issues workflow: /gt <repo> <prompt>, /gt plan all|<N>|new issue <prompt> [--dry-run], /gt next, /gt status, /gt verify <N>, /gt replan <N>, /gt retro <N>, /gt log, /gt skip, /gt close stage, /gt reopen <N>, /gt start, /gt help
agent: gt
subtask: true
---

Arguments: $ARGUMENTS

Parse the arguments in this order:
- If the arguments are empty, or the first token is `help`, `-h`, or `--help` -> Mode H.
- If the first token is a repo URL or `owner/repo` -> Mode A (kickoff).
- If the first token is `plan` -> Mode D (only accepts `all`, a stage number, or `stage` followed by a number, or `new issue <prompt>`, plus optional `--dry-run`).
- If the first token is `next` -> Mode B. If it is `skip` -> Mode C. If the first two tokens are `close stage` -> Mode E.
- If the first token is `status` -> Mode F. If it is `verify` -> Mode V. If it is `replan` -> Mode G. If it is `retro` -> Mode R. If it is `log` -> Mode L. If it is `reopen` -> Mode O. If it is `start` -> Mode S.
- Modes B, C, E, F, V, G, R, L, O and S work on the repository of the current directory (repo guard below).
- Modes V, G, R and O need a stage number as the second token. If it is missing or not a number, show Mode H and say the argument was not recognized. Do not guess.
- Mode S accepts no further arguments.
- Anything else: show Mode H and say the argument was not recognized. Do not guess.

## Shared: repo guard

Run before ANY `gh` call in every mode:
1. Run `git remote get-url origin`. If it fails or the URL is not a GitHub URL, STOP: tell me `/gt` must run from the project folder that pushes to GitHub.
2. Reduce the URL to `owner/repo`: drop scheme, host and `.git`, keep the last two path segments (for `git@github.com:owner/repo.git`, take everything after the `:`).
3. Mode A only: reduce my `<repo>` argument the same way and compare. On mismatch, STOP — I never mix two repositories.
4. Every `gh` command runs WITHOUT `-R`, always against the current directory's repository.

## Shared: reading an issue's checkboxes

Used by Modes B, E, F and V:
1. Run `gh issue view <N> --json body,comments`. Never combine `--json` with `--comments`: `gh` rejects that combination with `specify only one of --comments or --json`.
2. Count only lines whose first non-space characters are `- [ ]`, `- [x]`, `- [X]` or `* [ ]`, across the description and every comment body.
3. Ignore anything inside fenced code blocks, and ignore inline mentions such as the plan footer sentence (it talks about `- [ ]` without being an item).
4. `- [ ]` counts as unchecked, `- [x]` and `- [X]` as checked. Report the exact unchecked items, not only a count.

## Shared: finding a stage's test command

Used by Mode B, Mode E and Mode V. To find the exact test command of stage M:
1. Read M with `gh issue view <M> --json body,comments`.
2. Take the LAST comment whose first line starts with `<!-- gt:plan` — this matches both the current marker `<!-- gt:plan v2 -->` and the legacy marker `<!-- gt:plan -->` (plans written by an older version of this workflow). If no comment has either marker, fall back to the LAST comment containing the heading `## Tests`.
3. Inside that comment, take the line that starts with `Test command:` — everything after it is the exact command to run.
4. If no plan defines it, fall back to the project's own test script (e.g. `npm test`) only if the project clearly defines one.
5. If neither exists, the stage is unverifiable: report that no test command is defined. Never guess a command.

## Shared: whole-project analysis (read before you create or plan anything)

Used by Mode A (kickoff), by the planning step behind D-One/D-All and `/gt replan`, by Mode D-New, and by Mode R — every moment where stage issues are CREATED, a stage is PLANned or REPLANned, or a RETROSPECTIVE is written. Read-only: you never edit files. Read the project as a whole — not every byte of every file, but every part that bears on the decision — and base every decision on what you read, never on the prompt alone. In this order:

1. Rules and docs: AGENTS.md (non-negotiable rules, stack, test and commit commands) and README.md (what already exists today, conventions, roadmap notes).
2. Code: the directory structure, then the actual content of every file the new work would touch, the plan would edit, or the acceptance criteria would check — entry points, main modules, shaders/configs, and the parts of existing tests the work relates to. You must know what is already implemented before proposing anything: no work that already exists, no duplicate stages.
3. Tests: where they live, the project's test script (package.json/Makefile/etc.) and what the suite covers — so every plan's `Test command:` line is a real command that exists. Never guess a command.
4. Git state: `git log --oneline -20` (what was delivered and which stage each commit references via `(#N)`), `git status --porcelain` and `git diff --stat` (uncommitted work — flag it as a risk instead of planning work that collides with it).
5. Stage history: every stage issue's number/title/state/labels; the latest plan comment (marker `<!-- gt:plan v2 -->`, legacy `<!-- gt:plan -->`) and retrospective of the few most recent CLOSED stages; the plans of the OPEN stages. Reuse their vocabulary, file names and prior decisions instead of contradicting them.
6. Output: every stage name, goal, scope line, acceptance item, risk and test command you write must be traceable to something you read (a real file, a real command, a prior plan or retrospective), and every plan must respect the project's AGENTS.md constraints. If the prompt and the code genuinely contradict each other, ask me — otherwise you decide.

## Shared: the plan format

Every plan written by `/gt plan` and `/gt replan` MUST be a NEW comment that starts with the marker line `<!-- gt:plan v2 -->` and uses exactly these headings, in this order (they are parsed later by `/gt next`, `/gt verify` and `/gt close stage`):

```
<!-- gt:plan v2 -->
## Goal
## Scope
### Included
### Not included
## Constraints
<constraints inherited from the project's AGENTS.md/README that bound the approach — a plain placeholder line, never a checkbox item>
## Technical approach
## Implementation steps
## Tests
Test command: <exact command, e.g. npm test>
<which test files build mode must create>
## Acceptance criteria
- [ ] <verifiable item — name the command, file/line or observable behavior that proves it>
## Risks and open questions
```

Two marker versions exist: current plans start with `<!-- gt:plan v2 -->`; legacy plans start with `<!-- gt:plan -->` and stay valid (never rewritten) — every lookup matches the prefix `<!-- gt:plan`. Acceptance criteria must always be verifiable (a command to run, a file/line to inspect, or an observable behavior): a criterion nobody could check is not a criterion.

End every plan comment with this footer line: "Build mode: read this plan before touching code; check off EVERY `- [ ]` item in this issue (original description and this plan) as it is implemented. Never close this issue — only /gt next closes it."

## Mode H: help

Do NOT run any command, read any file, or call `gh`. Print exactly the text below and STOP:

```
/gt: gerencia as etapas do projeto como issues no GitHub (só planeja e fecha; nunca edita código)

CICLO BÁSICO
  /gt <repo> <prompt>
        Kickoff. Cria uma issue por etapa a partir do prompt, em ordem, com
        label `stage` e dependência nativa do GitHub (cada issue bloqueada
        pela anterior via `addBlockedBy`, nunca linha de texto no corpo).
        <repo> = URL ou owner/repo,
        precisa ser o remoto `origin` da pasta atual.
        As issues saem SEM o label `planned` — planejar é papel do /gt plan.
  /gt plan <N>     Planeja a etapa N (alias: /gt plan stage <N>): anexa o
                   plano completo como comentário e adiciona `planned`.
  /gt plan all     Planeja de uma vez todas as stage issues abertas ainda
                   não planejadas, em ordem numérica.
  /gt plan new issue <prompt>
                   Adiciona novas issues de etapa a partir do seu prompt,
                   dentro de um projeto que já existe: analisa o código e as
                   issues e decide quantas issues criar, número, título, ordem
                   e dependências. Sai SEM `planned` — planeje depois com
                   /gt plan <N> (ou /gt plan all). Aceita --dry-run (rascunho
                   na conversa, não escreve nada no GitHub).
  /gt next         Se a etapa atual está `planned`: confere os critérios.
                   Se tudo marcado E os testes passam E a árvore está limpa,
                   fecha. Se não, lista o que falta e para. Se a próxima não
                   foi planejada, só te manda rodar /gt plan <N>.
  /gt skip         Pula a etapa atual (pede confirmação antes): comenta,
                   `skipped`, fecha "not planned".

AUXILIARES
  /gt status       Painel: todas as etapas (abertas e fechadas), qual é a
                   atual, labels, % de critérios cumpridos e o que fazer em
                   seguida.
  /gt verify <N>   Roda os testes da etapa N e reporta, sem fechar nada e
                   sem mudar nada (dry-run do gate do /gt next).
  /gt replan <N>   Re-plana a etapa N: anexa um novo plano como comentário
                   (o plano antigo vira histórico) e mantém `planned`.
  /gt retro <N>    Anexa um retrospective na etapa N: o que foi entregue vs
                   o plano, critérios que sobraram, riscos que viraram
                   problema, lições para as próximas etapas.
  /gt log          Changelog das etapas fechadas (número, título, data,
                   `skipped` quando a etapa foi pulada).
  /gt close stage  Fecha uma etapa à sua escolha, com testes como gate.
  /gt reopen <N>   Reabre uma etapa fechada (remove o label `skipped`, se
                   houver) para corrigir o que faltou.
  /gt start        Só leitura: analisa as issues que o repositório já tem
                   (fluxo de etapas ou não) e diz por onde começar.
  /gt help         Mostra esta ajuda.

FLUXO
  1. /gt <repo> <prompt>   -> cria as issues (estrutura das etapas)
  2. /gt plan all --dry-run -> esboço dos planos, sem gravar nada (opcional)
  3. /gt plan 1            -> planeja a etapa 1 na issue
  4. modo Build            -> implementa; commits só via /cp gt
  5. /gt verify 1          -> testes passam? (opcional, antes do next)
  6. /gt next              -> fecha a etapa 1 (se critérios + testes ok)
  7. /gt retro 1           -> retrospective (opcional, alimenta o futuro)
  8. /gt plan 2            -> planeja a próxima; repita até acabar

LABELS
  stage    toda issue de etapa
  planned  etapa já planejada (pronta para implementar)
  skipped  etapa pulada

DICAS
  - Planejar é exclusivo do /gt plan (e /gt replan). /gt next só avalia e fecha.
  - /gt status, /gt verify, /gt log e /gt start são só leitura; /gt retro e
    /gt replan só mexem na issue que você pediu.
  - Para replanjar: /gt replan <N> (não precisa tirar o label na mão).
  - Criar ou planejar etapas (/gt plan, /gt plan new issue, /gt replan,
    /gt retro, kickoff) sempre começa pela leitura do projeto inteiro:
    AGENTS.md, README, código, testes, git e histórico de stages — a decisão
    vem do código, não só do prompt.
  - Nenhuma etapa avança enquanto a anterior estiver aberta, exceto com /gt skip.
  - /gt next só fecha com todos os checkboxes marcados E os testes passando
    E a árvore de trabalho limpa (commit antes via /cp gt).
  - O plano usa títulos fixos (## Tests, etc.) e começa com <!-- gt:plan v2 -->
    (marcador legado <!-- gt:plan --> ainda é aceito) — é assim que os
    comandos acham o comando de teste sem adivinhar.
  - Commits do modo Build apenas via `/cp gt` (referencia a issue da etapa atual).
  - Rode os comandos dentro da pasta do projeto (precisa de remote no GitHub);
    /gt recusa rodar em outra pasta ou em outro repositório.
  - Requer `gh auth login` feito uma vez.
```

## Mode A: kickoff `<repo> <prompt>` (creates stage structure, never plans in detail)

1. Run the repo guard (compare its `owner/repo` with `<repo>`), then `gh auth status` and `gh repo view`. Stop on failure.
2. If everything after `<repo>` is empty: show Mode H and tell me the prompt is required. STOP.
3. Run `gh issue list --label stage --state open`. If open `stage` issues already exist, stop and tell me. Do not duplicate.
4. Run the shared whole-project analysis (read-only). Even for a kickoff, the stages must fit the repository: existing code and docs, conventions, tests, git state and — when the repo already has issues — `gh issue list --state all --json number,title --limit 200`, so stage numbering and titles do not collide with what is already there.
5. Ensure the labels exist, each with `--force` (without it a second run fails on the first label that already exists): `gh label create stage --force`, `gh label create planned --force`, `gh label create skipped --force`.
6. Turn the prompt into stages (one stage = one issue):
   - If the prompt clearly describes several stages, create one issue per stage. If it describes one stage, create one issue.
   - Derive a short stage name per stage. Do not invent stages beyond what the prompt asks. If the prompt is too vague to derive stages, ask me.
   - Each stage must be work the analysis shows is genuinely missing: nothing already implemented, nothing duplicated.
7. Create ONE issue per stage, in order, each with `gh issue create --label stage` (do NOT add the `planned` label):
   - Title: `Stage N: <name>`
   - Body of the first issue: `## Request from owner` with the prompt quoted, then a short Goal and a brief acceptance checklist as `- [ ]` (the detailed plan comes later from `/gt plan`).
   - Body of the following issues: a one-line reference to the kickoff prompt (e.g. `Kickoff prompt: see #<first issue number>`), a short Goal and a brief `- [ ]` checklist. Do NOT write a `Blocked by #N` text line in any body — the dependency is native GitHub (next item).
   - After creating each issue beyond the first, record it as blocked by the previous stage issue with the native GitHub dependency:
     `gh api graphql -f query='mutation { addBlockedBy(input: {issueId: "<node-id-of-the-issue-being-blocked>", blockingIssueId: "<node-id-of-the-previous-stage-issue>"}) { issue { number } } }'`
     Get node IDs with `gh issue view <N> --json id`; verify with `gh issue view <N> --json blockedBy`. The first issue of the chain gets no dependency. If a dependency step fails, say so explicitly.
8. If issue creation or dependency linking failed halfway, say so explicitly and list the issues that were created/linked before the failure (I must clean up or retry by hand; the next kickoff refuses while open `stage` issues exist).
9. Print a table: stage, issue number, title. Then tell me to run `/gt plan 1` (or `/gt plan all`) when I am ready to plan. STOP. Do not plan in detail yet.

## Mode B: `next` (evaluates and closes; never plans, never edits code)

1. Run the repo guard, then `gh issue list --label stage --state open --json number,title,labels --limit 100`. Sort by number. Let N be the lowest. If none are open, say the project is finished and STOP.
2. If N does not have the label `planned`, print `Etapa <N> ainda não planejada — rode /gt plan <N>.` and STOP. Do not plan it yourself.
3. N has the label `planned`:
   - Read it with `gh issue view <N> --json body,comments` and the shared "reading an issue's checkboxes" section.
   - If any `- [ ]` item is unchecked (in the description or any comment), list them and STOP. Do not close it.
   - If all items are checked, verify with tests using the shared "finding a stage's test command" section:
     - If no test command is defined, the stage is unverifiable: list what is missing and STOP. Do not close the issue.
     - Run the command from the project directory. If the test files or command do not exist, the plan was not fully implemented: list what is missing and STOP.
     - If any test fails, list the failures and STOP. Do not close the issue.
   - Working-tree gate: run `git status --porcelain`. If it prints anything, list those files and STOP. Do not close the issue: the tests just ran on uncommitted work, and closing would claim a state the repository does not have. Tell me to commit with `/cp gt` first.
   - Consistency warning (do not block): run `git log --oneline -50`; if no subject ends with `(#<N>)`, warn that this stage has no commit referencing it.
   - Only if all items are checked AND tests pass AND the working tree is clean, close it with evidence:
     `gh issue close <N> --comment "Stage complete. Tests passed: \`<test command>\` — pass: <count|not reported>. Commits: <subjects|none>."`
     Take `<count>` from the runner's own output (e.g. `# pass 42`); if the runner prints no count, write `not reported` — never guess a number. Take `<subjects>` from the `git log --oneline -50` subjects ending in `(#<N>)`; when none match, write `none`.
4. Let M be the next open stage issue (lowest open number). If there is none, say the project is finished and STOP.
5. If M does not have the `planned` label, print `Etapa <M> ainda não planejada — rode /gt plan <M>.` and STOP.
6. If M has the `planned` label, print a one-line note that the next planned stage is M (tip: `/gt retro <N>` for a retrospective) and STOP. (Planning is never done here.)

## Mode C: `skip` (only when I explicitly say so)

1. Run the repo guard, then `gh issue list --label stage --state open --json number,title,labels --limit 100`. Let N be the lowest. If none are open, say so and STOP.
2. Ask me to confirm: `Fechar a etapa <N> ("title") como skipped? responda sim para confirmar.` If my answer is anything other than a clear yes, STOP without touching GitHub.
3. Comment `Skipped by owner`, add the label `skipped`, and close it with `gh issue close <N> --reason "not planned"`.
4. Let M be the next open stage issue. If there is none, say the project is finished and STOP.
5. If M does not have the `planned` label, print `Etapa <M> ainda não planejada — rode /gt plan <M>.` and STOP. If it already has `planned`, print a one-line note that stage M is ready. STOP.

## Mode D: `plan` (the ONLY command that plans; accepts `all`, a stage number, or `new issue <prompt>`, plus optional `--dry-run`)

Parsing what follows `plan`:
- Empty -> show Mode H and tell me it accepts only `all`, a stage number, or `new issue <prompt>`. STOP.
- Remove every `--dry-run` token and remember the dry-run flag.
- `all` -> Mode D-All.
- A number, or `stage` followed by a number -> Mode D-One.
- The two tokens `new` `issue` followed by a prompt -> Mode D-New.
- Anything else -> show Mode H and say `/gt plan` accepts only `all`, a stage number, or `new issue <prompt>`. Do not guess. STOP.

### Mode D-One: `plan <N>` (or `plan stage <N>`)

1. Run the repo guard, then `gh issue view <N> --json number,title,labels`. If the issue does not exist or does not have the `stage` label, tell me and STOP. Never touch issues without the `stage` label.
2. If N already has the `planned` label, say it is already planned (to re-plan: use `/gt replan <N>`) and STOP.
3. If the dry-run flag is set: draft the plan for N in this conversation (using the shared plan format) and STOP. Do not comment, do not add labels.
4. Otherwise apply the planning step (below) to issue N only.

### Mode D-All: `plan all`

1. Run the repo guard, then `gh issue list --label stage --state open --json number,title,labels --limit 100`. Sort by number. Keep only the issues WITHOUT the `planned` label.
2. If there are none, say every open stage is already planned (or there are no open stages) and STOP.
3. If the dry-run flag is set: draft a short plan for each of them in this conversation and STOP. Do not comment, do not add labels.
4. Otherwise apply the planning step below to each of them, in order.

### Mode D-New: `plan new issue <prompt>` (create new stage issues in a project that already exists; structure only, never a detailed plan)

The owner is in the project and wants to add new issues from an ad-hoc prompt. The owner delegates the decisions to you: read the prompt, analyze the project, and decide what to create — how many issues, their numbers, titles, order and dependencies. Like the kickoff, this only creates structure; the detailed plan comes later from `/gt plan`.

1. Run the repo guard, then `gh auth status`. Stop on failure.
2. If everything after `new issue` is empty: show Mode H and tell me the prompt is required. STOP.
3. Run the shared whole-project analysis (read-only), plus — only for this mode:
   - `gh issue list --label stage --state all --json number,title,labels --limit 200` for the existing stage numbers/titles/states/labels (this drives your numbering and the duplicate guard).
   - `gh issue list --state all --json number --limit 1` for the highest issue number in the repo (any type — GitHub assigns the next one to your first new issue).
4. Decide and record your decisions (the owner will see them in step 9):
   - How many issues: one issue per coherent piece of work the prompt asks for; several pieces -> several issues; one piece -> one issue. Do not invent work beyond the prompt. If the prompt is too vague to derive any stage, ask me instead of guessing.
   - Stage number: continue the sequence — highest `Stage N` among existing stage issues + 1 for the first new issue, +1 per subsequent new issue. GitHub assigns the actual issue numbers: predict them as (highest issue number in the repo, any type) + 1, +1 per new issue. After creating each issue, if the assigned number differs from the number in its title, fix the title immediately with `gh issue edit <number> --title "Stage <number>: <name>"`.
   - Title: `Stage N: <name>` with a short name, matching the repo's existing stage-title style.
   - Body content: a short Goal and a brief acceptance checklist as `- [ ]`, grounded in the shared whole-project analysis (name real files and conventions). The detailed plan comes later from `/gt plan <N>` — do not write plans, scope, test commands or acceptance detail beyond a brief checklist here.
   - Dependency: by default chain with the NATIVE GitHub issue dependency (the first new issue is blocked by the highest existing stage issue; each subsequent new issue by the one created just before it), using the same `gh api graphql` `addBlockedBy` mutation as Mode A — never a `Blocked by #N` text line in the body. Drop or rewire the dependency when the prompt or the analysis shows that work is independent or depends on something else. You decide.
5. Duplicate guard: for each issue you would create, check the existing `stage` issues (open and closed) from step 3. If one already covers the same goal, do not recreate it — skip that one and say which existing issue it matched. If all would be duplicates, STOP without creating anything.
6. If the dry-run flag is set: print your decisions, the drafted table (stage, issue number, title) and each proposed body in this conversation, and STOP. Do not create anything, do not comment, do not add or create labels.
7. Ensure the labels exist, each with `--force` (without it a second run fails on the first label that already exists): `gh label create stage --force`, `gh label create planned --force`, `gh label create skipped --force`.
8. Create ONE issue per decision, in order, each with `gh issue create --label stage` (do NOT add the `planned` label):
   - Title: `Stage N: <name>` (per step 4's numbering rules).
   - Body of the first new issue: `## Request from owner` with the prompt quoted, then the short Goal and the brief `- [ ]` checklist (no `Blocked by` text line — the dependency is native, linked right after creation via `addBlockedBy`, see step 4).
   - Body of the following new issues: a one-line reference to the request (e.g. `Request from owner: see #<first new issue number>`), the short Goal and the brief `- [ ]` checklist (no `Blocked by` text line — native dependency via `addBlockedBy` right after creation).
   - If issue creation failed halfway, say so explicitly and list the issues created before the failure (I must clean up or retry by hand).
9. Print a table: stage, issue number, title. Then tell me to run `/gt plan all` (or `/gt plan <N>` for a specific new issue) when I am ready to plan. STOP. Do not plan in detail yet.

### Planning step (used by D-One and D-All)

For each issue M to plan:
1. Run the shared whole-project analysis once (do not re-read what you already read for a previous issue in the same run), then read this issue with `gh issue view <M> --json body,comments` — its description and every plan/retro comment. Everything the plan states must be grounded in what the analysis found.
2. Append the plan as a NEW comment starting with `<!-- gt:plan v2 -->`, via `gh issue comment <M> --body-file -`. Never delete or overwrite the original description; old plans stay as history.
3. Write the plan using EXACTLY the headings of the shared plan format section (Goal, Scope, Constraints, Technical approach, Implementation steps, Tests with a `Test command:` line, Acceptance criteria, Risks), and end it with the build-mode footer.
4. Self-check: re-read the issue (`gh issue view <M> --json body,comments`), take the last comment, and verify it has the `<!-- gt:plan v2 -->` marker, every required heading in the required order (including `## Constraints`), a non-empty `Test command:` line and the footer. If anything is missing, append a corrected plan comment and check again (at most two attempts). Do not add the label until the check passes — otherwise later stages become unverifiable.
5. Add the label: `gh issue edit <M> --add-label planned`.

Finish with a summary (one line per planned stage, plus a table of issue number and title). STOP. Wait for my approval before implementing anything.

## Mode E: `close stage` (tests are the gate; owner-driven)

1. Run the repo guard, then `gh issue list --label stage --state open --json number,title --limit 100`. Sort by number. If none are open, tell me and STOP.
2. Ask me which open stage issue to close (list them; let me pick one, or cancel). If I cancel, STOP.
3. Read the chosen issue with `gh issue view <N> --json body,comments` and find its test command using the shared "finding a stage's test command" section.
4. Run that test command from the project directory.
   - If there is no test command defined: tell me and STOP (do not close unverified).
   - If any test fails: list the failures and STOP. Do not close the issue.
5. Run `git status --porcelain`. If it prints anything, list those files and STOP. Do not close the issue; tell me to commit with `/cp gt` first.
6. If all tests pass and the tree is clean, gather the evidence and close it:
   - Run `git log --oneline -50` and keep the subjects ending in `(#<N>)` (the tree is clean, so they reflect the committed state).
   - Close with the unified evidence comment: `gh issue close <N> --comment "Stage complete. Tests passed: \`<test command>\` — pass: <count|not reported>. Commits: <subjects|none>."` The `<count>` comes from the runner's own output; if the runner prints no count, write `not reported`. With no matching subjects, write `none`.
7. Print the result (closed issue, test command, pass count, commits referenced). If any `- [ ]` in the issue body is still unchecked, mention it as a note — but the close decision is yours and tests passing is the gate. Do NOT plan the next stage, do not touch other issues.

## Mode F: `status` (read-only dashboard)

1. Run the repo guard, then `gh issue list --label stage --state all --json number,title,state,labels --limit 200`. Sort by number. If none, say the project has no stage issues and STOP.
2. Let CURRENT be the lowest-numbered open issue (if any).
3. For each OPEN issue M, run `gh issue view <M> --json body,comments` and count the `- [x]` checked and `- [ ]` unchecked items across the description and all comments with the shared "reading an issue's checkboxes" section. (For closed issues, show `done` instead.)
4. Print a table: Stage | Issue | Title | State | Labels | Criteria (e.g. `7/10`, or `done`) | Note (mark CURRENT as `atual`; note `sem plano` if open without `planned`; note the native dependency `Blocked by #X` when present — read it with `gh issue view <M> --json blockedBy`, never from a body text line).
5. End with one line telling me the sensible next action, e.g. `Próximo: /gt plan 4` (unplanned), `Próximo: /gt next` (current stage fully checked) or `Etapa 4 em andamento (3/12 critérios)`. STOP. Do not change anything.

## Mode G: `replan <N>` (plan again in one step; never leaves the stage half-updated)

1. Run the repo guard, then `gh issue view <N> --json number,title,labels,state`. If the issue does not exist or does not have the `stage` label, tell me and STOP.
2. If N is closed, say a closed stage cannot be replanned (reopen it first with `/gt reopen <N>`) and STOP.
3. Dirty-tree gate: run `git status --porcelain`. If it prints files, list them and warn `o plano novo pode ficar desatualizado em relação ao código não commitado`, then ask for a one-line confirmation: `Replanjar mesmo assim? responda sim para confirmar.` Anything other than a clear yes -> STOP before writing anything to GitHub (the previous plan comment and the `planned` label stay untouched). A clean tree continues silently.
4. Ask me one line about what changed (a short reason to replan). If I skip it, continue without one.
5. Apply the planning step (Mode D) to issue N — it starts with the shared whole-project analysis, so the new plan is grounded in the current code, tests, git state and stage history: append a NEW plan comment (marker `<!-- gt:plan v2 -->`), self-check it, then make sure the `planned` label is present. Old plans remain as history; if planning fails, the previous plan and label stay untouched.
6. Show a one-line summary of the new plan and STOP. Wait for my approval before implementing anything.

## Mode L: `log` (changelog of closed stages, read-only)

1. Run the repo guard, then `gh issue list --label stage --state closed --json number,title,closedAt,stateReason --limit 200`. Sort by number. If none, say no stage has been closed yet and STOP.
2. Print a table: Stage | Issue | Title | Closed | Note (write `skipped` when `stateReason` is `not planned`). Then a one-line note that a retrospective lives inside issues that have one (see `/gt retro`). STOP. Do not change anything.

## Mode O: `reopen <N>` (bring a closed stage back)

1. Run the repo guard, then `gh issue view <N> --json number,title,labels,state`. If the issue does not exist or does not have the `stage` label, tell me and STOP.
2. If N is already open, say so and STOP (nothing to do).
3. `gh issue reopen <N>`. If the issue has the `skipped` label, remove it: `gh issue edit <N> --remove-label skipped`.
4. Report the resulting state (open, remaining labels) and the sensible next action (usually `/gt replan <N>` if it never had a plan, or `/gt next` if it has one). Do not plan, do not close anything. STOP.

## Mode R: `retro <N>` (append a retrospective to a stage)

1. Run the repo guard, then `gh issue view <N> --json number,title,state,labels,body,comments`. If the issue does not exist or does not have the `stage` label, tell me and STOP.
2. Run the shared whole-project analysis (read-only), then gather this stage's context: the original description, all plan comments (the ones whose first line starts with `<!-- gt:plan`, especially the latest), the acceptance criteria (checked vs not), and — when the current directory is that repo — `git log --oneline --grep "(#<N>)"` for the commits that reference the stage (skip quietly if there are none).
3. Append a comment titled `## Retrospective` (via `gh issue comment <N> --body-file -`) with short, concrete sections:
   - What was delivered vs the last plan (one or two lines).
   - Acceptance criteria left unchecked, if any, and why that matters.
   - Risks from the plan that materialized (or did not).
   - Lessons for the next stages (actionable, not generic).
4. If the stage is still open, add one line with the current state (how many criteria remain). Do not close it, do not change labels. STOP.

## Mode S: `start` (read-only: where to begin in a repo that already has issues)

For repositories that already have their own issues (e.g. a company repo) and do not use the `stage` workflow. This mode NEVER writes to GitHub: no comment, no label, no close, no create, no edit. Its only output is a report in this conversation.

1. Run the repo guard. Then Phase 1 — a cheap survey with no issue bodies:
   - `gh issue list --state open --limit 200 --json number,title,labels,assignees,milestone,author,blockedBy,blocking,createdAt,updatedAt,comments`
   - `gh issue list --assignee @me --state open --json number,title`
   - `gh pr list --state open --json number,title,closingIssuesReferences --limit 100`
   - `gh label list --limit 100`
   If there are no open issues, say the repo is clean and STOP. If the first query returned exactly the limit, warn that only the 200 most recent issues are analysed and suggest narrowing with `--label` or `--search`.
2. Score each open issue from those signals and print, per issue, which signal you used:
   - assigned to me (from the `@me` query) -> mine, highest priority for me;
   - `blocking` other issues and not itself blocked -> high leverage, start here;
   - has `blockedBy` entries, or an open PR references it -> not now (the PR list shows what already has work in flight);
   - no assignee + a priority/bug label or an active milestone -> candidate;
   - `needs-triage` label or no labels at all -> separate "needs triage first" list; do not recommend it;
   - `updatedAt` older than 90 days -> separate "probably stale; consider closing" list (a suggestion only, never executed).
3. Phase 2 — deep read of at most the top 5: `gh issue view <N> --json body,comments`. Judge whether it carries a spec or reproduction steps and give an effort guess (S/M/L). Never read every body; keep the context small.
4. Print the report:
   - Summary line: open / mine / blocking / blocked / with open PR / stale >90d.
   - Table of the top 5-10: `Issue | Title | Assignee | Why start here | Effort`.
   - ONE recommendation for the first issue to pick up, with the signal that justified it, plus the next command to run (e.g. `gh issue view <N>`).
   - Separate lists: `Already in progress` (open linked PR) and `Candidates to close` (stale >90d).
   - If nothing clearly wins, ask me which area I prefer (bug fixes, features, tech debt) instead of guessing.
5. Suggestion about the stage workflow (never executed): explain that adopting `/gt` stages here means either running `/gt <repo> <prompt>` (which creates new `Stage N` issues in this repo) or labelling existing issues with `stage` (no command does that today). Ask which one I want, if any, then STOP.

## Mode V: `verify <N>` (run the stage's tests without closing anything)

1. Run the repo guard, then `gh issue view <N> --json number,title,labels`. If the issue does not exist or does not have the `stage` label, tell me and STOP.
2. Report whether N has the `planned` label: `/gt next` refuses to close an unplanned stage.
3. Find its test command with the shared "finding a stage's test command" section. If none is defined, tell me and STOP.
4. Run the command from the project directory and report the result (pass count or failures).
5. Also report the criteria status with the shared "reading an issue's checkboxes" section: how many `- [ ]` remain unchecked across the issue (description + comments), listing them.
6. Working-tree check: run `git status --porcelain` and report whether the tree is clean or which files are dirty (a dirty tree blocks `/gt next`).
7. This is a dry-run of the `/gt next` gate: do NOT close anything, do NOT edit the issue, do NOT add or remove labels. End with what `/gt next` would do right now (close it, or what it would complain about: unplanned stage, unchecked boxes, failing tests or a dirty working tree). STOP.

## Rules

- `/gt plan` and `/gt replan` are the ONLY commands that write a detailed plan or add the `planned` label. `/gt next`, `/gt skip`, `/gt close stage`, `/gt status`, `/gt verify`, `/gt log`, `/gt reopen` and `/gt start` never plan.
- `--dry-run` never writes anything to GitHub: no comments, no labels, no issues.
- `/gt status`, `/gt verify`, `/gt log` and `/gt start` are read-only; `/gt start` never writes to GitHub at all (no comment, label, close, create or edit). `/gt retro` and `/gt replan` touch only the issue you named.
- Every mode runs against the repository of the current directory (repo guard); two repositories are never mixed, and no `gh` command uses `-R`.
- Never advance while an earlier stage is still open, unless I used `skip`. The ONLY exceptions are `/gt skip` (closes the current stage as `not planned`) and `/gt close stage` (I pick any open stage; tests are the gate). (`plan all` only appends plans to existing open issues; it never closes anything.)
- A stage issue may only be closed when EVERY `- [ ]` item in it is checked AND the stage's tests pass (found via the plan's `<!-- gt:plan` marker — `<!-- gt:plan v2 -->` or legacy `<!-- gt:plan -->` — and its `## Tests` / `Test command:` line) AND the working tree is clean. Checked boxes alone are never enough; failed tests never close an issue. The ONLY exceptions: `/gt close stage` is owner-driven — I pick the issue, tests passing is the gate, unchecked boxes are only reported; and `/gt skip` closes without tests or checked boxes, but only after my explicit confirmation. When a stage closes, the close comment carries evidence: test command, pass count (`not reported` when the runner prints none) and the `(#N)` commit subjects (`none` when there are none).
- Never create duplicate issues. The kickoff refuses to run while open `stage` issues exist; `plan new issue` checks every existing stage issue (open and closed) against each issue it would create and skips matches; `plan` reuses issues that already exist.
- Never touch issues without the `stage` label.
- Never delete or overwrite an issue's original description or an old plan comment. Plans and retrospectives are always new comments, and `gh issue edit` is only ever used to add or remove labels, or — only right after `plan new issue` creates it — to correct that brand-new issue's title number when GitHub assigned a different one.
- To re-plan a stage, use `/gt replan <N>`. To bring a closed stage back, use `/gt reopen <N>`.
- `/gt skip` always asks for confirmation before closing anything.
- In build mode, commits and pushes are done exclusively via `/cp gt`, which references the current stage issue with `(#<number>)` in the commit subject. Never run `git commit`/`git push` directly.
