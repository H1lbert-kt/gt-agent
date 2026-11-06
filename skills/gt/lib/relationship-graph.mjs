const isIssueNumber = (value) => Number.isSafeInteger(value) && value > 0;

function addDiagnostic(diagnostics, seen, diagnostic) {
  const key = JSON.stringify(diagnostic);
  if (!seen.has(key)) {
    seen.add(key);
    diagnostics.push(diagnostic);
  }
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.issues)) {
    throw new TypeError("Snapshot must contain an issues array");
  }
  if (!snapshot.completeness || typeof snapshot.completeness !== "object") {
    throw new TypeError("Snapshot must declare completeness");
  }
  for (const field of ["issues", "hierarchy", "dependencies"]) {
    if (typeof snapshot.completeness[field] !== "boolean") {
      throw new TypeError(`Snapshot completeness.${field} must be a boolean`);
    }
  }

  const issues = new Map();
  for (const source of snapshot.issues) {
    const state = typeof source?.state === "string" ? source.state.toUpperCase() : source?.state;
    if (!source || !isIssueNumber(source.number) || !["OPEN", "CLOSED"].includes(state)) {
      throw new TypeError("Each issue must have a positive number and open/closed state");
    }
    const issue = { ...source, state };
    if (issues.has(issue.number)) throw new TypeError(`Duplicate issue number ${issue.number}`);
    for (const field of ["parentNumber", "children", "blockedBy", "blocking"]) {
      const value = issue[field];
      if (field === "parentNumber") {
        if (value !== undefined && value !== null && !isIssueNumber(value)) {
          throw new TypeError(`Issue ${issue.number} has invalid parentNumber`);
        }
      } else if (value !== undefined && value !== null &&
          (!Array.isArray(value) || value.some((number) => !isIssueNumber(number)))) {
        throw new TypeError(`Issue ${issue.number} has invalid ${field}`);
      }
    }
    issues.set(issue.number, issue);
  }
  return issues;
}

function findCycles(nodes, edges) {
  const adjacency = new Map([...nodes.keys()].map((number) => [number, []]));
  for (const [from, to] of edges) {
    if (adjacency.has(from) && adjacency.has(to)) adjacency.get(from).push(to);
  }
  const state = new Map();
  const stack = [];
  const cycles = [];
  const known = new Set();

  function visit(number) {
    state.set(number, 1);
    stack.push(number);
    for (const target of adjacency.get(number)) {
      if (!state.has(target)) visit(target);
      else if (state.get(target) === 1) {
        const cycle = stack.slice(stack.indexOf(target)).concat(target);
        const canonical = cycle.slice(0, -1);
        const rotations = canonical.map((_, index) => canonical.slice(index).concat(canonical.slice(0, index)));
        const key = rotations.map((rotation) => rotation.join(",")).sort()[0];
        if (!known.has(key)) {
          known.add(key);
          cycles.push(cycle);
        }
      }
    }
    stack.pop();
    state.set(number, 2);
  }

  for (const number of nodes.keys()) if (!state.has(number)) visit(number);
  return cycles;
}

/**
 * Analyze an inert snapshot of GitHub issue relationships.
 *
 * Each issue uses GitHub numbering and state (OPEN/CLOSED). `parentNumber` is
 * the issue's reported parent; `children` is a parent's reported sub-issue
 * list; `blockedBy` and `blocking` are the corresponding native dependency
 * views. Omit or set a relation field to null when it was not fetched.
 * Completeness flags state whether the issue inventory and each relation
 * family were fetched completely; incomplete snapshots never imply clear.
 */
