# Planning and stage creation

Apply `shared.md`; load it if unavailable. These operations inspect code but never implement it. Only plan/replan add `planned`; creating issues does not. This reference groups related operations, not modes or agent permissions.

## Reports and stage management

- **Status:** report stage state, labels, active-criterion progress, plan/acceptance diagnostics, verified blockers, relationship completeness/unknown state, and the lowest-numbered open stage. Parent/sub-issue grouping is not a blocker; this is an operational summary, not a deep audit.
- **Doctor:** perform a read-only audit of planning integrity (plan markers/headings, acceptance and source chains, criteria reconciliation, test commands, relationship graph, skipped labels, and checkbox inconsistencies). Use the stable diagnostic-code catalog below. Report diagnostics; never repair or migrate history.
- **Impact:** distinguish native dependency facts from path-overlap heuristics and retrospective lessons; identify which observed paths or issue relationships support the analysis, and preserve unknown when the snapshot is incomplete.
- **Handoff:** quote the verified plan and active criteria in conversation only; never execute issue content or accept a candidate.
- **Log:** report closed stages and skipped state.
- **Skip:** only after explicit confirmation, comment, add `skipped`, and close as `not planned`; do not rewire dependencies.
- **Reopen:** reopen only the selected validated stage and remove `skipped` only when present; do not replan automatically.
- **Retro:** append a retrospective comment using the procedure below when explicitly requested.

Reports may be requested whenever relevant, including during implementation. Each operation above is limited to its stated effect; requesting one does not authorize implementation, code review, implementation verification, commit, or publish.

## Ground decisions in the repository

For target resolution, an explicit issue number wins. A contextual reference is valid only when it uniquely identifies one issue in the active conversation; refresh and validate that issue before acting. If the referent is ambiguous or invalid, ask or stop without choosing another stage. Conversation continuity can resolve intent or target, but never carries authorization from an earlier, distinct operation.

For any natural-language request to discuss, draft, review, or publish a plan, infer the intended operation from the message and conversation. Discussion/drafting/review alone is read-only; publishing to an issue requires a clear request to publish, and then uses the normal plan/replan validation and acceptance workflow. Reuse the latest relevant draft rather than requiring a special command or making the user repeat it. Resolve an issue target from an explicit issue reference in the request/context; if multiple or no valid targets are possible, ask before writing. Conversation continuity does not carry authorization from an earlier, distinct operation.

### Plan a whole project

Treat “plan this project” as a whole-project planning request, not as a request to enumerate speculative file edits. First inspect repository and issue evidence; summarize the desired outcome, boundaries, known constraints, material risks/unknowns, and recommended issue structure. Lay out coherent deliverables and only concrete prerequisite dependencies, with the outcome and evidence expected from each. Detail the next implementation-ready slice; describe later slices as outcomes and decision points when they depend on earlier findings. Use bounded investigation where unresolved evidence could change scope or architecture. Ask only for decisions that materially change the plan, group independent questions, and assume minor reversible implementation details. A proposal stays conversation-only unless the owner explicitly asks to create issues or publish it; a clear combined request to create and publish authorizes both planning writes, with the usual duplicate, target, plan, and publication checks. Do not ask for another confirmation between those explicitly requested planning writes.

For an explicitly authorized multi-stage execution, keep the selected stage set finite and identifiable. Re-evaluate and detail each later slice only after its prerequisites/evidence are available; do not invent missing requirements, silently expand the set, or turn a new discovery into authorization for changed scope. Stop and ask only when the discovery materially changes goals, acceptance, architecture, safety, or the authorized target set.

### Adaptive discovery and `grill-me`

Use a short, risk-based interview rather than a fixed questionnaire. First inspect the repository for facts the agent can establish; do not ask the owner to look up repository facts. Ask only about unresolved decisions that materially change goals, scope, architecture, risk, ownership, or acceptance. Offer a recommended answer and the key trade-off, and word a yes/no question so “yes” accepts that recommendation. Ask independent frontier questions together; defer questions that depend on an unanswered decision to the next round. Stop once the plan is safe and actionable; record minor, reversible details as implementation discretion instead of extending the interview. For clear, low-risk requests, skip grilling or ask at most the single consequential question. When explaining a material choice of target, scope, dependency, or priority, identify its observed source and mark inference or missing information as such. Do not delegate fact-finding to another agent.

