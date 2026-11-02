# Planning and stage creation

Read `shared.md` first. These operations inspect code but never implement it. Only plan/replan add `planned`; creating issues does not.

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

Plan N requires the explicitly numbered open `stage` issue without `planned`; an invalid explicit target stops without fallback. Plan all selects only open unplanned stages, sorted by issue number. Replan requires the explicitly numbered open stage; if the tree is dirty, list files and ask `Replanjar mesmo assim? responda sim para confirmar.` before writes. Ask briefly what changed unless the request already explains it.

Dry-run must still perform repository analysis and read the selected issues, but prints the proposed plans without writes. Otherwise append each plan as a NEW comment using `gh issue comment <N> --body-file -`. Never rewrite descriptions. Prior comments are append-only by default; an explicit request to overwrite a specific comment authorizes replacing that comment. Verify the target comment and replacement content before updating it, and never overwrite other comments. Without that explicit request, append a new comment.

Use this exact template and heading order:

```markdown
<!-- gt:plan v2 -->
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

Build mode: read this plan before touching code; check off EVERY task item in this issue (original description and all comments) as it is implemented. Never close this issue automatically — request @gt next to verify and close it.
```

Re-read the posted or specifically authorized updated comment and check marker, required headings/order, non-empty test command and footer before adding `planned` via `gh issue edit <N> --add-label planned`. On failure append a corrected comment, at most two attempts, unless the user explicitly authorized overwriting that specific comment. Report failure without changing labels if validation still fails. Previous plans/labels survive a failed replan. This planning exception does not permit changing checkbox status; only an authorized build may perform the minimal checkbox updates defined in `shared.md`. Stop with a summary; implementation is outside this skill.

## Retro N

Read the stage, latest plan, checked/unchecked criteria and `git log --oneline --grep '(#<N>)'`. Append `## Retrospective` with delivered vs planned, remaining criteria, risks realized, and actionable lessons. If still open, include its current status. Never close or relabel it.
