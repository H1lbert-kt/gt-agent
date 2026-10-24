import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cp = readFileSync(join(root, "commands", "cp.md"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");
const safety = readFileSync(join(root, "docs", "safety.md"), "utf8");

test("cp.md exists, is non-empty, and starts with frontmatter", () => {
  assert.ok(cp.length > 0);
  assert.ok(cp.startsWith("---"));
});

test("cp.md frontmatter includes a description line", () => {
  const frontmatter = cp.split("---")[1];
  assert.ok(frontmatter.includes("description:"), "missing description in frontmatter");
});

test("cp.md includes the grounded literals", () => {
  const literals = ["/cp gt", "(#<number>)", "stage", "git push"];
  for (const literal of literals) {
    assert.ok(cp.includes(literal), `missing literal: ${literal}`);
  }
});

test("README points to commands/cp.md", () => {
  assert.ok(readme.includes("commands/cp.md"));
});

test("safety.md boundary updated to ship cp.md", () => {
  assert.ok(safety.includes("commands/cp.md"));
  assert.ok(!safety.includes("does **not** ship"), "retired boundary claim still present");
});
