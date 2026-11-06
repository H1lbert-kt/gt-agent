<!-- gt:plan v3 -->
**Summary:** Clarify the parser's behavior; scope: parser and focused tests; revision: candidate (not yet published).

---

## Objective
Accept the documented concise format without changing legacy plan behavior.

## Scope
Included: the v3 parser and its fixtures. Excluded: publication semantics.

## Steps
1. Update the parser — deliverable: focused behavior and regression tests.
2. Validate — deliverable: passing offline suite.

## Validation
Test command: node --test tests/
The focused fixture demonstrates the accepted format.

## Acceptance criteria
- [ ] [criterion:concise-format] The parser accepts the format and regression tests cover it.

<details>
<summary>Supplementary context</summary>

See the [project overview](https://github.com/H1lbert-kt/gt-agent#readme) for repository context.
</details>
