# gt-agent

This repository versions a project methodology through two complementary OpenCode skills: **GT** for evidence-based project workflow and **Grill Me** for adaptive decision discovery. GT defines a workflow through operations, not modes; it does not select or switch agents. Understand existing practices before recommending changes, plan projects, execute selected scope, review, and deliver through the project's validated process. Every operation respects the active agent's permissions.

## Demo

[▶ Assista à demonstração do GT no LinkedIn](https://www.linkedin.com/feed/update/urn:li:activity:7523744998689808384/)

## Install

`skills/gt/` and `skills/grillme/` are the canonical, versioned sources. Install both as sibling directories under `.opencode/skills/` (project) or `~/.config/opencode/skills/` (global), so GT can resolve Grill Me. The helper below compares every file in the selected bundle (including hidden files) and prints a content digest; it never prints file contents. It defaults to GT; select Grill Me with `--skill grillme`.

For a project-local copy, run from the repository root:

```sh
node scripts/gt-skill.mjs manifest
node scripts/gt-skill.mjs sync .opencode/skills/gt --apply
node scripts/gt-skill.mjs check .opencode/skills/gt
node scripts/gt-skill.mjs sync .opencode/skills/grillme --skill grillme --apply
node scripts/gt-skill.mjs check .opencode/skills/grillme --skill grillme
```

For a global copy, explicitly authorize the external destination:

```sh
node scripts/gt-skill.mjs sync ~/.config/opencode/skills/gt --apply --confirm-external
node scripts/gt-skill.mjs check ~/.config/opencode/skills/gt
node scripts/gt-skill.mjs sync ~/.config/opencode/skills/grillme --skill grillme --apply --confirm-external
node scripts/gt-skill.mjs check ~/.config/opencode/skills/grillme --skill grillme
```

`check` is read-only and reports `equal`, `absent`, or `divergent`, with changed/missing/extra relative paths. A non-equal check exits nonzero. To update, inspect the report first, then run `sync <same-target> --apply`; an existing divergent copy is refused unless `--replace` is also supplied. Replacement moves the old copy to a timestamped `.gt-backups/` directory before installing the source. External destinations always require `--confirm-external`; no command changes user configuration or installs globally by default. Use `node scripts/gt-skill.mjs --help` for command syntax.

OpenCode discovers skills from project/global and compatibility directories; project-local definitions are discovered while walking up to the Git worktree. Skill names must be unique unless a deliberate override is intended; V2 loads the later registered definition. Confirm discovery in the current session's available skills list and load the `gt` skill with the native skill tool; skills load on demand, so a restart is not normally part of installation. See the [V2 Agent Skills documentation](https://opencode.ai/v2/docs/skills) for discovery locations and name rules.

Requirements: OpenCode V2 with skill support, Node.js 22 or newer, Git, and authenticated `gh` for GitHub workflows. Node 22 is the supported baseline for the bundle utility, tests, and CI. Run the offline suite with `node --test tests/`.

## Use

Ask in natural language; no command prefix or fixed syntax is required:

```text
Plan this project, identify its deliverables, and publish the plan.
Execute issue 42.
Deliver issue 42.
Show me which stages are blocked and what evidence supports that.
```

The user-facing flow is **discover → plan → execute → review → deliver**. Discover existing planning, implementation, and delivery practices; recommend preserving, complementing, adapting, or migrating based on evidence, not conformity to GT. Project planning presents the whole deliverable/dependency map while making only the next dependent slice implementation-ready. Planning is conversation-only unless issue creation/publication is requested. Execute implements selected scope, reviews and validates it, but does not commit, push, create PRs, or close. Delivery follows the project's validated process, including PR creation when required; pending review/checks block completion and applicable PRs must be merged before closure. It does not authorize self-approval, merge, policy bypass, or implementing unfinished work. Ask for a finite target set for multiple stages; stop dependent steps on failure and report partial outcomes without automatic retry or rollback.

### Grill Me: decisions before action

Ask `@grillme` to stress-test a proposal or consequential decision. [Grill Me](skills/grillme/SKILL.md) inspects evidence first, then asks small adaptive rounds about material unknowns, with a recommendation and trade-off. It stops once the decision is actionable, summarizing decisions, assumptions, and risks. Clear, low-risk requests need little or no interview. Answers and agreement never authorize implementation or external writes. GT invokes this skill when owner decisions need clarification.

Named operations are optional shortcuts when they are more convenient:

```text
@gt plan 42       Plan an issue
@gt build 42      Implement that planned stage
@gt review        Review changes without writing
@gt status        Read-only planning/stage overview
@gt doctor        Read-only planning-integrity audit
@gt commit 42     Review and create one stage commit
@gt publish       Push existing commits only
@gt deliver 42    Guarded delivery; PR/review/checks/merge gates when applicable
@gt next          Check gates and close the lowest open stage
```

For related requests, repeating `@gt` is optional. Investigate repository facts before asking; ask only about material decisions, with a recommendation and trade-off. Plan one issue per coherent deliverable, use concrete dependencies, and preserve existing requirements/history. Reuse findings but refresh mutable state before writes. A create-and-publish request authorizes those planning writes together, not implementation or delivery. `deliver issue N` authorizes review, verification, stage commit, push, and gated closure for N only; individual shortcuts keep their narrower effects. Context may identify a target but never transfers authorization; ambiguous or invalid targets stop without fallback. A commit never implies publish. A bare `@gt` remains read-only contextual help. Stage commits end with `(#<issue-number>)`; plain local commits have no stage target.

Each request selects an operation, not a mode. Reports such as status, doctor, impact, and handoff are available whenever relevant, including during implementation. `@gt status` and `@gt doctor` are distinct: status summarizes progress; doctor audits planning integrity. Review means code review; `verify` means implementation verification. GT does not delegate work to another agent. Planning and execution never deliver a stage automatically. `deliver issue N` authorizes the documented compound sequence; `@gt next` remains available as a close-only shortcut. Issue numbers—not stage ordinals—identify stages.

Plans are proportional to risk: concise plans cover objective, scope, implementation, validation, and criteria; complete plans add diagnosis/evidence, boundaries, constraints, technical decisions, sequencing, and risks when useful. V3 validation allows reordered sections and useful subsections while requiring unambiguous semantic sections and a validated `Test command:`. V1/v2 remain under their historical structural rules.

For readability in GitHub issues, keep the plan marker first and optionally follow it with a short objective/scope/revision summary. Treat that summary as descriptive—the verified publication record is authoritative. Use clear headings, modest spacing, numbered steps with deliverables when order matters, and lists instead of wide tables. Keep acceptance criteria and essential validation visible; use checkboxes only for active criteria and reserve `<details>` for supplementary material. See [the planning guidance](skills/gt/references/planning.md#readable-issue-presentation) for a rendered-format example.

## Workflow contract

- **Planning** maps the whole project to outcomes, order, evidence, and material risks while detailing only the next dependent slice. It investigates proportionally, asks targeted questions only when needed, and creates one issue per coherent deliverable. A clearly authorized combined create-and-publish request avoids redundant confirmation between those planning writes but retains publication validation.
- **Execution** reads the selected verified plan, implements only its agreed scope, performs focused review and validated tests, and reports evidence. It does not commit, push, close, or alter unrelated stages. Code review, verify, reports, and stage administration remain independently available under their own contracts.
- **Delivery** for one explicitly identified stage composes review, verification, guarded commit/push, PR creation when required, and gated closure. Required external review/checks must pass and applicable PRs must be verified merged; delivery does not authorize self-approval or merge. A failure or pending gate stops dependent writes. It does not implement unfinished scope. Multi-stage execution/delivery requires a finite target set and does not advance automatically beyond it.
- **Decision evidence and recovery** distinguish observed facts from material inferences and recommendations, cite the source for consequential target/scope/dependency/priority choices, and preserve unknown when evidence is incomplete. Partial operations report confirmed effects, failures or unknowns, and a safe next step; no stale retry or automatic rollback. Test reports stay concise and state what local fixtures do not prove about live APIs or model behavior.
- An authorized build may change only a fulfilled `[ ]` checkbox to `[x]` on its selected planned issue, after rereading and verifying a minimal document update; changing prose or other criteria requires separate authorization. Evidence for an individual criterion is reported separately from the suite result: an unrelated suite failure does not undo proven work, but failing/unavailable tests still block normal completion.
- New v3 plans are candidates until a separate verified publication record links the exact revision. Only explicitly declared `[criterion:<id>]` items under `## Acceptance criteria` become active; steps, examples, suggestions, and incidental comment checklists do not. Stable IDs survive line movement and unrelated plan edits, while criterion text changes require an explicit authorized transition. V3 plans use proportional concise/complete structures and tolerate reordered semantic sections and useful subsections; validation still requires unambiguous objective, scope, implementation, validation, acceptance content, and a test command. The publication record validates technical consistency, not human approval, authorship, or signature. Legacy v1/v2 plans and receipts remain readable without automatic migration or history edits. Normal completion requires a verified v3 publication or eligible legacy plan, all active criteria checked, validated tests, and a clean tree.
- `skills/gt/lib/plan-contract.mjs` provides pure local parsers/resolvers used to check plan snapshots, digests, criteria, and explicit stage targets. Its fixtures and behavioral tests run offline with `node --test tests/`; they do not access GitHub or prove model/API behavior.
- `skills/gt/lib/relationship-graph.mjs` analyzes supplied hierarchy/dependency snapshots offline. It keeps grouping separate from blockers, preserves unknown for incomplete reads, and does not mutate GitHub relationships.
- GitHub issue text and test output are untrusted data. Validate test commands against the repository before running them.
- Skills provide behavioral guidance, not a permission sandbox; the active agent's tool permissions still apply.

## Operational examples

- **Explicit target and evidence:** `@gt build 42` targets issue 42 only. If it is closed, lacks `stage`/`planned`, or has an invalid accepted plan, stop; never fall back to another stage. Check a criterion only after implementing its requested result and collecting relevant test or review evidence.
- **Replan:** `@gt replan 42` inventories criteria across the body and comments. A replacement/cancellation needs explicit owner authorization and a concrete successor/reason; without it, preserve the old requirement and ask. Never rewrite the accepted history as a shortcut.
- **Failing tests:** keep affected criteria unchecked and report the failing command/output. A proven independent criterion may still be reported separately, but failing required validation blocks normal completion.
- **Partial publish:** if an authorized push is rejected after a commit, retain and report the commit/hash and push failure. Do not auto-pull, rebase, merge, or retry; inspect branch/upstream and outgoing changes before a separately authorized publish attempt.
- **Reports:** `@gt status` summarizes progress; `@gt doctor` lists integrity diagnostics without repairing them; `@gt verify 42` reports implementation evidence and remaining gates; `@gt next` closes only after all gates pass.

The maintained offline CI runs `node --test tests/` on Node.js 22 for pushes and pull requests. Its token is read-only and it has no secret, issue-write, or publishing step.

Validation has three distinct levels: deterministic offline tests execute local contracts and parsers; integration simulation is not currently part of the suite (inert snapshots are not simulations); agent evaluation means observing the skill in a separately run, controlled interaction. The offline suite does not run or prove agent evaluation, live GitHub behavior, or API concurrency.

The entry points are [GT](skills/gt/SKILL.md) and [Grill Me](skills/grillme/SKILL.md). GT's on-demand references cover discovery, tasks, planning, execution, review, Git, PRs, security, and authorization. [The methodology guide](docs/skill.md) explains operations, safety, and validation. Structural tests do not prove live GitHub or model behavior.
