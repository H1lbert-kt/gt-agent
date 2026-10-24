import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(join(root, "README.md"), "utf8");

test("README exists, is non-empty, and starts with the title", () => {
  assert.ok(readme.length > 0);
  assert.ok(readme.startsWith("# gt-agent"));
});

test("headings appear in the required order", () => {
  const headings = [
    "## Concept",
    "## Prerequisites",
    "## Install",
    "## Quick start",
    "## In a company",
    "## Structure",
  ];
  let lastIndex = -1;
  for (const heading of headings) {
    const index = readme.indexOf(heading);
    assert.ok(index > lastIndex, `heading out of order or missing: ${heading}`);
    lastIndex = index;
  }
});

test("required literals are present", () => {
  const literals = [
    "stage",
    "planned",
    "skipped",
    "<!-- gt:plan -->",
    "opencode",
    "gh auth login",
    "~/.config/opencode/",
    "agents/gt.md",
    "commands/gt.md",
    "commands/cp.md",
    "/gt help",
    "/cp gt",
    "In a company",
    "node --test tests/",
  ];
  for (const literal of literals) {
    assert.ok(readme.includes(literal), `missing literal: ${literal}`);
  }
});

test("structure tree still lists the three entries", () => {
  assert.ok(readme.includes("agents/gt.md"));
  assert.ok(readme.includes("commands/gt.md"));
  assert.ok(readme.includes("tests/"));
});

test("stub deferred-install sentence is gone", () => {
  assert.ok(!readme.includes("come in the next stages"));
});
