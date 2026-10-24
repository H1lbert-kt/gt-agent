import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const faq = readFileSync(join(root, "docs", "faq.md"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");
const usage = readFileSync(join(root, "docs", "usage.md"), "utf8");
const example = readFileSync(join(root, "docs", "example.md"), "utf8");
const safety = readFileSync(join(root, "docs", "safety.md"), "utf8");

test("faq.md exists, is non-empty, and starts with the title", () => {
  assert.ok(faq.length > 0);
  assert.ok(faq.startsWith("# Troubleshooting FAQ"));
});

test("headings appear in the required order", () => {
  const headings = [
    "## Setup refusals",
    "## /gt next refuses",
    "## /gt close stage and /gt verify",
    "## Keeping the docs in sync",
  ];
  let lastIndex = -1;
  for (const heading of headings) {
    const index = faq.indexOf(heading);
    assert.ok(index > lastIndex, `heading out of order or missing: ${heading}`);
    lastIndex = index;
  }
});

test("Mode B refusal literals are present", () => {
  const literals = [
    "Etapa <N> ainda não planejada — rode /gt plan <N>.",
    "git status --porcelain",
    "/cp gt",
    "Test command:",
    "(#<N>)",
  ];
  for (const literal of literals) {
    assert.ok(faq.includes(literal), `missing Mode B literal: ${literal}`);
  }
});

test("Mode E and Mode V literals are present", () => {
  assert.ok(faq.includes("Stage complete. Tests passed:"));
  assert.ok(faq.includes("stage` label"), "missing stage-label refusal literal");
  assert.ok(faq.includes("dry-run"), "missing dry-run claim for verify");
});

test("setup-refusal literals are present", () => {
  const literals = ["git remote get-url origin", "owner/repo", "gh auth login"];
  for (const literal of literals) {
    assert.ok(faq.includes(literal), `missing setup literal: ${literal}`);
  }
});

test("doc-drift note literals are present", () => {
  const literals = ["agents/gt.md", "commands/gt.md", "byte-copies"];
  for (const literal of literals) {
    assert.ok(faq.includes(literal), `missing drift-note literal: ${literal}`);
  }
});

test("cross-link matrix is complete", () => {
  assert.ok(readme.includes("docs/faq.md"), "README must link docs/faq.md");
  for (const target of ["usage.md", "example.md", "safety.md"]) {
    assert.ok(faq.includes(target), `faq.md must link ${target}`);
  }
  for (const target of ["example.md", "safety.md", "faq.md"]) {
    assert.ok(usage.includes(target), `usage.md must link ${target}`);
  }
  for (const target of ["safety.md", "faq.md"]) {
    assert.ok(example.includes(target), `example.md must link ${target}`);
  }
  for (const target of ["usage.md", "example.md", "faq.md"]) {
    assert.ok(safety.includes(target), `safety.md must link ${target}`);
  }
});
