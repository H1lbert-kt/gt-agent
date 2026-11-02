<!-- gt:plan v2 -->
<!-- gt:acceptance-required v1 -->
## Goal

Validate the current plan shape.

## Scope
### Included

Parse and validate structured plans.

### Not included

No network access.

## Constraints

Use Node built-ins only.

## Technical approach

Use pure functions and explicit snapshots.

## Implementation steps

1. Parse the snapshot.

## Tests

Test command: node --test tests/

## Acceptance criteria

- [ ] The v2 plan is structurally valid.

## Risks and open questions

The helper cannot prove live API behavior.
