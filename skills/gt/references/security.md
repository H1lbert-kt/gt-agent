# Secret and sensitive-file safety

Apply before reviewing changes, staging, committing, pushing, or creating a PR. This supplements—not replaces—project security policy and CI.

- Do not open or print `.env` contents, credential files, private keys, tokens, or secret stores by default. Inspect path names, Git tracking/status, ignore rules, and diffs without disclosing values. Ask before any action that requires reading secret values.
- Treat `.env`, `.env.*`, credentials, private keys, and generated secret-bearing files as sensitive. `.env.example` is allowed only when it contains placeholders, never live credentials.
- Check staged and outgoing content, including renamed/deleted paths and commit history being published. Ignore rules do not protect already tracked files.
- Use an available configured secret scanner (for example, Gitleaks) when project instructions identify a validated command. Do not download/install tools, upload code, or run an unverified command without authorization. Report scanner absence as a validation gap; do not claim clean.
- On a suspected secret, stop before the write, avoid quoting the value, identify only the affected path/type, and ask the owner to rotate/revoke it if it may have been exposed. Removing it from the current diff does not erase Git history.
- Never bypass hooks or required security checks. A failed, unavailable, or inconclusive required check blocks the dependent commit/publish/PR action.