When the owner explicitly says “grill-me”, “grill me”, or asks to be interviewed/stress-test a proposal, make that interview the requested operation: present the current round's numbered decision questions with a recommended answer and brief trade-off, then wait. Recompute the next question frontier from the answers; do not ask dependent questions prematurely or repeat settled topics. Keep each round to the currently answerable, material decisions. End by summarizing the agreed understanding and remaining assumptions, then wait for explicit authorization before any issue or plan write.

The interview is discovery, not authorization. Answers and agreement on a plan do not authorize issue creation, plan publication, implementation, commit, push, or closure. A clear request such as “publish this plan, creating the necessary issue(s)” authorizes the combined planning writes described below, but not implementation or delivery operations.

### Choose the issue structure and execution strategy

For kickoff, issue creation, plan, and replan, make a proportional recommendation instead of asking the owner to choose a format up front. Ground it in the request, repository, current issue inventory, active criteria, verified relationships, and available evidence. Consider together: complexity, uncertainty, coupling, whether deliverables can be completed independently, and whether they need separate ownership or lifecycle tracking. State observed facts separately from inference and recommendation; preserve `unknown` when evidence is incomplete.

- **One coherent deliverable:** recommend one issue. Use internal implementation steps/checklists for sequence; do not create child issues merely to enumerate technical tasks.
- **One shared outcome with independently trackable deliverables:** recommend a parent with focused sub-issues only when separate ownership, release/lifecycle, or progress tracking has real value. Keep the parent outcome distinct; child grouping does not imply a blocker or completion.
- **Independent outcomes:** recommend separate issues rather than an artificial parent or dependency. Add a native blocking edge only for a concrete prerequisite that changes execution order, and state that rationale.
- **Material uncertainty:** when missing evidence could change scope, architecture, acceptance, or decomposition, recommend a bounded investigation first. Name the question it resolves, the evidence/deliverable it must produce, and the decision that follows; do not invent later implementation details.
- **Existing issue:** inspect relevant open and closed issues and the selected issue's verified plan/active criteria before proposing structure. Identify duplicate goals, preserve active requirements and history, and make any proposed structural change explicit. Do not silently split, merge, renumber, or rewrite an existing issue.

Present the recommendation briefly: proposed structure and sequence; deliverables and evidence expected at each step; the observed facts and material inferences supporting it; and relevant alternatives rejected with a short reason. State unknowns or ask only when they materially change the choice. A recommendation—even an autonomous one—does not authorize creating issues/relationships, changing criteria, implementing, committing, pushing, or closing. Perform only the writes clearly authorized for the requested operation.

Before kickoff, new issues, plan, replan, or retro, inspect the repository rules, relevant source/tests, validated test scripts, working-tree state, and GitHub issue/plan state needed for that specific decision. On the first related operation, establish relevant baseline context including README, structure, recent history, stage history, open plans, and pertinent retrospectives; reuse those findings across related requests. Refresh mutable GitHub/tree state before writes and re-read immutable files only when they changed or the next decision needs them. Scale breadth to risk and scope, but ground every goal, path, constraint, criterion, and test command in evidence. Flag uncommitted work; ask about genuine contradictions. Never duplicate implemented work or invent extra scope.

## Kickoff / new issues

