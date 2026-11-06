<!-- gt:plan v3 -->
## Validation
Test command: node --test tests/
Evidence: the complete format fixture is accepted by the parser.
## Technical decisions
Use semantic sections rather than fixed order. Keep source compatibility for legacy plans.
## Scope
### Included
The parser, documentation, examples, and fixtures.
### Excluded
Changes to publication records or visual rendering.
## Diagnostic evidence
The old parser rejects reordered sections and useful nested headings.
| Concern | Evidence |
| --- | --- |
| Regression | Offline contract tests |
## Objective
Allow a complete plan to state evidence, decisions, boundaries, implementation, validation, and risks without prescribing one heading order.
## Implementation
Update v3 validation and preserve criterion publication behavior for [criterion:complete-format].
## Risks
Overly permissive parsing could accept incomplete plans; add negative fixtures.
## Acceptance criteria
### Parser behavior
- [ ] [criterion:complete-format] Complete plans with reordered sections and useful subsections remain valid.
