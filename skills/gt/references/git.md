# Local Git and publishing

Apply `security.md` and the GitHub repository guard in `shared.md` where applicable. Commit and push are separate authorizations; neither implies PR approval, merge, or issue closure.

- Before commit: inspect branch, full status and complete diff; identify pre-existing user work; validate relevant tests; stage explicit in-scope paths only; inspect the entire staged diff. Never use `git add .`/`-A`, amend, bypass hooks, or include unclear staged work.
- Before push: require a clean tree; inspect upstream, destination, outgoing commits and full outgoing diff; validate secrets and checks. Never change remotes/upstream or force-push automatically. Stop on ambiguous destination or rejected push; do not rebase, merge, or retry automatically.
- Report exact validated scope, test/scanner evidence and limitations. No Git write is authorized merely by discussing a plan or PR.