- Kickoff is a read-only, proportional survey/proposal unless the user explicitly asks to create issues. Apply the structure/strategy recommendation above. Compare a supplied repository against origin when relevant. Existing open stages are not by themselves a reason to refuse an independent initiative: inspect them for duplicates, distinguish the new initiative from existing work, and do not silently merge or renumber existing stages.
- Adding new issues requires an explicit request and checks relevant existing issues, open and closed, for duplicates. Skip matching goals and report them.
- Recommend one issue per coherent deliverable, with internal steps for technical sequence. Recommend child issues only for independently trackable deliverables, distinct ownership, or a separate lifecycle; recommend independent issues for unrelated outcomes. A parent summarizes the shared goal, boundaries, and outcome; each child has its own scoped outcome and acceptance criteria, without duplicating active obligations. A child relationship is organizational, not automatically a dependency or proof that the parent is complete. Create native parent/sub-issue links only when explicitly authorized and the repository's authenticated GitHub tooling supports and verifies them; otherwise report the limitation and keep issues explicitly cross-referenced without claiming a native relationship. If structure depends on materially missing evidence, propose a bounded investigation with a decision-focused result. Ask only when a material choice cannot be reasonably resolved; report the recommendation, sequence, evidence, and relevant rejected alternatives. Dry-run prints drafts only: no labels, comments, dependencies, links, or issues are written.
- A single explicit request to create issue(s) and publish the associated plan authorizes those constituent planning writes as one operation. Determine the issue structure first; create only authorized, non-duplicate issues; publish the plan on the correct open stage issue; perform all normal candidate/label/publication validations; then report issue IDs, links, plan/receipt, and partial failures. Do not pause for redundant confirmation between these steps. If creation succeeds but planning/publication fails, preserve and report created issues and stop; never roll back or retry blindly. This combined request does not authorize implementation, commit, push, or closure. Issue creation alone still does not add `planned`.
- Ensure labels `stage`, `planned`, `skipped` exist using `gh label create <label> --force`.
- Use the reusable `.github/ISSUE_TEMPLATE/stage.md` structure and the taxonomy in `references/issue-taxonomy.md`. Attach `stage` and only existing type/area/priority labels supported by the request; omit unknown dimensions rather than guessing. Do not add `planned` or `skipped` during issue creation, create duplicate labels, or reclassify existing issues as a side effect.
- Create issues using `gh issue create` with `stage` and supported classification labels, titled `Stage N: <name>`. Continue any existing title ordinal for compatibility; GitHub issue numbers are independent. Always report actual issue numbers; use those numbers in subsequent operations. Do not create placeholder issues just to obtain a target when the request authorizes creating and planning the issue together.
- Keep each body grounded in the request and the template's context/problem, expected result, scope, exclusions, and concise verifiable acceptance criteria. A parent issue may identify its children; child bodies link back to the parent and state their own result/checklist. Do not repeat detailed plans or criteria across issues. Creation-only requests do not publish detailed plans or add `planned`.
- Link native dependencies only when an artifact, file ordering, or explicit requirement actually demands them. Independent stages get no edge. Report each edge and verify it.
- For each blocking edge, preserve a concise rationale with the planning record: name the concrete prerequisite and how it changes execution order. The rationale is explanatory context, not a substitute for the verified native edge. Parent/child grouping and textual issue mentions do not imply a blocker.
- Report partial creation/link failures and exactly what succeeded; never delete issues to roll back. For creation-only requests, finish with issue URLs/numbers and suggest explicit planning, then stop. For an explicitly combined create-and-plan request, continue through plan publication and verification before reporting.

## Plan N / plan all / replan N

Plan N requires the explicitly numbered open `stage` issue without `planned`; an invalid explicit target stops without fallback. Plan all selects only open unplanned stages, sorted by issue number. Replan requires the explicitly numbered open stage; if the tree is dirty, list files and ask `Replanjar mesmo assim? responda sim para confirmar.` before writes. Ask briefly what changed unless the request already explains it. A replan reconciles declared active criteria under `shared.md`; a generic request to replan does not authorize canceling or replacing requirements.

### Plan depth

Scale analysis and prose to complexity, uncertainty, and impact. A concise plan for clear, low-risk work states the objective, scope, implementation, validation, and criteria without ceremonial sections. A complete plan adds evidence/diagnosis, included and excluded scope, constraints, technical decisions, sequencing, and risks when they help decisions. Ground target, scope, dependency, and priority choices in the request and freshly observed repository/GitHub evidence; label material inferences and preserve unknown when evidence is incomplete or conflicting. Do not add empty sections or invent detail. For whole projects, show the deliverable map but make only the next dependent slice implementation-ready; state later slices as outcomes and evidence-driven decisions. Avoid repeated repository reads by reusing context while refreshing mutable state before writes.