export function analyzeRelationshipGraph(snapshot) {
  const issues = validateSnapshot(snapshot);
  const diagnostics = [];
  const seen = new Set();
  const hierarchyEdges = new Set();
  const dependencyEdges = new Set();
  const parentClaims = new Map();
  const blockerSets = new Map();

  const report = (diagnostic) => addDiagnostic(diagnostics, seen, diagnostic);
  const targetState = (number, relation, from) => {
    if (issues.has(number)) return issues.get(number).state;
    report({
      code: snapshot.completeness.issues ? "RELATION_TARGET_MISSING" : "RELATION_TARGET_UNKNOWN",
      severity: snapshot.completeness.issues ? "error" : "warning",
      relation,
      from,
      to: number,
    });
    return null;
  };

  for (const issue of issues.values()) {
    for (const child of issue.children ?? []) {
      if (child === issue.number) {
        report({ code: "RELATION_SELF_EDGE", severity: "error", relation: "parent-child", from: issue.number, to: child });
        continue;
      }
      targetState(child, "parent-child", issue.number);
      hierarchyEdges.add(`${issue.number}:${child}`);
      const claims = parentClaims.get(child) ?? new Set();
      claims.add(issue.number);
      parentClaims.set(child, claims);
    }

    if (issue.parentNumber != null) {
      if (issue.parentNumber === issue.number) {
        report({ code: "RELATION_SELF_EDGE", severity: "error", relation: "parent-child", from: issue.number, to: issue.parentNumber });
      } else {
        targetState(issue.parentNumber, "parent-child", issue.number);
        hierarchyEdges.add(`${issue.parentNumber}:${issue.number}`);
        const claims = parentClaims.get(issue.number) ?? new Set();
        claims.add(issue.parentNumber);
        parentClaims.set(issue.number, claims);
      }
    }

    for (const blocker of issue.blockedBy ?? []) {
      if (blocker === issue.number) {
        report({ code: "RELATION_SELF_EDGE", severity: "error", relation: "blocking", from: blocker, to: issue.number });
        continue;
      }
      targetState(blocker, "blocking", issue.number);
      dependencyEdges.add(`${blocker}:${issue.number}`);
      const blockers = blockerSets.get(issue.number) ?? new Set();
      blockers.add(blocker);
      blockerSets.set(issue.number, blockers);
    }

    for (const blocked of issue.blocking ?? []) {
      if (blocked === issue.number) {
        report({ code: "RELATION_SELF_EDGE", severity: "error", relation: "blocking", from: issue.number, to: blocked });
        continue;
      }
      targetState(blocked, "blocking", issue.number);
      dependencyEdges.add(`${issue.number}:${blocked}`);
      const blockers = blockerSets.get(blocked) ?? new Set();
      blockers.add(issue.number);
      blockerSets.set(blocked, blockers);
    }
  }

  for (const [child, parents] of parentClaims) {
    if (parents.size > 1) {
      report({ code: "HIERARCHY_CONFLICT", severity: "error", relation: "parent-child", issue: child, parents: [...parents].sort((a, b) => a - b) });
    }
  }

  if (snapshot.completeness.hierarchy) {
    for (const issue of issues.values()) {
      if (issue.parentNumber != null && Array.isArray(issues.get(issue.parentNumber)?.children) &&
          !issues.get(issue.parentNumber).children.includes(issue.number)) {
        report({ code: "HIERARCHY_CONFLICT", severity: "error", relation: "parent-child", issue: issue.number, parent: issue.parentNumber, reason: "parent-child views disagree" });
      }
      for (const child of issue.children ?? []) {
        if (issues.has(child) && issues.get(child).parentNumber !== issue.number) {
          report({ code: "HIERARCHY_CONFLICT", severity: "error", relation: "parent-child", issue: child, parent: issue.number, reason: "parent-child views disagree" });
        }
      }
    }
  }

  if (snapshot.completeness.dependencies) {
    for (const issue of issues.values()) {
      for (const blocker of issue.blockedBy ?? []) {
        if (issues.has(blocker) && Array.isArray(issues.get(blocker).blocking) && !issues.get(blocker).blocking.includes(issue.number)) {
          report({ code: "DEPENDENCY_VIEW_CONFLICT", severity: "error", relation: "blocking", issue: issue.number, blocker, reason: "blockedBy/blocking views disagree" });
        }
      }
      for (const blocked of issue.blocking ?? []) {
        if (issues.has(blocked) && Array.isArray(issues.get(blocked).blockedBy) && !issues.get(blocked).blockedBy.includes(issue.number)) {
          report({ code: "DEPENDENCY_VIEW_CONFLICT", severity: "error", relation: "blocking", issue: issue.number, blocked, reason: "blocking/blockedBy views disagree" });
        }
      }
    }
  }

  const hierarchyComplete = snapshot.completeness.issues && snapshot.completeness.hierarchy &&
    [...issues.values()].every((issue) => issue.parentNumber !== undefined && Array.isArray(issue.children));
  const dependenciesComplete = snapshot.completeness.issues && snapshot.completeness.dependencies &&
    [...issues.values()].every((issue) => Array.isArray(issue.blockedBy) && Array.isArray(issue.blocking));
  if (hierarchyComplete) {
    for (const cycle of findCycles(issues, [...hierarchyEdges].map((edge) => edge.split(":").map(Number)))) {
      report({ code: "RELATION_CYCLE", severity: "error", relation: "parent-child", cycle });
    }
  }
  if (dependenciesComplete) {
    for (const cycle of findCycles(issues, [...dependencyEdges].map((edge) => edge.split(":").map(Number)))) {
      report({ code: "RELATION_CYCLE", severity: "error", relation: "blocking", cycle });
    }
  }

  const issueStates = [...issues.values()].map((issue) => {
    const blockers = [...(blockerSets.get(issue.number) ?? [])];
    const openBlockers = blockers.filter((number) => issues.get(number)?.state === "OPEN");
    let blockerState = "unknown";
    if (openBlockers.length > 0) blockerState = "blocked";
    else if (dependenciesComplete && blockers.every((number) => issues.get(number)?.state === "CLOSED")) blockerState = "unblocked";
    return {
      number: issue.number,
      blockerState,
      blockers: blockers.sort((a, b) => a - b),
      openBlockers: openBlockers.sort((a, b) => a - b),
      readiness: blockerState === "blocked" ? "blocked" : "not-evaluated",
    };
  }).sort((a, b) => a.number - b.number);

  return {
    completeness: {
      issues: snapshot.completeness.issues,
      hierarchy: hierarchyComplete ? "complete" : "unknown",
      dependencies: dependenciesComplete ? "complete" : "unknown",
    },
    hierarchyEdges: [...hierarchyEdges].map((edge) => edge.split(":").map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    dependencyEdges: [...dependencyEdges].map((edge) => edge.split(":").map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    issues: issueStates,
    diagnostics,
  };
}
