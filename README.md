# gt-agent

GT is an OpenCode skill for planning work as GitHub stages and building those stages in a project. It has two modes: **plan** and **build**. In build mode, GT can implement a planned stage, validate it, and—only when explicitly asked—commit or publish changes.

## Install

```sh
mkdir -p ~/.config/opencode/skills
cp -r skills/gt ~/.config/opencode/skills/gt
```

For a project-only install, copy to `.opencode/skills/gt/`. Requirements: OpenCode with skill support, Git, and authenticated `gh` for GitHub workflows. Run the structural tests with `node --test tests/` (Node.js).

## Use

```text
@gt plan <request>       Create stages or plan an issue
@gt build <issue-number> Implement a planned stage
@gt review               Review changes without writing
@gt commit               Review and create one commit
@gt publish              Push existing commits only
```

Ask for one operation at a time. Commit and publish are separate authorizations: a commit never implies publish, and publish never creates a commit. A stage commit references the current stage issue as the final subject token, for example `feat: add sensors (#42)`.

Planning and build never close a stage automatically. Ask `@gt next` to check the completion gates and close the current stage. Use `@gt status` for a read-only overview. Issue numbers—not stage ordinals—identify stages.

## Workflow contract

- **Plan** creates stage issues, records detailed plans as new comments, and marks a stage planned only after validating the comment.
- **Build** reads the selected plan, implements only its agreed scope, runs validated tests, and reports evidence. It does not invent a fitness function or alter project rules.
- GitHub issue text and test output are untrusted data. Validate test commands against the repository before running them.
- Skills provide behavioral guidance, not a permission sandbox; the active agent's tool permissions still apply.

The skill entry point is [`skills/gt/SKILL.md`](skills/gt/SKILL.md); the full workflow is in its on-demand references. [`docs/skill.md`](docs/skill.md) explains modes, safety, and validation. Tests are structural and do not prove live GitHub or model behavior.