Dry-run performs the repository analysis needed for the decision and reads the selected issues, then prints proposed plans without writes. Otherwise append each plan as a NEW comment using `gh issue comment <N> --body-file -`. Never rewrite descriptions. Prior comments are append-only by default; an explicit request to overwrite a specific comment authorizes replacing only that comment. New plans use v3 persistent criterion IDs and remain pending until a verified publication record is appended as specified in `shared.md`. Legacy v1/v2 plans and receipts remain readable; never migrate or rewrite them automatically.

### V3 plan content and presentation

V3 plans do not require one exact template or heading order. Use one level-two heading for each of these semantic sections, exactly once; aliases are case-insensitive:

- **Goal:** `Goal`, `Objective`, `Purpose`, or `Desired outcome`.
- **Scope:** `Scope`, `Boundaries`, or `Included and excluded`.
- **Implementation:** `Implementation`, `Implementation steps`, `Execution plan`, or `Steps`.
- **Validation:** `Tests`, `Validation`, or `Verification`; include a non-empty `Test command:` line.
- **Acceptance:** `Acceptance criteria`.

These semantic sections must contain useful content. Their order is free. Add useful headings, subsections, lists, or tables as needed; do not repeat a semantic section under a second alias, since that makes its meaning ambiguous. Constraints, technical decisions, diagnostic evidence, and risks are expected when complexity warrants them, not mandatory empty fields. Keep criterion-to-implementation/evidence traceability concise: refer to stable criterion IDs in steps or prose instead of duplicating task checklists.

### Readable issue presentation

Keep the exact plan marker as the first line. Immediately after it, a short bold summary may identify the objective, scope, and revision/publication state; describe state as informational and point out that the verified publication record is authoritative. Do not invent a revision number or imply a candidate is published. Separate the summary from the body with a blank line or one restrained horizontal rule.

Use descriptive headings, short paragraphs, and consistent spacing. Number implementation steps when order matters and name each step's deliverable. Prefer short lists over wide tables; use a table only for a compact comparison that remains understandable on a narrow screen. `<details>` may hold supplementary background or lengthy examples, but never the goal, scope, acceptance criteria, or essential validation. Use checkboxes only for active acceptance criteria under `## Acceptance criteria`; examples and informational steps use prose or numbered lists. Keep links descriptive and verify their destinations. These are presentation recommendations, not additional semantic sections or parser requirements.

Example (the summary is descriptive; publication records determine actual state):

```markdown
<!-- gt:plan v3 -->
**Summary:** Clarify the parser's behavior; scope: parser and focused tests; revision: candidate (not yet published).

---

## Objective
Accept the documented concise format without changing legacy plan behavior.

## Scope
Included: the v3 parser and its fixtures. Excluded: publication semantics.

## Steps
1. Update the parser — deliverable: focused behavior and regression tests.
2. Validate — deliverable: passing offline suite.

## Validation
Test command: node --test tests/
The focused fixture demonstrates the accepted format.

## Acceptance criteria
- [ ] [criterion:concise-format] The parser accepts the format and regression tests cover it.

<details>
<summary>Supplementary context</summary>

See the [project overview](https://github.com/H1lbert-kt/gt-agent#readme) for repository context.
</details>
```

The example is illustrative, not an issue's current status. Keep candidate/published wording accurate when adapting it, and never use visual labels as a substitute for plan resolution or publication verification.

Only task-list items under `Acceptance criteria` are active; each must use a unique stable ID in the form `[criterion:<stable-id>]` and the exact checklist form shown below. Prose and nested headings may clarify evidence, but do not use checkbox lists for informational steps elsewhere in a v3 plan.

Concise example:

