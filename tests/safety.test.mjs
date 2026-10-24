import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const safety = readFileSync(join(root, "docs", "safety.md"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");

test("safety.md exists, is non-empty, and starts with the title", () => {
  assert.ok(safety.length > 0);
  assert.ok(safety.startsWith("# Permissions and safety model"));
});

test("headings appear in the required order", () => {
  const headings = [
    "## Permission table",
    "## Repo guard",
    "## Invariants",
    "## Commits and /cp",
  ];
  let lastIndex = -1;
  for (const heading of headings) {
    const index = safety.indexOf(heading);
    assert.ok(index > lastIndex, `heading out of order or missing: ${heading}`);
    lastIndex = index;
  }
});

test("permission-table literals are present", () => {
  const literals = [
    "edit: deny",
    "gh issue edit *--body*",
    "git commit",
    "git push",
    "gh issue delete",
    "node --test",
  ];
  for (const literal of literals) {
    assert.ok(safety.includes(literal), `missing permission literal: ${literal}`);
  }
});

test("repo-guard literals are present", () => {
  const literals = ["git remote get-url origin", "owner/repo", "-R"];
  for (const literal of literals) {
    assert.ok(safety.includes(literal), `missing repo-guard literal: ${literal}`);
  }
});

test("invariant literals are present", () => {
  const literals = [
    "<!-- gt:plan -->",
    "addBlockedBy",
    "Blocked by",
    "stage",
    "git status --porcelain",
  ];
  for (const literal of literals) {
    assert.ok(safety.includes(literal), `missing invariant literal: ${literal}`);
  }
});

test("/cp literals are present", () => {
  assert.ok(safety.includes("/cp gt"));
  assert.ok(safety.includes("(#<number>)"));
});

test("README points to docs/safety.md", () => {
  assert.ok(readme.includes("docs/safety.md"));
});
