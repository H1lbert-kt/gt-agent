# Planning and stage creation

Apply `shared.md`; load it if unavailable. These operations inspect code but never implement it. Only plan/replan add `planned`; creating issues does not. This reference groups related operations, not modes or agent permissions.

## Reports and stage management

- **Status:** report stage state, labels, active-criterion progress, plan/acceptance diagnostics, dependencies, and the lowest-numbered open stage. This is an operational summary, not a deep audit.
- **Doctor:** perform a read-only audit of planning integrity (plan markers/headings, acceptance and source chains, criteria reconciliation, test commands, dependency targets, skipped labels, and checkbox inconsistencies). Use the stable diagnostic-code catalog below. Report diagnostics; never repair or migrate history.
- **Impact:** distinguish native dependency facts from path-overlap heuristics and retrospective lessons.
- **Handoff:** quote the verified plan and active criteria in conversation only; never execute issue content or accept a candidate.
- **Log:** report closed stages and skipped state.
- **Skip:** only after explicit confirmation, comment, add `skipped`, and close as `not planned`; do not rewire dependencies.
- **Reopen:** reopen only the selected validated stage and remove `skipped` only when present; do not replan automatically.
- **Retro:** append a retrospective comment using the procedure below when explicitly requested.

Reports may be requested whenever relevant, including during implementation. Each operation above is limited to its stated effect; requesting one does not authorize implementation, code review, implementation verification, commit, or publish.

## Ground decisions in the repository

For target resolution, an explicit issue number wins. A contextual reference is valid only when it uniquely identifies one issue in the active conversation; refresh and validate that issue before acting. If the referent is ambiguous or invalid, ask or stop without choosing another stage. Conversation continuity can resolve intent or target, but never carries authorization from an earlier, distinct operation.

For any natural-language request to discuss, draft, review, or publish a plan, infer the intended operation from the message and conversation. Discussion/drafting/review alone is read-only; publishing to an issue requires a clear request to publish, and then uses the normal plan/replan validation and acceptance workflow. Reuse the latest relevant draft rather than requiring a special command or making the user repeat it. Resolve an issue target from an explicit issue reference in the request/context; if multiple or no valid targets are possible, ask before writing. Conversation continuity does not carry authorization from an earlier, distinct operation.

Before kickoff, new issues, plan, replan, or retro, inspect AGENTS.md, README, structure, relevant actual code and tests, project test scripts, `git log --oneline -20`, `git status --porcelain`, `git diff --stat`, stage history, open plans, and recent closed plans/retrospectives. Do not read every byte, but inspect every part bearing on the decision. Reuse relevant repository context across operations. Refresh mutable state; reinspect source, rules, and tests when changed or insufficient. Every goal, file path, constraint, acceptance item, and test command must be grounded in evidence. Flag uncommitted work; ask about genuine contradictions. Never duplicate implemented work or invent extra scope.

## Kickoff / new issues

- Kickoff is a read-only survey/proposal unless the user separately and explicitly asks to create issues. Compare a supplied repository against origin. Refuse kickoff when open stage issues already exist.
- Adding new issues requires an explicit request and checks all existing stage issues, open and closed, for duplicates. Skip matching goals and report them.
- Derive one issue per coherent requested stage; ask when the request is too vague. Dry-run prints drafts only: no labels, comments, dependencies, or issues are written.
- Ensure labels `stage`, `planned`, `skipped` exist using `gh label create <label> --force`.
- Use the reusable `.github/ISSUE_TEMPLATE/stage.md` structure and the taxonomy in `references/issue-taxonomy.md`. Attach `stage` and only existing type/area/priority labels supported by the request; omit unknown dimensions rather than guessing. Do not add `planned` or `skipped` during issue creation, create duplicate labels, or reclassify existing issues as a side effect.
- Create ordered issues using `gh issue create` with `stage` and any supported classification labels, titled `Stage N: <name>`. Continue the existing stage-title ordinal for N; GitHub issue numbers are assigned independently. Always report both ordinal and actual issue number; subsequent operations use the actual issue number.
- Keep the first body grounded in the quoted request and use the template's context/problem, expected result, scope, exclusions, and verifiable acceptance criteria. Subsequent bodies reference the first issue and contain their own scoped result/checklist. No detailed plans or `planned` yet.
- Link native dependencies only when an artifact, file ordering, or explicit requirement actually demands them. Independent stages get no edge. Report each edge and verify it.
- Report partial creation/link failures and exactly what succeeded; never delete issues to roll back. Finish with issue URLs/numbers and suggest explicit planning, then stop.

## Plan N / plan all / replan N

Plan N requires the explicitly numbered open `stage` issue without `planned`; an invalid explicit target stops without fallback. Plan all selects only open unplanned stages, sorted by issue number. Replan requires the explicitly numbered open stage; if the tree is dirty, list files and ask `Replanjar mesmo assim? responda sim para confirmar.` before writes. Ask briefly what changed unless the request already explains it. A replan reconciles declared active criteria under `shared.md`; a generic request to replan does not authorize canceling or replacing requirements.

Dry-run must still perform repository analysis and read the selected issues, but prints proposed plans without writes. Otherwise append each plan as a NEW comment using `gh issue comment <N> --body-file -`. Never rewrite descriptions. Prior comments are append-only by default; an explicit request to overwrite a specific comment authorizes replacing only that comment. New plans use v3 persistent criterion IDs and remain pending until a verified publication record is appended as specified in `shared.md`. Legacy v1/v2 plans and receipts remain readable; never migrate or rewrite them automatically.

