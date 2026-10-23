# gt-agent

`/gt` is an [opencode](https://opencode.ai) agent that manages a project's stages as GitHub issues: it creates stage issues, plans them, verifies tests, and closes finished stages — it never edits code.

## Structure

```
agents/gt.md      # agent definition (permissions, behavior rules)
commands/gt.md    # /gt command definition (all modes)
tests/            # structural checks (Node built-in test runner)
```

Requires Node.js to run the structural tests (`node --test tests/`). Install and usage docs come in the next stages.
