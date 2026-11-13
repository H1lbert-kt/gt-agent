# Project discovery and methodology fit

Use for project kickoff, first GT use in a repository, or explicit workflow assessment. Read-only unless the owner separately authorizes a write.

## Understand before recommending

Inspect proportionally: repository instructions and README; source/layout, tests and CI; recent changes and working-tree state; existing plans, GitHub issues/labels/boards, PR and release conventions where accessible. Reuse reliable findings during related requests and refresh mutable state before writes. Do not assume GitHub is the source of truth when the project uses another tracker. Never expose secret values during discovery.

Summarize observed practice separately from unknowns and inference across:
- planning and work tracking;
- implementation structure, tests, and ownership;
- branching, review, CI, release, and completion.

Compare the existing method with the proposed GT practice using project size, risk, traceability, coordination cost, and observed pain points. Recommend **preserve**, **complement**, **adapt**, or **migrate**, with evidence, trade-offs, and a small pilot where uncertainty is material. Do not prescribe GT merely because it is available. No automatic migration, issue edits, labels, or relationship changes.

## `grillme` decision discovery

Use the local `../grillme/SKILL.md` when owner decisions need elicitation. Ask about decisions repository evidence cannot answer; do not use an interview as a substitute for discovery. Interview answers do not authorize writes or implementation.
