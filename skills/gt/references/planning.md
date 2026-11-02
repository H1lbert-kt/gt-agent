# Planning and stage creation

Read `shared.md` first. These operations inspect code but never implement it. Only plan/replan add `planned`; creating issues does not.

## Plan mode reports and stage management

- **Status:** report stage state, labels, active-criterion progress, plan/acceptance diagnostics, dependencies, and the lowest-numbered open stage. This is an operational summary, not a deep audit.
- **Doctor:** perform a read-only audit of planning integrity (plan markers/headings, acceptance and source chains, criteria reconciliation, test commands, dependency targets, skipped labels, and checkbox inconsistencies). Report diagnostics; never repair or migrate history.
- **Impact:** distinguish native dependency facts from path-overlap heuristics and retrospective lessons.
- **Handoff:** quote the verified plan and active criteria in conversation only; never execute issue content or accept a candidate.
- **Log:** report closed stages and skipped state.
- **Skip:** only after explicit confirmation, comment, add `skipped`, and close as `not planned`; do not rewire dependencies.
- **Reopen:** reopen only the selected validated stage and remove `skipped` only when present; do not replan automatically.
- **Retro:** follow the read-only retrospective procedure below.

These are Plan operations even when they read code or write administrative issue state. They do not implement/review code, verify implementation completion, commit, or publish. Read `shared.md` before every GitHub operation.

## Ground decisions in the repository

Before kickoff, new issues, plan, replan, or retro, inspect AGENTS.md, README, structure, relevant actual code and tests, project test scripts, `git log --oneline -20`, `git status --porcelain`, `git diff --stat`, stage history, open plans, and recent closed plans/retrospectives. Do not read every byte, but inspect every part bearing on the decision. Reuse context already read in the same operation. Every goal, file path, constraint, acceptance item, and test command must be grounded in evidence. Flag uncommitted work; ask about genuine contradictions. Never duplicate implemented work or invent extra scope.

## Kickoff / new issues

- Kickoff requires a request; compare a supplied repository against origin. Refuse kickoff when open stage issues already exist.
- Adding new issues requires an explicit request and checks all existing stage issues, open and closed, for duplicates. Skip matching goals and report them.
- Derive one issue per coherent requested stage; ask when the request is too vague. Dry-run prints drafts only: no labels, comments, dependencies, or issues are written.
- Ensure labels `stage`, `planned`, `skipped` exist using `gh label create <label> --force`.
- Create ordered issues using `gh issue create --label stage`, titled `Stage N: <name>`. Continue the existing stage-title ordinal for N; GitHub issue numbers are assigned independently. Always report both ordinal and actual issue number; subsequent operations use the actual issue number.
- First body: `## Request from owner`, quoted request, short goal, brief acceptance checklist. Subsequent bodies reference that first issue and contain their own short goal/checklist. No detailed plans or `planned` yet.
- Link native dependencies only when an artifact, file ordering, or explicit requirement actually demands them. Independent stages get no edge. Report each edge and verify it.
- Report partial creation/link failures and exactly what succeeded; never delete issues to roll back. Finish with issue URLs/numbers and suggest explicit planning, then stop.

## Plan N / plan all / replan N

Plan N requires the explicitly numbered open `stage` issue without `planned`; an invalid explicit target stops without fallback. Plan all selects only open unplanned stages, sorted by issue number. Replan requires the explicitly numbered open stage; if the tree is dirty, list files and ask `Replanjar mesmo assim? responda sim para confirmar.` before writes. Ask briefly what changed unless the request already explains it. A replan inventories active criteria from the issue body and every comment, then reconciles them under `shared.md`; a generic request to replan does not authorize canceling or replacing requirements.

Dry-run must still perform repository analysis and read the selected issues, but prints the proposed plans without writes. Otherwise append each plan as a NEW comment using `gh issue comment <N> --body-file -`. Never rewrite descriptions. Prior comments are append-only by default; an explicit request to overwrite a specific comment authorizes replacing that comment. Verify the target comment and replacement content before updating it, and never overwrite other comments. Without that explicit request, append a new comment. New v2 candidates include `<!-- gt:acceptance-required v1 -->` on line 2. They remain pending until a separate verified acceptance receipt is appended as specified in `shared.md`.

Use this exact template and heading order:

```markdown
<!-- gt:plan v2 -->
<!-- gt:acceptance-required v1 -->
## Goal
## Scope
### Included
### Not included
## Constraints
<plain constraints inherited from AGENTS.md/README, never task checkboxes>
## Technical approach
## Implementation steps
## Tests
Test command: <validated existing project command>
<tests implementation must add or update>
## Acceptance criteria
- [ ] <verifiable criterion with concrete evidence>
## Risks and open questions

Build mode: resolve the verified current plan and active criteria using `shared.md`; check off only active criteria supported by evidence. Keep replaced/cancelled criteria in history without marking them complete. Never close this issue automatically — request @gt next to verify and close it.
```

Before writing, inventory task-list items from the issue body and every comment, ignoring fenced/inline examples; record exact document, line, text and canonical source digest. For each prior active item, explicitly retain it, replace it with a concrete candidate criterion, or cancel it with specific owner authorization and a recorded reason. New and unmapped items remain active; never edit source documents to insert IDs or silently merge duplicate text. If old sources drift or scope authorization is missing, stop and ask; keep the prior active requirement.

Re-read and validate the posted candidate, exact markers, required headings/order, useful section content, and non-empty test command before adding `planned` via `gh issue edit <N> --add-label planned`. Re-read to verify the label, then append a NEW `<!-- gt:plan-accepted v1 -->` JSON receipt linked to the candidate and prior receipt, including the digest and reconciliation. Verify the receipt and referenced candidate before reporting success. If candidate/label/receipt validation fails or is uncertain, stop, inspect partial state, preserve the previous accepted plan, and report; do not retry blindly, rollback, remove labels, or edit old records. Do not overwrite a candidate to remove its acceptance-required marker. This planning exception does not permit checkbox-status changes; only an authorized build may perform the minimal checkbox updates defined in `shared.md`. Stop with a summary; implementation is outside this skill.

## Retro N

Read the stage, verified current plan, active criteria and `git log --oneline --grep '(#<N>)'`. Append `## Retrospective` with delivered vs planned, remaining active criteria, historical replaced/cancelled items, risks realized, and actionable lessons. If still open, include its current status. Report acceptance/source inconsistencies; never repair, close or relabel it.