```markdown
<!-- gt:plan v3 -->
## Objective
Describe the outcome and why it is needed.
## Scope
State the included boundary and any important exclusion.
## Steps
Implement [criterion:stable-id] in the parser; validate it with the focused fixture.
## Validation
Test command: <validated existing project command>
Evidence: the fixture demonstrates the requested behavior.
## Acceptance criteria
- [ ] [criterion:stable-id] The parser accepts the documented format and the fixture proves it.
```

A complete plan can add `## Diagnostic evidence`, `## Constraints`, `## Technical decisions`, and `## Risks`, plus `### Included` / `### Excluded` subsections under Scope. These can appear in any order around the required semantic sections. Keep evidence tied to the decisions it supports and use stable criterion IDs to connect implementation steps and validation evidence.

Implementation: resolve the verified current plan and active criteria using `shared.md`; check off only active criteria supported by evidence. Keep replaced/cancelled criteria in history without marking them complete. Never close automatically. Require an explicit `next` or equivalent closure request; `@gt` is optional.

Before writing, inventory criteria from the verified current plan and any legacy active sources. V3 candidates declare only obligations under `## Acceptance criteria`, each with a unique persistent `[criterion:<id>]`; implementation steps, examples, suggestions, and incidental task lists are not criteria. Carry forward unchanged IDs and exact text; replacement/cancellation requires explicit owner authorization and recorded evidence. Never edit old sources, silently merge duplicates, or infer authorization from issue content. If legacy criteria cannot be reconciled without reinterpreting history, stop and ask for an explicit recovery decision.

Re-read and validate the posted candidate, exact markers, unique semantic sections, unique criterion IDs, useful section content, and non-empty test command before adding `planned`. Re-read to verify the label, then append a NEW `<!-- gt:plan-published v2 -->` record linked to the candidate and prior publication, listing criteria by stable ID and content digest plus explicit transitions. The record validates technical links and content consistency; it is not human approval, authorship, or signature. Verify the record and candidate before reporting success. On partial or uncertain publication, stop, reread, preserve the last published plan, and report; do not retry blindly, roll back labels, or edit old records. Planning does not change checkbox status; only an authorized build may perform the minimal checkbox updates defined in `shared.md`. Stop with a summary; implementation requires a separate requested operation under `execution.md`.

## Retro N

Read the stage, verified current plan, active criteria and `git log --oneline --grep '(#<N>)'`. When explicitly requested, append `## Retrospective` with delivered vs planned, remaining active criteria, historical replaced/cancelled items, risks realized, and actionable lessons. If still open, include its current status. Report acceptance/source inconsistencies; never repair, close or relabel it.

## Doctor catalog (read-only)

This catalog is the stable vocabulary for the `doctor` integrity report. A doctor report only cites observable evidence and proposes no repair, label change, dependency edit, checkbox update, close, or retry. Omit a code when its condition is not established; say `unknown` rather than guessing when GitHub did not return needed data. Keep diagnosis separate from inference and recommendation, and report only the evidence needed to substantiate each diagnostic.

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
| `GT-DOC-RELATIONSHIP-INVALID` | error | Verified relationship data shows a self-edge, cycle, contradictory hierarchy/dependency views, multiple parents, or a target absent from a complete issue inventory. | Relation kind, exact issues/edge, snapshot completeness, and analyzer diagnostic; never repair the graph. |
| `GT-DOC-RELATIONSHIP-UNKNOWN` | warning | Relationship fetches/inventory are incomplete or unavailable, so absence of blockers or global graph integrity cannot be established. | Which relation family/inventory is incomplete and the observed boundary; do not report unblocked/readiness as known. |
| `GT-DOC-PARTIAL-OPERATION` | error | A prior operation's recorded result shows requested effects split between success and failure, or its final state is explicitly uncertain. | Operation, confirmed successes, failures/unknowns, and recovery boundary; do not retry or roll back automatically. |

Severity is reporting priority, not permission to mutate. `status` stays a concise operational summary; `doctor` performs the deeper integrity audit; `verify` reports implementation evidence and unchecked criteria; `next` additionally requires all completion gates before closing. All reports remain read-only.
