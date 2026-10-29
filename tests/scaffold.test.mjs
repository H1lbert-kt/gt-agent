import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const agentSrc = readFileSync(join(root, "agents", "gt.md"), "utf8");
const commandSrc = readFileSync(join(root, "commands", "gt.md"), "utf8");

test("source files are non-empty and start with frontmatter", () => {
  assert.ok(agentSrc.length > 0);
  assert.ok(commandSrc.length > 0);
  assert.ok(agentSrc.startsWith("---\n"));
  assert.ok(commandSrc.startsWith("---\n"));
});

test("agent frontmatter keeps safety permissions", () => {
  const frontmatter = agentSrc.split("---\n")[1];
  assert.match(frontmatter, /mode:\s*primary/);
  assert.match(frontmatter, /permission:/);
  assert.match(frontmatter, /edit:\s*deny/);
  assert.match(frontmatter, /"gh issue edit \*--body\*":\s*deny/);
  assert.match(frontmatter, /"git commit\*":\s*deny/);
});

test("command frontmatter wires the agent as subtask", () => {
  const frontmatter = commandSrc.split("---\n")[1];
  assert.match(frontmatter, /agent:\s*gt/);
  assert.match(frontmatter, /subtask:\s*true/);
});

test("command body contains the plan format", () => {
  assert.ok(commandSrc.includes("<!-- gt:plan v2 -->"));
  assert.ok(commandSrc.includes("<!-- gt:plan -->"));
  assert.ok(commandSrc.includes("prefix `<!-- gt:plan`"));
  assert.match(commandSrc, /^Test command:/m);

  const templateStart = commandSrc.indexOf("```\n<!-- gt:plan v2 -->");
  assert.ok(templateStart > -1, "plan template code fence missing");
  const template = commandSrc.slice(
    templateStart,
    commandSrc.indexOf("```", templateStart + 3),
  );

  const headings = [
    "## Goal",
    "## Scope",
    "### Included",
    "### Not included",
    "## Constraints",
    "## Technical approach",
    "## Implementation steps",
    "## Tests",
    "## Acceptance criteria",
    "## Risks and open questions",
  ];
  let lastIndex = -1;
  for (const heading of headings) {
    const index = template.indexOf(heading);
    assert.ok(index > lastIndex, `heading out of order or missing: ${heading}`);
    lastIndex = index;
  }

  const constraints = template.slice(
    template.indexOf("## Constraints"),
    template.indexOf("## Technical approach"),
  );
  assert.ok(
    !constraints.includes("- [ ]"),
    "Constraints placeholder must not be a checkbox (it would block /gt next)",
  );
  assert.match(constraints, /^<constraints /m);
  assert.match(template, /^- \[ \] <verifiable item/m);
});

test("close comments carry evidence and replan gates on a dirty tree", () => {
  assert.ok(commandSrc.includes("Stage complete. Tests passed:"));
  assert.ok(commandSrc.includes("Commits: <subjects|none>"));
  assert.ok(commandSrc.includes("pass: <count|not reported>"));
  assert.ok(commandSrc.includes("`not reported`"));
  assert.ok(commandSrc.includes("git status --porcelain"));
  assert.ok(
    commandSrc.includes(
      "Replanjar mesmo assim? responda sim para confirmar.",
    ),
  );
  assert.ok(
    commandSrc.includes(
      "o plano novo pode ficar desatualizado em relação ao código não commitado",
    ),
  );
});

test("command body defines every mode", () => {
  const modes = [...commandSrc.matchAll(/^## Mode ([A-Z]):/gm)].map(
    (m) => m[1],
  );
  assert.deepEqual(modes, [
    "H",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "L",
    "O",
    "R",
    "S",
    "V",
  ]);
});
