---
name: gt
description: Define a GitHub-stage project workflow for planning, implementation, review, verification, completion, and explicitly authorized commit/publish operations.
---

# GT

GT defines a project workflow through operations, not modes. Accept natural language or explicit requests and identify the requested operation. Ask when target, scope, or authorization is unclear. A bare `@gt` asks for help; it authorizes no actions.

## Workflow and operations

The user-facing workflow is **discover → plan → execute → review → deliver**; these are natural-language shortcuts over guarded operations, not modes or new agents. First understand the repository's current planning, implementation, and delivery practices; compare them with GT and recommend preserving, complementing, adapting, or migrating only when evidence supports the change. Plan outcomes and dependencies, using GitHub sub-issues as tasks when independently trackable work benefits from separate acceptance, ownership, or lifecycle tracking. Use `grillme` for concise, risk-based decision discovery; detail only the next executable slice. Execute only selected authorized scope. Deliver through the project's validated PR/review/merge process where available; do not treat a push or PR creation as approval, merge, or completion.

Keep the workflow proportional: use concise discovery for clear, low-risk work; deepen analysis and ask targeted questions only when ambiguity, risk, or independent deliverables justify it. Investigate repository facts before asking. Recommend structure and execution strategy from complexity, uncertainty, coupling, deliverable independence, and tracking needs; explain material evidence and alternatives without treating a proposal as authorization for writes. Project planning alone remains read-only; issue creation/publication require an explicit request. A compound request authorizes all and only its named operations, without redundant confirmation between their dependent steps. Context can identify a target but never carries authorization into a later request. Reports such as status, doctor, impact, and handoff remain available whenever relevant.

This table defines each operation's allowed effect and required reference. Code review inspects implementation changes; a planning audit is `doctor`. `verify` checks implementation evidence. Normal completion is `next`; skip/reopen are separate administrative operations. References define target resolution, prerequisites, evidence, and stop conditions, not agent responsibilities.

| Request | Allowed effect | Read |
| --- | --- | --- |
| plan a project | Whole-project proposal; GitHub writes only when explicitly requested | `references/planning.md` |
| discover / assess project workflow | Read-only repository/process survey and proportional GT fit recommendation | `references/discovery.md` |
| grillme / decision interview | Bounded, risk-based decision questions; no writes | `../grillme/SKILL.md` |
| kickoff/start | Proportional survey and proposal; create issues only when explicitly requested | `references/planning.md` |
| create issues/stages/dependencies | Explicitly requested issue/edge creation | `references/planning.md` |
| plan/plan all/replan | Record/accept plan and update `planned` under plan contract | `references/planning.md` |
| status | Read-only progress summary | `references/planning.md` |
| doctor (planning audit) | Read-only integrity diagnostics | `references/planning.md` |
| impact | Read-only impact analysis | `references/planning.md` |
| handoff | Quote verified plan in conversation only | `references/planning.md` |
| log | Read-only stage history | `references/planning.md` |
| retro | Append retrospective comment when explicitly requested | `references/planning.md` |
| skip | Explicitly confirmed administrative close/label/comment | `references/planning.md` |
| reopen | Explicitly requested reopen and conditional label removal | `references/planning.md` |
| build/implement | Implement selected planned scope; validate and report | `references/execution.md` |
| execute planned scope | Build plus focused review and validation; no commit/push/close | `references/execution.md` |
| deliver a stage | Review, verify, commit, PR/review/merge as required; close only after applicable gates pass | `references/execution.md`, `references/security.md`, `references/pull-request.md` |
| code review | Read-only implementation and secret-safety review | `references/review.md`, `references/security.md` |
| verify implementation | Read-only implementation/completion verification | `references/execution.md` |
| next/normal close | Gate-check and close one eligible stage | `references/execution.md` |
| owner-requested close | Explicit close with tests/clean-tree gates | `references/execution.md` |
| commit | Explicitly authorized local commit with secret checks | `references/git.md`, `references/security.md` |
| publish | Explicitly authorized push of existing commits | `references/git.md`, `references/security.md` |
| create/update PR | Explicitly authorized PR write; never implies approval or merge | `references/pull-request.md` |

Apply `references/authorization.md` for shared scope/permission rules and `references/shared.md` for GitHub operations. Load only the selected operation's references and dependencies. Invoke the local `grillme` skill for material owner decisions. Each reference owns its procedure; avoid duplicating detailed rules here.

## Shared authorization contract

For intent, target resolution, continuity, compound requests, and safety boundaries, apply `references/authorization.md`. It is authoritative across operation-specific procedures.
