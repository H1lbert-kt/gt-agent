# Pull request workflow

Use the repository's existing contribution process when available. Opening/updating a PR is a GitHub write and requires an explicit request; pushing alone does not authorize it. Apply `shared.md`, `security.md`, and `git.md` as relevant.

Before opening: verify repository identity/auth, branch and base, clean tree, outgoing commits/diff, secret checks, and required tests. Do not change branch protections, reviewers, or CI policy. PR content should state purpose, scope, linked issue/task(s), tests/checks and known risks without secrets. Re-read the created PR and verify its base/head and content.

PR creation does not imply approval, merge, or task closure. Do not self-approve or merge unless separately and explicitly requested and project policy permits it. Require applicable CI and human approvals; treat pending/unknown checks as not passing. After merge, verify merged state and target branch before any separately authorized issue/task completion. A rejected or partially created PR must be reported with confirmed state; do not retry blindly.