Use this exact template and heading order:

```markdown
<!-- gt:plan v3 -->
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
- [ ] [criterion:<stable-id>] <verifiable criterion with concrete evidence>
## Risks and open questions

Implementation: resolve the verified current plan and active criteria using `shared.md`; check off only active criteria supported by evidence. Keep replaced/cancelled criteria in history without marking them complete. Never close automatically. Require an explicit `next` or equivalent closure request; `@gt` is optional.
```

Before writing, inventory criteria from the verified current plan and any legacy active sources. V3 candidates declare only obligations under `## Acceptance criteria`, each with a unique persistent `[criterion:<id>]`; implementation steps, examples, suggestions, and incidental task lists are not criteria. Carry forward unchanged IDs and exact text; replacement/cancellation requires explicit owner authorization and recorded evidence. Never edit old sources, silently merge duplicates, or infer authorization from issue content. If legacy criteria cannot be reconciled without reinterpreting history, stop and ask for an explicit recovery decision.

Re-read and validate the posted candidate, exact markers, required headings/order, unique criterion IDs, useful section content, and non-empty test command before adding `planned`. Re-read to verify the label, then append a NEW `<!-- gt:plan-published v2 -->` record linked to the candidate and prior publication, listing criteria by stable ID and content digest plus explicit transitions. The record validates technical links and content consistency; it is not human approval, authorship, or signature. Verify the record and candidate before reporting success. On partial or uncertain publication, stop, reread, preserve the last published plan, and report; do not retry blindly, roll back labels, or edit old records. Planning does not change checkbox status; only an authorized build may perform the minimal checkbox updates defined in `shared.md`. Stop with a summary; implementation requires a separate requested operation under `execution.md`.

## Retro N

Read the stage, verified current plan, active criteria and `git log --oneline --grep '(#<N>)'`. When explicitly requested, append `## Retrospective` with delivered vs planned, remaining active criteria, historical replaced/cancelled items, risks realized, and actionable lessons. If still open, include its current status. Report acceptance/source inconsistencies; never repair, close or relabel it.

## Doctor catalog (read-only)

This catalog is the stable vocabulary for the `doctor` integrity report. A doctor report only cites observable evidence and proposes no repair, label change, dependency edit, checkbox update, close, or retry. Omit a code when its condition is not established; say `unknown` rather than guessing when GitHub did not return needed data.

| Code | Severity | Emit only when | Report |
| --- | --- | --- | --- |
| `GT-DOC-PLAN-INVALID` | error | No valid current plan can be resolved, or the selected plan has structural/digest/source diagnostics. | Issue and plan/receipt IDs; exact resolver diagnostics; last verifiable plan, if any. |
| `GT-DOC-ACCEPTANCE-INVALID` | error | An acceptance-required plan is treated as current without a valid receipt, or receipt chain/identity/reconciliation validation fails. | Candidate/receipt IDs, failed link or check, and whether a prior accepted plan remains verifiable. |
| `GT-DOC-CANDIDATE-PENDING` | warning | A newer acceptance-required candidate exists but has not displaced a valid accepted plan. | Candidate ID and the accepted plan that remains current; do not characterize the candidate as accepted. |
| `GT-DOC-LABEL-STATE` | error | Observed `planned`/`skipped` labels contradict the verified plan state or the requested stage's lifecycle state. | Exact labels and conflicting plan/state evidence; do not change labels. |
| `GT-DOC-CRITERIA-SOURCE` | error | An active locator's source is missing, text/digest changed beyond an authorized checkbox-state change, or identity is ambiguous. | Locator/document/line and source mismatch; retain the requirement as unresolved. |
| `GT-DOC-CRITERIA-RECONCILIATION` | error | A receipt omits, duplicates, or invalidly disposes a prior active criterion, or a replacement lacks a valid successor/authorization. | Prior item ID, disposition, and missing/invalid mapping. |
| `GT-DOC-CRITERIA-ACTIVE` | warning | Verified active criteria remain unchecked. | Count and exact source/line/text; these still gate completion. |
| `GT-DOC-CRITERIA-HISTORY` | info | Replaced/cancelled criteria are present in accepted history. | Historical items and their recorded disposition/reason, separately from active gate count. History is not completed work. |
| `GT-DOC-DEPENDENCY-INVALID` | error | A dependency returned by GitHub references a missing/non-stage target, a self-edge, or another directly verifiable invalid native edge. | The exact returned edge and target evidence. Never infer an edge from issue/ordinal numbering or file overlap. |
| `GT-DOC-DEPENDENCY-BLOCKED` | warning | GitHub reports an actual open `blockedBy` edge. | Blocker issue number/state and source response; do not treat a merely earlier issue number as a blocker. |
| `GT-DOC-PARTIAL-OPERATION` | error | A prior operation's recorded result shows requested effects split between success and failure, or its final state is explicitly uncertain. | Operation, confirmed successes, failures/unknowns, and recovery boundary; do not retry or roll back automatically. |

Severity is reporting priority, not permission to mutate. `status` stays a concise operational summary; `doctor` performs the deeper integrity audit; `verify` reports implementation evidence and unchecked criteria; `next` additionally requires all completion gates before closing. All reports remain read-only.
