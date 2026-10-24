import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const example = readFileSync(join(root, "docs", "example.md"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");

test("example.md exists, is non-empty, and starts with the title", () => {
  assert.ok(example.length > 0);
  assert.ok(example.startsWith("# Workflow example"));
});

test("headings appear in the required order", () => {
  const headings = [
    "## Setup",
    "## The basic cycle",
    "## Sample outputs",
    "## Skip, reopen and close stage",
    "## Closing gate",
  ];
  let lastIndex = -1;
  for (const heading of headings) {
    const index = example.indexOf(heading);
    assert.ok(index > lastIndex, `heading out of order or missing: ${heading}`);
    lastIndex = index;
  }
});

test("FLUXO commands occur in order within the basic cycle slice", () => {
  const start = example.indexOf("## The basic cycle");
  const end = example.indexOf("## Sample outputs");
  assert.ok(start > -1 && end > start, "basic cycle slice missing");
  const cycle = example.slice(start, end);

  const commands = [
    "<repo>",
    "<prompt>",
    "/gt plan all --dry-run",
    "/gt plan 1",
    "/gt verify 1",
    "/gt next",
    "/gt retro 1",
    "/gt plan 2",
  ];
  let lastIndex = -1;
  for (const command of commands) {
    const index = cycle.indexOf(command);
    assert.ok(
      index > lastIndex,
      `FLUXO command out of order or missing in cycle: ${command}`,
    );
    lastIndex = index;
  }
});

test("required literals are present", () => {
  const literals = [
    "/gt plan",
    "--dry-run",
    "/gt verify",
    "/gt next",
    "/gt skip",
    "/gt reopen",
    "/gt close stage",
    "/gt retro",
    "/cp gt",
    "<!-- gt:plan -->",
    "Test command:",
    "git status --porcelain",
    "Stage complete.",
  ];
  for (const literal of literals) {
    assert.ok(example.includes(literal), `missing literal: ${literal}`);
  }
});

test("sample outputs section has fenced blocks for the four commands", () => {
  const start = example.indexOf("## Sample outputs");
  const end = example.indexOf("## Skip,");
  assert.ok(start > -1 && end > start, "sample outputs slice missing");
  const samples = example.slice(start, end);

  const fencedBlocks = samples.match(/```/g);
  assert.ok(
    fencedBlocks && fencedBlocks.length >= 8,
    `expected at least 4 fenced blocks (8 fences), got ${fencedBlocks ? fencedBlocks.length : 0}`,
  );

  for (const name of ["### plan", "### status", "### verify", "### next"]) {
    assert.ok(samples.includes(name), `missing sample subsection: ${name}`);
  }
  assert.ok(samples.includes("Criteria"), "missing Mode F column literal Criteria");
  assert.ok(samples.includes("Próximo"), "missing next-action literal Próximo");
});

test("skip scenario quotes the confirmation question", () => {
  assert.ok(example.includes("sim para confirmar"));
});

test("README points to docs/example.md", () => {
  assert.ok(readme.includes("docs/example.md"));
});
