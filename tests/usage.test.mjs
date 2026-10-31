import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const usage = readFileSync(join(root, "docs", "usage.md"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");

test("usage.md exists, is non-empty, and starts with the title", () => {
  assert.ok(usage.length > 0);
  assert.ok(usage.startsWith("# Usage reference"));
});

test("headings appear in the required order", () => {
  const headings = [
    "## Labels",
    "## Plan marker",
    "## Stage dependencies",
    "## Read-only modes",
    "## Writing modes",
    "## Mode reference",
  ];
  let lastIndex = -1;
  for (const heading of headings) {
    const index = usage.indexOf(heading);
    assert.ok(index > lastIndex, `heading out of order or missing: ${heading}`);
    lastIndex = index;
  }
});

test("one ### subsection per mode, covering all 16 syntaxes", () => {
  const subsections = [...usage.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
  assert.equal(subsections.length, 16, `expected 16 subsections, got ${subsections.length}`);

  const syntaxLiterals = [
    "/gt help",
    "<repo>",
    "<prompt>",
    "/gt plan",
    "all",
    "<N>",
    "new issue",
    "--dry-run",
    "/gt next",
    "/gt skip",
    "/gt status",
    "/gt verify",
    "/gt replan",
    "/gt impact",
    "/gt handoff",
    "/gt retro",
    "/gt log",
    "/gt close stage",
    "/gt reopen",
    "/gt start",
    "/gt doctor",
  ];
  for (const literal of syntaxLiterals) {
    assert.ok(usage.includes(literal), `missing syntax literal: ${literal}`);
  }
});

test("required literals are present", () => {
  const literals = [
    "stage",
    "planned",
    "skipped",
    "<!-- gt:plan -->",
    "Test command:",
    "addBlockedBy",
  ];
  for (const literal of literals) {
    assert.ok(usage.includes(literal), `missing literal: ${literal}`);
  }
});

test("read-only and writing mode lists are complete", () => {
  const readOnly = usage.slice(
    usage.indexOf("## Read-only modes"),
    usage.indexOf("## Writing modes"),
  );
  for (const name of [
    "help",
    "status",
    "verify",
    "log",
    "start",
    "doctor",
    "impact",
    "handoff",
  ]) {
    assert.ok(readOnly.includes(name), `read-only list missing: ${name}`);
  }

  const writing = usage.slice(
    usage.indexOf("## Writing modes"),
    usage.indexOf("## Mode reference"),
  );
  for (const name of [
    "kickoff",
    "plan",
    "next",
    "skip",
    "close stage",
    "replan",
    "reopen",
    "retro",
  ]) {
    assert.ok(writing.includes(name), `writing list missing: ${name}`);
  }
});

test("README points to docs/usage.md", () => {
  assert.ok(readme.includes("docs/usage.md"));
});
