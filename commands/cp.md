---
description: Review, commit, and push the project (/cp, /cp gt)
agent: build
---

Arguments: $ARGUMENTS

IMPORTANT: This command is the ONLY authorization to perform the commit and push workflow.

Only execute `git add`, `git commit`, `git push`, or related Git write operations when I explicitly invoke `/cp`.

Never automatically run `/cp` or continue the commit/push workflow after this command finishes.

## Mode `/cp gt` — commit referencing the current stage issue

If the first argument token is `gt` (i.e. `/cp gt`):

1. Run the full review workflow below (steps 1–8) as usual.
2. Find the current stage issue: `gh issue list --label stage --state open --json number,title,labels --limit 100`, sort by number, take the lowest. That is the stage being implemented — the same definition `/gt next` and `/gt status` use, so the commit reference never points at a different stage than the workflow considers current.
3. If no open `stage` issue exists, STOP: do not commit, and tell me there is no current stage.
4. If that issue does not have the `planned` label, warn me that it is not planned yet (`/gt plan <N>`) and that `/gt next` will refuse to close it until it is planned and every item is checked. This is only a warning — do NOT block the commit because of it.
5. Read that issue (`gh issue view <N> --comments`) and count the unchecked `- [ ]` items across its description and comments. If any are unchecked, print a warning listing them (or the count plus the first few) and a note that `/gt next` will refuse to close the stage until every item is checked. This is only a warning — do NOT block the commit because of it.
6. In the commit subject, append the issue reference at the end: `(#<number>)` — e.g. `Implement Stage 3 camera (#3)`. Keep the Conventional Commit style; the reference is the last token of the subject line.
7. Do not mention or reference any other issue in the subject.

If the first argument token is anything else (or there are no arguments), run the standard workflow below with no issue reference requirement.

## Standard workflow

When `/cp` is explicitly invoked:

1. Read the whole project first — AGENTS.md (project rules, incl. commit conventions), README.md, structure, main modules, tests and recent history — and only then understand the architecture and make decisions; the commit message must reflect what this change actually does in this codebase.
2. Use `git` and `gh` to inspect the repository, branch, remote, and relevant GitHub context.
3. Analyze the project structure, relevant code, configuration, tests, and documentation.
4. Review the complete current diff.
5. Check for secrets, `.env` files, credentials, and files that should be ignored.
6. Run relevant tests and validation checks.
7. If anything is wrong, suspicious, or unclear, STOP. Do not commit or push.
8. If everything is correct, run `git add`, create a concise **English Conventional Commit** message, commit, and push.
9. Never force push or use destructive Git commands.

After `/cp` finishes, return to normal behavior. Do not perform any additional commit, push, or Git write operation unless I explicitly invoke `/cp` again.
