import { createHash } from "node:crypto";

const PLAN_V1 = "<!-- gt:plan -->";
const PLAN_V2 = "<!-- gt:plan v2 -->";
const PLAN_V3 = "<!-- gt:plan v3 -->";
const ACCEPTANCE_REQUIRED = "<!-- gt:acceptance-required v1 -->";
const ACCEPTED = "<!-- gt:plan-accepted v1 -->";
const PUBLISHED_V2 = "<!-- gt:plan-published v2 -->";
const RECEIPT_SCHEMA = "gt-plan-acceptance/v1";
const PUBLICATION_SCHEMA = "gt-plan-publication/v2";
const V1_HEADINGS = [
  "## Goal",
  "## Scope",
  "### Included",
  "### Not included",
  "## Technical approach",
  "## Implementation steps",
  "## Tests",
  "## Acceptance criteria",
  "## Risks and open questions",
];
const V2_HEADINGS = [
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
const V3_SEMANTIC_HEADINGS = {
  goal: new Set(["goal", "objective", "purpose", "desired outcome"]),
  scope: new Set(["scope", "boundaries", "included and excluded"]),
  implementation: new Set(["implementation", "implementation steps", "execution plan", "steps"]),
  validation: new Set(["tests", "validation", "verification"]),
  acceptance: new Set(["acceptance criteria"]),
};
const TASK_RE = /^(\s*[-*]\s+)\[([ xX])\]([ \t]+.*)?$/;
const CRITERION_RE = /^\s*[-*]\s+\[([ xX])\]\s+\[criterion:([a-z0-9][a-z0-9._-]{0,63})\]\s+(.+?)\s*$/i;

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function fenceMarker(line) {
  const match = line.match(/^( {0,3})(`{3,}|~{3,})(.*)$/);
  if (!match) return null;
  if (match[2][0] === "`" && match[3].includes("`")) return null;
  return { character: match[2][0], length: match[2].length, trailing: match[3] };
}

function closesFence(marker, character, length) {
  return marker && marker.character === character && marker.length >= length && /^\s*$/.test(marker.trailing);
}

function walkLines(text, visitor) {
  let fenced = false;
  let fenceCharacter;
  let fenceLength = 0;

  text.replace(/\r\n/g, "\n").split("\n").forEach((line, index) => {
    const marker = fenceMarker(line);
    if (marker) {
      if (!fenced) {
        fenced = true;
        fenceCharacter = marker.character;
        fenceLength = marker.length;
      } else if (closesFence(marker, fenceCharacter, fenceLength)) {
        fenced = false;
        fenceCharacter = undefined;
        fenceLength = 0;
      }
      visitor({ line, lineNumber: index + 1, fenced: true, fence: true });
      return;
    }
    visitor({ line, lineNumber: index + 1, fenced, fence: false });
  });
}

/** Canonical plan text: LF newlines and only real task-list states normalized. */
export function canonicalizePlanText(text) {
  if (typeof text !== "string") throw new TypeError("Plan text must be a string");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let fenced = false;
  let fenceCharacter;
  let fenceLength = 0;

  const canonical = lines.map((line) => {
    const marker = fenceMarker(line);
    if (marker) {
      if (!fenced) {
        fenced = true;
        fenceCharacter = marker.character;
        fenceLength = marker.length;
      } else if (closesFence(marker, fenceCharacter, fenceLength)) {
        fenced = false;
        fenceCharacter = undefined;
        fenceLength = 0;
      }
      return line;
    }
    if (fenced) return line;
    const task = line.match(TASK_RE);
    return task ? `${task[1]}[ ]${task[3] ?? ""}` : line;
  });

  return canonical.join("\n");
}

/** SHA-256 of canonical UTF-8 plan text. */
export function digestText(text) {
  return sha256(canonicalizePlanText(text));
}

function usefulContent(text) {
  const value = text.trim();
  return value.length > 0 && !/^<[^>]+>$/.test(value) && !/^(?:TODO|TBD|N\/A)$/i.test(value);
}

function sectionsOf(text) {
  const headings = [];
  walkLines(text, ({ line, lineNumber, fenced }) => {
    if (!fenced && /^(?:#{1,6})\s+\S/.test(line)) {
      headings.push({ heading: line, lineNumber });
    }
  });
  return headings;
}

function contentForHeading(text, headings, index) {
  const current = headings[index];
  const level = current.heading.match(/^#+/)[0].length;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let end = lines.length;
  for (let i = index + 1; i < headings.length; i += 1) {
    const nextLevel = headings[i].heading.match(/^#+/)[0].length;
    if (nextLevel <= level) {
      end = headings[i].lineNumber - 1;
      break;
    }
  }
  return lines.slice(current.lineNumber, end).filter((line) => !/^#{1,6}\s+/.test(line)).join("\n").trim();
}

function parseReceiptBody(body) {
  const lines = body.split(/\r?\n/);
  if (lines[0] !== ACCEPTED) return { error: "Receipt marker must be exact and on the first line" };
  if (!/^```json\s*$/.test(lines[1] ?? "")) return { error: "Receipt must contain a fenced JSON object on line 2" };
  const end = lines.lastIndexOf("```");
  if (end <= 2 || lines.slice(end + 1).some((line) => line.trim() !== "")) {
    return { error: "Receipt JSON fence is missing or has trailing content" };
  }
  try {
    const value = JSON.parse(lines.slice(2, end).join("\n"));
    return value && typeof value === "object" && !Array.isArray(value)
      ? { value }
      : { error: "Receipt JSON must be an object" };
  } catch {
    return { error: "Receipt JSON is invalid" };
  }
}

function parsePublicationBody(body) {
  const lines = body.split(/\r?\n/);
  if (lines[0] !== PUBLISHED_V2 || !/^```json\s*$/.test(lines[1] ?? "")) {
    return { error: "Publication record marker or JSON fence is invalid" };
  }
  const end = lines.lastIndexOf("```");
  if (end <= 2 || lines.slice(end + 1).some((line) => line.trim() !== "")) {
    return { error: "Publication record JSON fence is missing or has trailing content" };
  }
  try {
    const value = JSON.parse(lines.slice(2, end).join("\n"));
    return value && typeof value === "object" && !Array.isArray(value)
      ? { value }
      : { error: "Publication record JSON must be an object" };
  } catch {
    return { error: "Publication record JSON is invalid" };
  }
}

function extractDeclaredCriteria(plan) {
  const lines = plan.body.replace(/\r\n/g, "\n").split("\n");
  const headings = sectionsOf(plan.body);
  const index = headings.findIndex(({ heading }) => heading === "## Acceptance criteria");
  if (index < 0) return [];
  const content = contentForHeading(plan.body, headings, index);
  const criteria = [];
  walkLines(content, ({ line, fenced }) => {
    if (fenced || !line.trim()) return;
    const match = line.match(CRITERION_RE);
    if (!match) return;
    const id = match[2].toLowerCase();
    const text = match[3].trim();
    criteria.push({
      id,
      text,
      checked: match[1].toLowerCase() === "x",
      digestSha256: sha256(text),
      line: lines.findIndex((candidate) => candidate === line) + 1,
    });
  });
  return criteria;
}

function validatePublicationRecord(record, comment, issue, byId) {
  const errors = [];
  if (record.schema !== PUBLICATION_SCHEMA) errors.push("Unknown publication schema");
  if (record.issueNumber !== issue.number) errors.push("Publication issue number mismatch");
  if (typeof record.planCommentId !== "string" || typeof record.planUrl !== "string"
    || typeof record.planDigestSha256 !== "string" || !/^[a-f0-9]{64}$/.test(record.planDigestSha256)) {
    errors.push("Publication must identify the plan comment and its SHA-256 digest");
  }
  if (!(record.previousPublicationCommentId === null || typeof record.previousPublicationCommentId === "string")) {
    errors.push("Invalid previous publication reference");
  }
  const plan = byId.get(record.planCommentId);
  if (!plan || plan.url !== record.planUrl || !asIssueCommentUrl(plan.url, issue.number)) {
    errors.push("Referenced plan comment ID/URL does not match this issue");
  } else {
    const parsed = parsePlanComment(plan);
    if (!parsed.valid || parsed.version !== 3 || !parsed.requiresPublication) {
      errors.push("Publication must reference a valid v3 plan");
    }
    if (record.planDigestSha256 !== digestText(plan.body)) errors.push("Plan digest mismatch");
  }
  if (!comment.createdAt || !sameIssueUrl(comment.url, plan?.url, issue.number)) {
    errors.push("Publication and plan URLs must identify comments on the same issue");
  }
  if (plan?.createdAt && comment.createdAt && plan.createdAt > comment.createdAt) {
    errors.push("Published plan was created after its publication record");
  }
  if (!Array.isArray(record.criteria) || !Array.isArray(record.transitions)) {
    errors.push("Publication criteria and transitions must be arrays");
  }
  const declared = plan ? extractDeclaredCriteria(plan) : [];
  if (Array.isArray(record.criteria)) {
    const ids = new Set();
    for (const item of record.criteria) {
      if (!item || typeof item.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(item.id)
        || typeof item.text !== "string" || !item.text.trim()
        || typeof item.digestSha256 !== "string" || !/^[a-f0-9]{64}$/.test(item.digestSha256)) {
        errors.push("Invalid published criterion record");
        continue;
      }
      if (ids.has(item.id.toLowerCase())) errors.push(`Duplicate published criterion ID: ${item.id}`);
      ids.add(item.id.toLowerCase());
      const source = declared.find((criterion) => criterion.id === item.id.toLowerCase());
      if (!source || source.text !== item.text || source.digestSha256 !== item.digestSha256) {
        errors.push(`Published criterion does not match the exact plan content: ${item.id}`);
      }
    }
    if (declared.length !== record.criteria.length) errors.push("Publication criterion inventory is incomplete");
  }
  if (!byId.has(comment.id)) errors.push("Publication record is not in this issue snapshot");
  return errors;
}

function validateLegacyRecovery(recovery, legacyResult, plan, record) {
  const errors = [];
  if (!recovery || typeof recovery !== "object" || recovery.planCommentId !== legacyResult.plan?.id
    || recovery.planDigestSha256 !== digestText(legacyResult.plan?.body ?? "")
    || typeof recovery.authorizationEvidence !== "string" || !recovery.authorizationEvidence.trim()
    || !Array.isArray(recovery.mappings)) {
    return { errors: ["Explicit legacy recovery must identify the current legacy plan, its digest, authorization evidence, and mappings"], criteria: [], historicalCriteria: [] };
  }
  const declared = new Map(record.criteria.map((item) => [item.id.toLowerCase(), item]));
  const active = new Map(legacyResult.activeCriteria.map((item) => [item.id, item]));
  const mappings = new Map();
  const usedTargets = new Set();
  const historicalCriteria = [];
  for (const mapping of recovery.mappings) {
    if (!mapping || typeof mapping.legacyItemId !== "string" || !active.has(mapping.legacyItemId)
      || mappings.has(mapping.legacyItemId)) {
      errors.push("Legacy recovery mapping references an unknown or duplicate active criterion");
      continue;
    }
    mappings.set(mapping.legacyItemId, mapping);
    const old = active.get(mapping.legacyItemId);
    if (mapping.status === "retained") {
      const targetId = String(mapping.criterionId ?? "").toLowerCase();
      const target = declared.get(targetId);
      if (!target || target.text !== old.text || usedTargets.has(targetId)) {
        errors.push(`Retained legacy criterion does not map to a unique exact v3 criterion: ${mapping.legacyItemId}`);
      } else usedTargets.add(targetId);
    } else if (mapping.status === "replaced") {
      const targets = Array.isArray(mapping.replacementIds) ? mapping.replacementIds.map((id) => String(id).toLowerCase()) : [];
      if (!targets.length || targets.some((id) => !declared.has(id))
        || new Set(targets).size !== targets.length || targets.some((id) => usedTargets.has(id))
        || typeof mapping.authorizationEvidence !== "string" || !mapping.authorizationEvidence.trim()) {
        errors.push(`Legacy replacement requires declared successor criteria and explicit authorization: ${mapping.legacyItemId}`);
      }
      for (const id of targets) usedTargets.add(id);
      historicalCriteria.push({ ...old, document: old.document });
    } else if (mapping.status === "cancelled") {
      if (typeof mapping.reason !== "string" || !mapping.reason.trim()
        || typeof mapping.authorizationEvidence !== "string" || !mapping.authorizationEvidence.trim()) {
        errors.push(`Legacy cancellation requires a reason and explicit authorization: ${mapping.legacyItemId}`);
      }
      historicalCriteria.push({ ...old, document: old.document });
    } else errors.push(`Unknown legacy recovery disposition: ${mapping.legacyItemId}`);
  }
  for (const id of active.keys()) if (!mappings.has(id)) errors.push(`Legacy active criterion is unmapped: ${id}`);
  const declaredCriteria = extractDeclaredCriteria(plan);
  const criteria = declaredCriteria.map((criterion) => {
    const retained = recovery.mappings.find((mapping) => mapping.status === "retained"
      && String(mapping.criterionId).toLowerCase() === criterion.id);
    const prior = retained ? active.get(retained.legacyItemId) : null;
    return { ...criterion, checked: prior ? prior.checked : false };
  });
  return { errors, criteria, historicalCriteria };
}

function validatePublicationTransitions(previousRecord, previousPlan, record, plan, recordComment) {
  const errors = [];
  const historicalCriteria = [];
  const oldCriteria = new Map(previousRecord.criteria.map((item) => [item.id.toLowerCase(), item]));
  const newCriteria = new Map(record.criteria.map((item) => [item.id.toLowerCase(), item]));
  const transitions = new Map();
  const usedSuccessors = new Set();
  for (const transition of record.transitions) {
    const id = transition?.id?.toLowerCase();
    if (!id || !oldCriteria.has(id) || transitions.has(id)) {
      errors.push("Publication transition references an unknown or duplicate prior criterion");
      continue;
    }
    transitions.set(id, transition);
  }
  for (const [id, old] of oldCriteria) {
    const transition = transitions.get(id);
    const next = newCriteria.get(id);
    if (!transition) {
      errors.push(`Prior active criterion has no publication transition: ${id}`);
      continue;
    }
    if (transition.status === "retained") {
      if (!next || next.text !== old.text || next.digestSha256 !== old.digestSha256) {
        errors.push(`Retained criterion changed or is absent: ${id}`);
      }
    } else if (transition.status === "replaced") {
      if (next || !Array.isArray(transition.replacementIds) || !transition.replacementIds.length
        || transition.replacementIds.some((replacementId) => !newCriteria.has(String(replacementId).toLowerCase()))
        || new Set((transition.replacementIds ?? []).map((replacementId) => String(replacementId).toLowerCase())).size !== (transition.replacementIds ?? []).length
        || (transition.replacementIds ?? []).some((replacementId) => usedSuccessors.has(String(replacementId).toLowerCase()))
        || typeof transition.authorizationEvidence !== "string" || !transition.authorizationEvidence.trim()) {
        errors.push(`Replacement transition is incomplete or unauthorized: ${id}`);
      }
      for (const replacementId of transition.replacementIds ?? []) usedSuccessors.add(String(replacementId).toLowerCase());
      if (next === undefined) {
        const prior = extractDeclaredCriteria(previousPlan).find((criterion) => criterion.id === id);
        if (prior) historicalCriteria.push({ ...prior, document: previousPlan.id });
      }
    } else if (transition.status === "cancelled") {
      if (next || typeof transition.reason !== "string" || !transition.reason.trim()
        || typeof transition.authorizationEvidence !== "string" || !transition.authorizationEvidence.trim()) {
        errors.push(`Cancellation transition is incomplete or unauthorized: ${id}`);
      }
      const prior = extractDeclaredCriteria(previousPlan).find((criterion) => criterion.id === id);
      if (prior) historicalCriteria.push({ ...prior, document: previousPlan.id });
    } else errors.push(`Unknown publication transition status: ${id}`);
  }
  for (const id of transitions.keys()) {
    if (!oldCriteria.has(id)) errors.push(`Transition is not for a prior active criterion: ${id}`);
  }
  // A retained criterion keeps its previously evidenced checkbox state; new/replacement criteria
  // start with the state written in the candidate (normally unchecked).
  const oldStatuses = new Map(extractDeclaredCriteria(previousPlan).map((item) => [item.id, item.checked]));
  const current = extractDeclaredCriteria(plan).map((item) => ({
    ...item,
    checked: oldStatuses.has(item.id) && oldCriteria.has(item.id) && transitions.get(item.id)?.status === "retained"
      ? oldStatuses.get(item.id)
      : item.checked,
  }));
  return { errors, criteria: current, historicalCriteria, recordComment };
}

/** Parse and structurally validate one GitHub plan comment. */
export function parsePlanComment(comment) {
  const body = typeof comment === "string" ? comment : comment?.body;
  if (typeof body !== "string") {
    return { valid: false, version: null, diagnostics: ["Plan body must be a string"] };
  }
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const marker = lines[0];
  const version = marker === PLAN_V1 ? 1 : marker === PLAN_V2 ? 2 : marker === PLAN_V3 ? 3 : null;
  const diagnostics = [];
  if (version === null) {
    return { valid: false, version: null, diagnostics: ["Unrecognized exact plan marker on first line"] };
  }

  const secondLine = lines[1] ?? "";
  if (/<!--\s*gt:acceptance-required\b/i.test(secondLine)
    && (version !== 2 || secondLine !== ACCEPTANCE_REQUIRED)) {
    diagnostics.push("Unknown or unsupported acceptance marker on second line");
  }
  const requiresAcceptance = version === 2 && secondLine === ACCEPTANCE_REQUIRED;
  const expected = version === 1 ? V1_HEADINGS : V2_HEADINGS;
  const headings = sectionsOf(body);
  if (version < 3) {
    const planHeadings = headings.filter(({ heading }) => expected.includes(heading));
    const actual = planHeadings.map(({ heading }) => heading);
    if (actual.length !== expected.length || actual.some((heading, index) => heading !== expected[index])) {
      diagnostics.push("Required headings are missing, duplicated, reordered, or ambiguous");
    }
    if (headings.some(({ heading }) => {
      const level = heading.match(/^#+/)[0].length;
      return level <= 3 && !expected.includes(heading);
    })) diagnostics.push("Plan contains unexpected structural headings");

    for (let i = 0; i < expected.length; i += 1) {
      const matches = headings.filter(({ heading }) => heading === expected[i]);
      if (matches.length !== 1) continue;
      const content = contentForHeading(body, headings, headings.indexOf(matches[0]));
      if (!usefulContent(content)) diagnostics.push(`Required section has empty or placeholder content: ${expected[i]}`);
    }
  } else {
    const levelTwo = headings.filter(({ heading }) => heading.startsWith("## "));
    for (const [semantic, aliases] of Object.entries(V3_SEMANTIC_HEADINGS)) {
      const matches = levelTwo.filter(({ heading }) => aliases.has(heading.slice(3).trim().toLowerCase()));
      if (matches.length !== 1) {
        diagnostics.push(`V3 plan must contain exactly one unambiguous ${semantic} section`);
        continue;
      }
      const content = contentForHeading(body, headings, headings.indexOf(matches[0]));
      if (!usefulContent(content)) diagnostics.push(`V3 ${semantic} section has empty or placeholder content`);
    }
  }

  const testsHeading = headings.findIndex(({ heading }) => version === 3
    ? heading.startsWith("## ") && V3_SEMANTIC_HEADINGS.validation.has(heading.slice(3).trim().toLowerCase())
    : heading === "## Tests");
  const testsContent = testsHeading < 0 ? "" : contentForHeading(body, headings, testsHeading);
  let testCommand = "";
  walkLines(testsContent, ({ line, fenced }) => {
    if (!fenced && !testCommand) testCommand = line.match(/^Test command:\s*(.*?)\s*$/)?.[1] ?? "";
  });
  if (!testCommand) diagnostics.push("Tests section must contain a non-empty Test command line");
  if (version === 2 && !headings.some(({ heading }) => heading === "## Constraints")) {
    diagnostics.push("V2 plan must include Constraints");
  }

  if (version === 3) {
    const criteriaHeading = headings.findIndex(({ heading }) => heading === "## Acceptance criteria");
    const criteriaBody = criteriaHeading < 0 ? "" : contentForHeading(body, headings, criteriaHeading);
    const ids = new Set();
    walkLines(criteriaBody, ({ line, fenced }) => {
      if (fenced || !line.trim()) return;
      if (!TASK_RE.test(line) && (/^\s{0,3}#{1,6}\s+/.test(line) || !/^\s*[-*]\s+\[/.test(line))) return;
      const task = line.match(CRITERION_RE);
      if (!task) {
        diagnostics.push("V3 acceptance criteria must use explicit [criterion:<id>] task items");
        return;
      }
      const id = task[2].toLowerCase();
      if (ids.has(id)) diagnostics.push(`V3 criterion ID is duplicated: ${id}`);
      ids.add(id);
    });
    if (ids.size === 0) diagnostics.push("V3 plan must declare at least one explicit acceptance criterion");
  }

  return {
    valid: diagnostics.length === 0,
    version,
    requiresAcceptance,
    requiresPublication: version === 3,
    testCommand,
    diagnostics,
  };
}

function inventoryDocument(issueNumber, document, text) {
  const sourceDigestSha256 = digestText(text);
  const items = [];
  walkLines(text, ({ line, lineNumber, fenced }) => {
    if (fenced) return;
    const match = line.match(TASK_RE);
    if (!match) return;
    const suffix = match[3] ?? "";
    const normalizedTaskLine = `${match[1]}[ ]${suffix}`;
    const taskText = suffix.replace(/^[ \t]/, "");
    const identity = JSON.stringify(
      [issueNumber, document, lineNumber, normalizedTaskLine, sourceDigestSha256],
    );
    items.push({
      id: sha256(identity),
      document,
      line: lineNumber,
      text: taskText,
      sourceDigestSha256,
    });
  });
  return items;
}

/** Extract stable task-list locators, ignoring fenced examples/code. */
export function extractTaskItems(issueNumber, document, text) {
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) throw new TypeError("Issue number must be a positive integer");
  if (typeof document !== "string" || !document) throw new TypeError("Document identity is required");
  if (typeof text !== "string") throw new TypeError("Document text must be a string");
  return inventoryDocument(issueNumber, document, text);
}

function asIssueCommentUrl(url, issueNumber) {
  return typeof url === "string"
    && new RegExp(`^https://github\\.com/[^/]+/[^/]+/issues/${issueNumber}#issuecomment-\\d+$`).test(url);
}

function sameIssueUrl(left, right, issueNumber) {
  if (!asIssueCommentUrl(left, issueNumber) || !asIssueCommentUrl(right, issueNumber)) return false;
  return left.split("/issues/")[0] === right.split("/issues/")[0];
}

function validateLocator(locator, issueNumber, documents) {
  if (!locator || typeof locator !== "object"
    || typeof locator.id !== "string"
    || !/^[a-f0-9]{64}$/.test(locator.id)
    || typeof locator.document !== "string"
    || (locator.document !== "issue-body" && !documents.has(locator.document))
    || !Number.isSafeInteger(locator.line) || locator.line < 1
    || typeof locator.text !== "string"
    || typeof locator.sourceDigestSha256 !== "string"
    || !/^[a-f0-9]{64}$/.test(locator.sourceDigestSha256)) return false;
  const source = documents.get(locator.document);
  if (typeof source !== "string") return false;
  return inventoryDocument(issueNumber, locator.document, source)
    .some((item) => item.id === locator.id
      && item.line === locator.line
      && item.text === locator.text
      && item.sourceDigestSha256 === locator.sourceDigestSha256);
}

function verifyReceipt(receipt, comment, issue, documents, byId) {
  const errors = [];
  const requiredStrings = ["planCommentId", "planUrl", "planDigestSha256"];
  if (receipt.schema !== RECEIPT_SCHEMA) errors.push("Unknown receipt schema");
  if (receipt.issueNumber !== issue.number) errors.push("Receipt issue number mismatch");
  for (const key of requiredStrings) if (typeof receipt[key] !== "string") errors.push(`Receipt field ${key} must be a string`);
  if (!(receipt.previousAcceptanceCommentId === null || typeof receipt.previousAcceptanceCommentId === "string")) {
    errors.push("Invalid previous receipt reference");
  }
  if (!Array.isArray(receipt.items) || !Array.isArray(receipt.reconciliation)) errors.push("Receipt items and reconciliation must be arrays");
  if (typeof receipt.planDigestSha256 === "string" && !/^[a-f0-9]{64}$/.test(receipt.planDigestSha256)) {
    errors.push("Invalid plan digest format");
  }
  const plan = byId.get(receipt.planCommentId);
  if (!plan || plan.url !== receipt.planUrl) errors.push("Referenced plan comment ID/URL does not match this issue");
  if (plan && (!asIssueCommentUrl(plan.url, issue.number) || !parsePlanComment(plan).valid
    || parsePlanComment(plan).version !== 2 || !parsePlanComment(plan).requiresAcceptance)) {
    errors.push("Receipt must reference a valid acceptance-required v2 plan");
  }
  if (!comment.createdAt || !sameIssueUrl(comment.url, plan?.url, issue.number)) {
    errors.push("Receipt and plan URLs must identify comments on the same issue");
  }
  if (plan && comment.createdAt && plan.createdAt && plan.createdAt > comment.createdAt) {
    errors.push("Referenced plan was created after its acceptance receipt");
  }
  if (plan && receipt.planDigestSha256 !== digestText(plan.body)) errors.push("Plan digest mismatch");

  const itemIds = new Set();
  if (Array.isArray(receipt.items)) {
    for (const item of receipt.items) {
      if (!validateLocator(item, issue.number, documents)) errors.push(`Invalid or stale item locator: ${item?.id ?? "unknown"}`);
      if (itemIds.has(item?.id)) errors.push(`Duplicate item locator: ${item.id}`);
      itemIds.add(item?.id);
    }
  }
  const dispositionIds = new Set();
  if (Array.isArray(receipt.reconciliation)) {
    for (const disposition of receipt.reconciliation) {
      if (!disposition || !itemIds.has(disposition.itemId)) errors.push("Reconciliation references an unknown item");
      if (dispositionIds.has(disposition?.itemId)) errors.push("Duplicate reconciliation disposition");
      dispositionIds.add(disposition?.itemId);
      if (!["retained", "replaced", "cancelled"].includes(disposition?.status)) errors.push("Unknown reconciliation status");
      if (disposition?.status === "replaced") {
        if (!Array.isArray(disposition.replacementItemIds) || disposition.replacementItemIds.length === 0
          || disposition.replacementItemIds.some((id) => !itemIds.has(id))) errors.push("Replacement must reference candidate item locators");
        if (new Set(disposition.replacementItemIds ?? []).size !== (disposition.replacementItemIds ?? []).length) errors.push("Replacement item IDs must be unique");
        if (typeof disposition.authorizationEvidence !== "string" || !disposition.authorizationEvidence.trim()) errors.push("Replacement requires authorization evidence");
      }
      if (disposition?.status === "cancelled"
        && (typeof disposition.reason !== "string" || !disposition.reason.trim()
          || typeof disposition.authorizationEvidence !== "string" || !disposition.authorizationEvidence.trim())) errors.push("Cancellation requires reason and authorization evidence");
    }
  }
  if (Array.isArray(receipt.items)) {
    const actualIds = receipt.items.map((item) => item?.id).sort();
    const expectedIds = itemIdsAtReceipt(issue, comment);
    if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
      errors.push("Receipt item inventory is incomplete or contains items not present at acceptance time");
    }
  }
  if (!byId.has(comment.id)) errors.push("Receipt comment is not in this issue snapshot");
  return errors;
}

function documentsFor(issue) {
  const docs = new Map([["issue-body", issue.body]]);
  for (const comment of issue.comments) docs.set(comment.id, comment.body);
  return docs;
}

function withCheckboxStatus(item, documents) {
  const source = documents.get(item.document) ?? "";
  const line = source.replace(/\r\n/g, "\n").split("\n")[item.line - 1] ?? "";
  const task = line.match(TASK_RE);
  return { ...item, checked: task ? task[2].toLowerCase() === "x" : false };
}

function beforeOrAtComment(candidate, boundary) {
  const candidateTime = candidate.createdAt ?? "";
  const boundaryTime = boundary.createdAt ?? "";
  return candidateTime < boundaryTime
    || (candidateTime === boundaryTime && candidate.id.localeCompare(boundary.id) <= 0);
}

function itemIdsAtReceipt(issue, receiptComment) {
  const items = inventoryDocument(issue.number, "issue-body", issue.body);
  for (const comment of issue.comments) {
    if (beforeOrAtComment(comment, receiptComment)) {
      items.push(...inventoryDocument(issue.number, comment.id, comment.body));
    }
  }
  return items.map((item) => item.id).sort();
}

function validateReceiptTransitions(chain, receipts) {
  const diagnostics = [];
  const effective = new Map();
  let previousReceipt;
  let previousActive = new Set();

  for (const receiptComment of chain) {
    const receipt = receipts.get(receiptComment.id);
    const planId = receipt.planCommentId;
    const itemsById = new Map(receipt.items.map((item) => [item.id, item]));
    const oldItemIds = new Set(previousReceipt?.items.map((item) => item.id) ?? []);
    const expectedPrior = new Set(previousActive);
    if (previousReceipt) {
      for (const item of receipt.items) {
        if (item.document !== planId && !oldItemIds.has(item.id)) expectedPrior.add(item.id);
      }
    } else {
      for (const item of receipt.items) if (item.document !== planId) expectedPrior.add(item.id);
    }

    const dispositions = new Map(receipt.reconciliation.map((item) => [item.itemId, item]));
    for (const id of expectedPrior) {
      if (!itemsById.has(id)) diagnostics.push(`${receiptComment.id}: Prior active criterion ${id} is missing from receipt items`);
      if (!dispositions.has(id)) diagnostics.push(`${receiptComment.id}: Prior active criterion ${id} has no disposition`);
    }
    for (const id of dispositions.keys()) {
      if (!expectedPrior.has(id)) diagnostics.push(`${receiptComment.id}: Reconciliation contains an item that was not previously active: ${id}`);
    }

    const active = new Set(expectedPrior);
    for (const item of receipt.items) if (item.document === planId) active.add(item.id);
    for (const disposition of receipt.reconciliation) {
      if (disposition.status === "replaced" || disposition.status === "cancelled") active.delete(disposition.itemId);
      if (disposition.status === "replaced") {
        for (const id of disposition.replacementItemIds ?? []) {
          if (itemsById.get(id)?.document !== planId) diagnostics.push(`${receiptComment.id}: Replacement ${id} is not from the accepted candidate`);
          active.add(id);
        }
      }
    }
    effective.set(receiptComment.id, active);
    previousReceipt = receipt;
    previousActive = active;
  }
  return { diagnostics, effective };
}

/** Resolve a single verified receipt chain, or conservative legacy fallback. */
export function resolveCurrentPlan(issue) {
  const diagnostics = [];
  if (!issue || !Number.isSafeInteger(issue.number) || typeof issue.body !== "string" || !Array.isArray(issue.comments)) {
    return { valid: false, plan: null, diagnostics: ["Issue snapshot is malformed"], activeCriteria: [] };
  }
  if (issue.comments.some((comment) => !comment || typeof comment.id !== "string"
    || typeof comment.body !== "string" || typeof comment.url !== "string")) {
    return { valid: false, plan: null, diagnostics: ["Issue snapshot contains a malformed comment"], activeCriteria: [] };
  }
  if (new Set(issue.comments.map((comment) => comment.id)).size !== issue.comments.length) {
    return { valid: false, plan: null, diagnostics: ["Issue snapshot contains duplicate comment IDs"], activeCriteria: [] };
  }
  const docs = documentsFor(issue);
  const byId = new Map(issue.comments.map((comment) => [comment.id, comment]));
  const publicationMarkers = issue.comments.filter((comment) => comment.body.split(/\r?\n/, 1)[0].startsWith("<!-- gt:plan-published"));
  if (publicationMarkers.length) {
    const publicationComments = publicationMarkers.filter((comment) => comment.body.split(/\r?\n/, 1)[0] === PUBLISHED_V2);
    const diagnostics = [];
    if (publicationComments.length !== publicationMarkers.length) {
      return { valid: false, plan: null, diagnostics: ["Malformed or unknown publication record marker"], activeCriteria: [] };
    }
    const hasLegacyHistory = issue.comments.some((comment) => comment.body.startsWith(PLAN_V1)
      || comment.body.startsWith(PLAN_V2) || comment.body.split(/\r?\n/, 1)[0] === ACCEPTED);
    const records = new Map();
    for (const comment of publicationComments) {
      const parsed = parsePublicationBody(comment.body);
      if (parsed.error) diagnostics.push(`${comment.id}: ${parsed.error}`);
      else {
        const errors = validatePublicationRecord(parsed.value, comment, issue, byId);
        if (errors.length) diagnostics.push(...errors.map((error) => `${comment.id}: ${error}`));
        records.set(comment.id, parsed.value);
      }
    }
    if (diagnostics.length || records.size !== publicationComments.length) {
      return { valid: false, plan: null, diagnostics, activeCriteria: [] };
    }
    const children = new Map();
    let roots = 0;
    for (const [id, record] of records) {
      const previous = record.previousPublicationCommentId;
      if (previous === null) roots += 1;
      else if (!records.has(previous)) diagnostics.push(`${id}: Previous publication record is missing`);
      else children.set(previous, (children.get(previous) ?? 0) + 1);
    }
    if (roots !== 1) diagnostics.push("Publication history must have exactly one chain root");
    for (const [id, count] of children) if (count > 1) diagnostics.push(`${id}: Conflicting publication branches`);
    const tips = [...records.keys()].filter((id) => !children.has(id));
    if (tips.length !== 1) diagnostics.push("Publication history must have exactly one chain tip");
    if (diagnostics.length) return { valid: false, plan: null, diagnostics, activeCriteria: [] };
    const tipId = tips[0];
    const chain = [];
    let currentId = tipId;
    while (currentId) {
      chain.unshift(byId.get(currentId));
      currentId = records.get(currentId).previousPublicationCommentId;
    }
    if (chain.length !== records.size) {
      return { valid: false, plan: null, diagnostics: ["Publication history contains a disconnected or cyclic branch"], activeCriteria: [] };
    }
    let resolvedCriteria = [];
    const historicalCriteria = [];
    let previousPlan = null;
    let previousRecord = null;
    for (const recordComment of chain) {
      const record = records.get(recordComment.id);
      const plan = byId.get(record.planCommentId);
      if (previousRecord) {
        const transition = validatePublicationTransitions(previousRecord, previousPlan, record, plan, recordComment);
        diagnostics.push(...transition.errors.map((error) => `${recordComment.id}: ${error}`));
        resolvedCriteria = transition.criteria;
        historicalCriteria.push(...transition.historicalCriteria);
      } else resolvedCriteria = extractDeclaredCriteria(plan);
      previousRecord = record;
      previousPlan = plan;
    }
    if (hasLegacyHistory && chain.length) {
      const legacyComments = issue.comments.filter((comment) => !comment.body.startsWith(PLAN_V3)
        && comment.body.split(/\r?\n/, 1)[0] !== PUBLISHED_V2);
      const legacyResult = resolveCurrentPlan({ ...issue, comments: legacyComments });
      const rootRecord = records.get(chain[0].id);
      const rootPlan = byId.get(rootRecord.planCommentId);
      const recovery = validateLegacyRecovery(rootRecord.legacyRecovery, legacyResult, rootPlan, rootRecord);
      diagnostics.push(...recovery.errors.map((error) => `${chain[0].id}: ${error}`));
      if (!recovery.errors.length) {
        resolvedCriteria = recovery.criteria;
        historicalCriteria.push(...recovery.historicalCriteria);
      }
    }
    if (diagnostics.length) return { valid: false, plan: null, diagnostics, activeCriteria: [] };
    const plan = byId.get(previousRecord.planCommentId);
    const activeCriteria = resolvedCriteria.map((item) => ({
      id: item.id,
      document: plan.id,
      line: item.line,
      text: item.text,
      sourceDigestSha256: digestText(plan.body),
      checked: item.checked,
    }));
    return {
      valid: true,
      plan,
      publication: byId.get(tipId),
      diagnostics,
      activeCriteria,
      historicalCriteria: historicalCriteria.map((item) => ({
        id: item.id,
        document: item.document,
        line: item.line,
        text: item.text,
        sourceDigestSha256: digestText(byId.get(item.document).body),
        checked: item.checked,
      })),
    };
  }
  const receiptCandidates = issue.comments.filter((comment) => comment.body.split(/\r?\n/, 1)[0].startsWith("<!-- gt:plan-accepted"));
  const receiptComments = receiptCandidates.filter((comment) => comment.body.split(/\r?\n/, 1)[0] === ACCEPTED);
  if (receiptCandidates.length !== receiptComments.length) {
    return { valid: false, plan: null, diagnostics: ["Malformed or unknown acceptance receipt marker"], activeCriteria: [] };
  }

  if (receiptComments.length) {
    const receipts = new Map();
    for (const comment of receiptComments) {
      const parsed = parseReceiptBody(comment.body);
      if (parsed.error) diagnostics.push(`${comment.id}: ${parsed.error}`);
      else {
        const errors = verifyReceipt(parsed.value, comment, issue, docs, byId);
        if (errors.length) diagnostics.push(...errors.map((error) => `${comment.id}: ${error}`));
        receipts.set(comment.id, parsed.value);
      }
    }
    if (diagnostics.length || receipts.size !== receiptComments.length) {
      return { valid: false, plan: null, diagnostics, activeCriteria: [] };
    }

    const children = new Map();
    let roots = 0;
    for (const [id, receipt] of receipts) {
      const previous = receipt.previousAcceptanceCommentId;
      if (previous === null) roots += 1;
      else if (!receipts.has(previous)) diagnostics.push(`${id}: Previous acceptance receipt is missing`);
      else children.set(previous, (children.get(previous) ?? 0) + 1);
    }
    if (roots !== 1) diagnostics.push("Receipt history must have exactly one chain root");
    for (const [id, count] of children) if (count > 1) diagnostics.push(`${id}: Conflicting receipt chain branches`);
    const tips = [...receipts.keys()].filter((id) => !children.has(id));
    if (tips.length !== 1) diagnostics.push("Receipt history must have exactly one chain tip");
    if (diagnostics.length) return { valid: false, plan: null, diagnostics, activeCriteria: [] };

    const tipId = tips[0];
    const chain = [];
    let current = tipId;
    while (current) {
      chain.unshift(byId.get(current));
      current = receipts.get(current).previousAcceptanceCommentId;
    }
    if (chain.length !== receipts.size) {
      return { valid: false, plan: null, diagnostics: ["Receipt history contains a disconnected or cyclic branch"], activeCriteria: [] };
    }
    const transitions = validateReceiptTransitions(chain, receipts);
    if (transitions.diagnostics.length) {
      return { valid: false, plan: null, diagnostics: transitions.diagnostics, activeCriteria: [] };
    }
    const tipReceipt = receipts.get(tipId);
    const plan = byId.get(tipReceipt.planCommentId);
    const activeIds = transitions.effective.get(tipId);
    const recorded = new Map(tipReceipt.items.map((item) => [item.id, item]));
    const activeCriteria = tipReceipt.items.filter((item) => activeIds.has(item.id));
    for (const comment of issue.comments) {
      if (beforeOrAtComment(byId.get(tipId), comment) && comment.id !== tipId) {
        for (const item of inventoryDocument(issue.number, comment.id, comment.body)) {
          if (!recorded.has(item.id)) {
            activeCriteria.push(item);
            recorded.set(item.id, item);
          }
        }
      }
    }
    const acceptedPlanIds = new Set([...receipts.values()].map((receipt) => receipt.planCommentId));
    diagnostics.push(...issue.comments.filter((candidate) => {
      if (receiptComments.some((receipt) => receipt.id === candidate.id)) return false;
      if (acceptedPlanIds.has(candidate.id)) return false;
      const parsed = parsePlanComment(candidate);
      return candidate.body.startsWith(PLAN_V1) || candidate.body.startsWith(PLAN_V2) || candidate.body.startsWith(PLAN_V3)
        ? !parsed.valid || parsed.requiresAcceptance || parsed.requiresPublication
        : false;
    }).map((candidate) => `${candidate.id}: pending or invalid plan candidate; accepted plan remains unchanged`));
    const historicalCriteria = tipReceipt.items.filter((item) => !activeIds.has(item.id));
    return {
      valid: true,
      plan,
      receipt: byId.get(tipId),
      diagnostics,
      activeCriteria: activeCriteria.map((item) => withCheckboxStatus(item, docs)),
      historicalCriteria: historicalCriteria.map((item) => withCheckboxStatus(item, docs)),
    };
  }

  const plans = issue.comments
    .filter((comment) => comment.body.startsWith(PLAN_V1) || comment.body.startsWith(PLAN_V2) || comment.body.startsWith(PLAN_V3))
    .map((comment) => ({ comment, parsed: parsePlanComment(comment) }));
  for (const { comment, parsed } of plans) {
    if (!parsed.valid) diagnostics.push(`${comment.id}: invalid legacy plan: ${parsed.diagnostics.join("; ")}`);
    else if (parsed.requiresAcceptance) diagnostics.push(`${comment.id}: acceptance-required plan is pending without a receipt`);
    else if (parsed.requiresPublication) diagnostics.push(`${comment.id}: v3 plan is pending without a publication record`);
  }
  const eligible = plans.filter(({ parsed }) => parsed.valid && !parsed.requiresAcceptance && !parsed.requiresPublication);
  eligible.sort((a, b) => (a.comment.createdAt ?? "").localeCompare(b.comment.createdAt ?? "") || a.comment.id.localeCompare(b.comment.id));
  if (!eligible.length) {
    return { valid: false, plan: null, diagnostics: [...diagnostics, "No valid eligible plan exists"], activeCriteria: [] };
  }
  const selected = eligible.at(-1).comment;
  const activeCriteria = [];
  const pendingPlanIds = new Set(plans.filter(({ parsed }) => parsed.valid
    && (parsed.requiresAcceptance || parsed.requiresPublication)).map(({ comment }) => comment.id));
  for (const [document, text] of docs) {
    if (pendingPlanIds.has(document)) continue;
    activeCriteria.push(...inventoryDocument(issue.number, document, text));
  }
  return {
    valid: true,
    plan: selected,
    receipt: null,
    diagnostics,
    activeCriteria: activeCriteria.map((item) => withCheckboxStatus(item, docs)),
    historicalCriteria: [],
  };
}

/** Resolve an explicit stage target without fallback, or choose the lowest open stage. */
export function resolveStageTarget(explicitNumber, openStages) {
  if (!Array.isArray(openStages)) return { valid: false, target: null, error: "Open stages must be an array" };
  const hasStageLabel = (stage) => Array.isArray(stage?.labels)
    && stage.labels.some((label) => label === "stage" || label?.name === "stage");
  if (explicitNumber !== undefined && explicitNumber !== null) {
    if (!Number.isSafeInteger(explicitNumber) || explicitNumber < 1) {
      return { valid: false, target: null, error: "Explicit target must be a positive issue number" };
    }
    const target = openStages.find((stage) => stage && stage.number === explicitNumber
      && stage.state === "OPEN" && hasStageLabel(stage));
    return target
      ? { valid: true, target, error: null }
      : { valid: false, target: null, error: `Explicit stage #${explicitNumber} is not an open stage; no fallback was used` };
  }
  const target = openStages
    .filter((stage) => stage && Number.isSafeInteger(stage.number) && stage.state === "OPEN"
      && hasStageLabel(stage))
    .sort((a, b) => a.number - b.number)[0];
  return target
    ? { valid: true, target, error: null }
    : { valid: false, target: null, error: "No open stage exists" };
}

/** Return only the active/historical classification and diagnostics for a snapshot. */
export function classifyActiveCriteria(issue) {
  const result = resolveCurrentPlan(issue);
  return {
    valid: result.valid,
    activeCriteria: result.activeCriteria,
    historicalCriteria: result.historicalCriteria,
    diagnostics: result.diagnostics,
  };
}
