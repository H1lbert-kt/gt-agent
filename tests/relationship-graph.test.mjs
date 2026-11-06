import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRelationshipGraph } from "../skills/gt/lib/relationship-graph.mjs";

const fixture = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "relationship-graph", "basic.json"), "utf8"));
const diagnosticCodes = (result) => result.diagnostics.map(({ code }) => code);

test("separates parent grouping from native blockers and contextual references", () => {
  const result = analyzeRelationshipGraph(fixture);
  assert.deepEqual(result.hierarchyEdges, [[1, 2]]);
  assert.deepEqual(result.dependencyEdges, [[1, 3]]);
  assert.equal(result.issues.find(({ number }) => number === 2).blockerState, "unblocked");
  assert.equal(result.issues.find(({ number }) => number === 2).readiness, "not-evaluated");
  assert.deepEqual(result.diagnostics, []);
});

test("does not infer dependencies from issue ordering or unrelated contextual mentions", () => {
  const result = analyzeRelationshipGraph({
    completeness: { issues: true, hierarchy: true, dependencies: true },
    issues: [
      { number: 4, state: "OPEN", parentNumber: null, children: [], blockedBy: [], blocking: [], mentions: [3] },
      { number: 3, state: "OPEN", parentNumber: null, children: [], blockedBy: [], blocking: [] },
    ],
  });
  assert.deepEqual(result.dependencyEdges, []);
  assert.equal(result.issues.find(({ number }) => number === 4).blockerState, "unblocked");
});

test("reports verified open blockers while preserving unknown for incomplete snapshots", () => {
  const complete = analyzeRelationshipGraph({
    completeness: { issues: true, hierarchy: true, dependencies: true },
    issues: [
      { number: 1, state: "OPEN", parentNumber: null, children: [], blockedBy: [], blocking: [2] },
      { number: 2, state: "OPEN", parentNumber: null, children: [], blockedBy: [1], blocking: [] },
    ],
  });
  assert.equal(complete.issues.find(({ number }) => number === 2).blockerState, "blocked");
  assert.deepEqual(complete.issues.find(({ number }) => number === 2).openBlockers, [1]);

  const partial = analyzeRelationshipGraph({
    completeness: { issues: true, hierarchy: false, dependencies: false },
    issues: [{ number: 1, state: "OPEN", parentNumber: null, children: null, blockedBy: null, blocking: null }],
  });
  assert.equal(partial.issues[0].blockerState, "unknown");
  assert.equal(partial.completeness.dependencies, "unknown");
});

test("reports closed blockers as non-blocking but does not infer readiness", () => {
  const result = analyzeRelationshipGraph({
    completeness: { issues: true, hierarchy: true, dependencies: true },
    issues: [
      { number: 1, state: "OPEN", parentNumber: null, children: [], blockedBy: [2], blocking: [] },
      { number: 2, state: "CLOSED", parentNumber: null, children: [], blockedBy: [], blocking: [1] },
    ],
  });
  assert.equal(result.issues.find(({ number }) => number === 1).blockerState, "unblocked");
  assert.equal(result.issues.find(({ number }) => number === 1).readiness, "not-evaluated");
});

test("detects self-edges, hierarchy conflicts, and cycles in each native graph", () => {
  const result = analyzeRelationshipGraph({
    completeness: { issues: true, hierarchy: true, dependencies: true },
    issues: [
      { number: 1, state: "OPEN", parentNumber: 2, children: [2, 1], blockedBy: [2], blocking: [2] },
      { number: 2, state: "OPEN", parentNumber: 1, children: [1], blockedBy: [1], blocking: [1] },
    ],
  });
  assert.ok(diagnosticCodes(result).includes("RELATION_SELF_EDGE"));
  assert.ok(diagnosticCodes(result).includes("HIERARCHY_CONFLICT"));
  assert.equal(result.diagnostics.filter(({ code, relation }) => code === "RELATION_CYCLE" && relation === "parent-child").length, 1);
  assert.equal(result.diagnostics.filter(({ code, relation }) => code === "RELATION_CYCLE" && relation === "blocking").length, 1);
});

test("reports missing targets only when inventory completeness makes absence knowable", () => {
  const complete = analyzeRelationshipGraph({
    completeness: { issues: true, hierarchy: true, dependencies: true },
    issues: [{ number: 1, state: "OPEN", parentNumber: null, children: [], blockedBy: [9], blocking: [] }],
  });
  assert.ok(diagnosticCodes(complete).includes("RELATION_TARGET_MISSING"));

  const partial = analyzeRelationshipGraph({
    completeness: { issues: false, hierarchy: false, dependencies: false },
    issues: [{ number: 1, state: "OPEN", parentNumber: null, children: [], blockedBy: [9], blocking: [] }],
  });
  assert.ok(diagnosticCodes(partial).includes("RELATION_TARGET_UNKNOWN"));
  assert.ok(!diagnosticCodes(partial).includes("RELATION_TARGET_MISSING"));
});

test("detects disagreement between parent/sub-issue and blockedBy/blocking views", () => {
  const result = analyzeRelationshipGraph({
    completeness: { issues: true, hierarchy: true, dependencies: true },
    issues: [
      { number: 1, state: "OPEN", parentNumber: null, children: [2], blockedBy: [], blocking: [2] },
      { number: 2, state: "OPEN", parentNumber: null, children: [], blockedBy: [], blocking: [] },
    ],
  });
  assert.ok(diagnosticCodes(result).includes("HIERARCHY_CONFLICT"));
  assert.ok(diagnosticCodes(result).includes("DEPENDENCY_VIEW_CONFLICT"));
});

test("rejects malformed or ambiguous snapshots instead of guessing", () => {
  assert.throws(() => analyzeRelationshipGraph({ issues: [] }), /must declare completeness/);
  assert.throws(() => analyzeRelationshipGraph({
    completeness: { issues: true, hierarchy: true, dependencies: true },
    issues: [
      { number: 1, state: "OPEN" },
      { number: 1, state: "CLOSED" },
    ],
  }), /Duplicate issue number/);
});
