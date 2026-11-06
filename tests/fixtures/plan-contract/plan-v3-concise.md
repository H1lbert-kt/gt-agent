<!-- gt:plan v3 -->
## Objective
Validate a small, low-risk change without a fixed long-form template.
## Boundaries
Only the local parser and its fixtures.
## Steps
Update the parser, then run the relevant test suite.
## Validation
Test command: node --test tests/
## Acceptance criteria
- [ ] [criterion:concise-parser] The concise plan is valid and its criterion is active.
