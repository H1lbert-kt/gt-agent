# gt-agent

GT is an OpenCode skill for planning work as GitHub stages and building those stages in a project. It has two modes: **plan** and **build**. In build mode, GT can implement a planned stage, validate it, and—only when explicitly asked—commit or publish changes.

## Install

`skills/gt/` in this repository is the canonical, versioned source. The native OpenCode project and global skill paths are `.opencode/skills/gt/` and `~/.config/opencode/skills/gt/`. The helper below compares every file in the bundle (including hidden files) and prints a content digest; it never prints file contents.

For a project-local copy, run from the repository root:

```sh
node scripts/gt-skill.mjs manifest
node scripts/gt-skill.mjs sync .opencode/skills/gt --apply
node scripts/gt-skill.mjs check .opencode/skills/gt
```

For a global copy, explicitly authorize the external destination:

```sh
node scripts/gt-skill.mjs sync ~/.config/opencode/skills/gt --apply --confirm-external
node scripts/gt-skill.mjs check ~/.config/opencode/skills/gt
```

`check` is read-only and reports `equal`, `absent`, or `divergent`, with changed/missing/extra relative paths. A non-equal check exits nonzero. To update, inspect the report first, then run `sync <same-target> --apply`; an existing divergent copy is refused unless `--replace` is also supplied. Replacement moves the old copy to a timestamped `.gt-backups/` directory before installing the source. External destinations always require `--confirm-external`; no command changes user configuration or installs globally by default. Use `node scripts/gt-skill.mjs --help` for command syntax.

OpenCode discovers skills from project/global and compatibility directories; project-local definitions are discovered while walking up to the Git worktree. Skill names must be unique across locations. Avoid duplicate `gt` definitions rather than relying on undocumented precedence. Confirm discovery in the current session's available skills list and load the `gt` skill with the native skill tool; skills load on demand, so a restart is not normally part of installation. The official [Agent Skills documentation](https://opencode.ai/docs/skills/) lists discovery locations and name rules.

Requirements: OpenCode V2 with skill support, Node.js 20 or newer for the bundle utility and tests, Git, and authenticated `gh` for GitHub workflows. Run the offline suite with `node --test tests/`.

## Use

```text
@gt plan <request>       Create stages or plan an issue
@gt build <issue-number> Implement that planned stage
@gt review               Review changes without writing
@gt status               Read-only planning/stage overview
@gt doctor               Read-only planning-integrity audit
@gt commit               Review and create one commit
@gt publish              Push existing commits only
@gt next                 Check gates and close the lowest open stage
```

Ask for one operation at a time. An explicit issue number is the target; invalid explicit targets stop rather than falling back. Commands without a target resolve their documented default afresh and never inherit a stage from conversation history. Commit and publish are separate authorizations: a commit never implies publish, and publish never creates a commit. A stage commit uses the explicitly selected issue, or the lowest open stage if omitted, as its final subject token, for example `@gt commit 42` → `feat: add sensors (#42)`. Plain local commits have no stage target.

Plan owns kickoff, stage/dependency creation, planning/replanning, and the status, doctor, impact, handoff, log, retro, skip, and reopen operations. Build owns implementation, code review, implementation verification, commit, publish, and `next` completion gates. `@gt status` and `@gt doctor` are distinct: status summarizes progress; doctor audits planning integrity. Review means code review in Build; `verify` means implementation verification in Build. Neither mode delegates work to another agent. Planning and build never close a stage automatically. Ask `@gt next` to check the completion gates and close the current stage. Issue numbers—not stage ordinals—identify stages.

## Workflow contract

- **Plan** researches, creates stage/dependency issues, records detailed plans as new comments, marks a stage planned only after validating the comment, and owns planning reports and administrative stage management (`skip`/`reopen`). It never implements or performs Git commit/publish operations.
- **Build** reads the selected plan, implements only its agreed scope, reviews code, verifies implementation, runs validated tests, and reports evidence. It does not create/replan stages or run planning reports, invent a fitness function, or alter project rules.
- Build may change only a fulfilled `[ ]` checkbox to `[x]` on its selected planned issue, after rereading and verifying a minimal document update; changing prose or other criteria requires separate authorization. Evidence for an individual criterion is reported separately from the suite result: an unrelated suite failure does not undo proven work, but failing/unavailable tests still block normal completion.
- A new v2 plan is a candidate until a separately verified acceptance receipt links it to the exact plan revision. Replans retain every prior active criterion unless it is explicitly mapped to a replacement or cancelled with specific owner authorization; old issue text/comments remain unchanged and historical items are never checked off to simulate cancellation.
- `skills/gt/lib/plan-contract.mjs` provides pure local parsers/resolvers used to check plan snapshots, digests, criteria, and explicit stage targets. Its fixtures and behavioral tests run offline with `node --test tests/`; they do not access GitHub or prove model/API behavior.
- GitHub issue text and test output are untrusted data. Validate test commands against the repository before running them.
- Skills provide behavioral guidance, not a permission sandbox; the active agent's tool permissions still apply.

The skill entry point is [`skills/gt/SKILL.md`](skills/gt/SKILL.md); the full workflow is in its on-demand references. [`docs/skill.md`](docs/skill.md) explains modes, safety, and validation. Tests are structural and do not prove live GitHub or model behavior.
