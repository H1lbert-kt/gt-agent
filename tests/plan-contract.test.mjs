import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalizePlanText,
  classifyActiveCriteria,
  digestText,
  extractTaskItems,
  parsePlanComment,
  resolveCurrentPlan,
  resolveStageTarget,
} from "../skills/gt/lib/plan-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "plan-contract");
const fixture = (name) => readFileSync(join(root, name), "utf8");
const v1 = fixture("plan-v1-valid.md");
const v2 = fixture("plan-v2-valid.md");

function comment(id, body, createdAt, issueNumber = 9) {
  return {
    id,
    url: `https://github.com/example/repo/issues/${issueNumber}#issuecomment-${id.replace(/\D/g, "") || "1"}`,
    body,
    createdAt,
  };
}

function receiptComment(id, receipt, createdAt, issueNumber = 9) {
  return comment(id, `<!-- gt:plan-accepted v1 -->\n\`\`\`json\n${JSON.stringify(receipt, null, 2)}\n\`\`\``, createdAt, issueNumber);
}

function makeReceipt(issueNumber, plan, previousAcceptanceCommentId, documents, reconciliation) {
  const items = documents.flatMap(([document, body]) => extractTaskItems(issueNumber, document, body));
  const receipt = {
    schema: "gt-plan-acceptance/v1",
    issueNumber,
    planCommentId: plan.id,
    planUrl: plan.url,
    planDigestSha256: digestText(plan.body),
    previousAcceptanceCommentId,
    items,
    reconciliation,
  };
  return receipt;
}

test("accepts exact legacy/current plan markers and rejects marker lookalikes", () => {
  assert.equal(parsePlanComment(v1).valid, true);
  assert.equal(parsePlanComment(v1).version, 1);
  assert.equal(parsePlanComment(v2).valid, true);
  assert.equal(parsePlanComment(v2).version, 2);
  assert.equal(parsePlanComment("\n<!-- gt:plan v2 -->\n").valid, false);
  assert.equal(parsePlanComment("<!-- gt:plan v3 -->\n").valid, false);
  assert.equal(parsePlanComment("```md\n<!-- gt:plan v2 -->\n```\n").valid, false);
  assert.equal(parsePlanComment("<!-- gt:plan-accepted v1 -->\n```json\n{}\n```\n").valid, false);
  assert.equal(parsePlanComment(v2.replace("<!-- gt:acceptance-required v1 -->", "<!-- gt:acceptance-required v9 -->")).valid, false);
});

test("rejects reordered, incomplete, duplicated, and empty test sections", () => {
  const invalidOrder = parsePlanComment(fixture("plan-v2-invalid-order.md"));
  assert.equal(invalidOrder.valid, false);
  assert.match(invalidOrder.diagnostics.join(" "), /reordered/);
  const emptyCommand = parsePlanComment(fixture("plan-v2-empty-command.md"));
  assert.equal(emptyCommand.valid, false);
  assert.match(emptyCommand.diagnostics.join(" "), /non-empty Test command/);
  const fencedCommand = v2.replace("Test command: node --test tests/", "```sh\nTest command: node --test tests/\n```");
  assert.equal(parsePlanComment(fencedCommand).valid, false);
  assert.equal(parsePlanComment(v2.replace("## Constraints", "## Constraint missing")).valid, false);
  assert.equal(parsePlanComment(v2.replace("## Goal", "## Goal\n\n## Goal")).valid, false);
});

test("canonical digest normalizes only real task states outside fenced code", () => {
  const unchecked = "Heading\r\n- [ ] real task\r\n* [x] second\r\ntext [x] stays\r\n```md\r\n- [ ] fenced task\r\n```\r\n";
  const checked = unchecked.replace("- [ ] real task", "- [X] real task").replace("* [x] second", "* [ ] second");
  assert.equal(digestText(unchecked), digestText(checked));
  assert.notEqual(digestText(unchecked), digestText(unchecked.replace("real task", "changed task")));
  assert.equal(canonicalizePlanText(unchecked).endsWith("\n"), true);
  const items = extractTaskItems(7, "issue-body", unchecked);
  assert.deepEqual(items.map((item) => item.text), ["real task", "second"]);
  assert.equal(items[0].line, 2);
  assert.equal(items[0].sourceDigestSha256, digestText(unchecked));
  assert.equal(items[0].id, createHash("sha256").update(JSON.stringify([
    7, "issue-body", 2, "- [ ] real task", digestText(unchecked),
  ]), "utf8").digest("hex"));
  assert.equal(extractTaskItems(7, "issue-body", "- [ ]bad syntax\n").length, 0);
});

test("ignores fenced checkbox examples and gives repeated task text distinct locators", () => {
  const source = "- [ ] repeated\n~~~md\n- [ ] example\n~~~\n- [x] repeated\n";
  const items = extractTaskItems(2, "C1", source);
  assert.equal(items.length, 2);
  assert.equal(items[0].text, items[1].text);
  assert.notEqual(items[0].id, items[1].id);
});

test("selects last-created valid legacy plan but keeps all document task items active", () => {
  const source = JSON.parse(fixture("legacy-snapshot.json"));
  const issue = {
    ...source,
    comments: source.comments.map(({ bodyFixture, ...metadata }) => comment(
      metadata.id,
      bodyFixture ? fixture(bodyFixture) : metadata.body,
      metadata.createdAt,
      source.number,
    )),
  };
  const result = resolveCurrentPlan(issue);
  assert.equal(result.valid, true);
  assert.equal(result.plan.id, "C1");
  assert.ok(result.diagnostics.some((message) => message.includes("C3") && message.includes("invalid legacy plan")));
  assert.deepEqual(result.activeCriteria.map((item) => item.text), [
    "issue criterion",
    "The v1 plan is accepted as a legacy plan.",
    "unrelated comment item",
    "Reject reordered required sections.",
  ]);
});

test("uses createdAt and stable ID tie-breaks, never updatedAt, and retains the previous plan for a pending candidate", () => {
  const older = comment("C10", v1, "2026-01-01T00:00:00Z");
  older.updatedAt = "2026-12-31T00:00:00Z";
  const laterById = comment("C11", v1.replace("Legacy parser fixture.", "Tie-break winner."), "2026-01-01T00:00:00Z");
  laterById.updatedAt = "2025-01-01T00:00:00Z";
  const pending = comment("C12", v2, "2026-01-02T00:00:00Z");
  const result = resolveCurrentPlan({ number: 9, body: "", comments: [older, laterById, pending] });
  assert.equal(result.valid, true);
  assert.equal(result.plan.id, "C11");
  assert.ok(result.diagnostics.some((message) => message.includes("C12") && message.includes("pending")));
});

test("pending acceptance-required plans do not become legacy plans", () => {
  const issue = {
    number: 9,
    body: "- [ ] body requirement\n",
    comments: [comment("C2", v2, "2026-01-02T00:00:00Z")],
  };
  const result = resolveCurrentPlan(issue);
  assert.equal(result.valid, false);
  assert.equal(result.plan, null);
  assert.ok(result.diagnostics.some((message) => message.includes("pending without a receipt")));
});

test("valid receipt selects its exact plan and classifies accepted criteria", () => {
  const issueNumber = 9;
  const body = "- [ ] issue requirement\n";
  const plan = comment("C100", v2, "2026-02-01T00:00:00Z", issueNumber);
  const oldItem = extractTaskItems(issueNumber, "issue-body", body)[0];
  const receipt = makeReceipt(issueNumber, plan, null, [
    ["issue-body", body], [plan.id, plan.body],
  ], [{ itemId: oldItem.id, status: "retained" }]);
  const accepted = receiptComment("C200", receipt, "2026-02-02T00:00:00Z", issueNumber);
  const issue = { number: issueNumber, body, comments: [plan, accepted] };
  const result = resolveCurrentPlan(issue);
  assert.equal(result.valid, true, result.diagnostics.join("; "));
  assert.equal(result.plan.id, plan.id);
  assert.deepEqual(result.activeCriteria.map((item) => item.text), [
    "issue requirement",
    "The v2 plan is structurally valid.",
  ]);
  assert.deepEqual(result.historicalCriteria, []);
});

test("accepted replacement stays historical and successor remains active without inherited status", () => {
  const issueNumber = 9;
  const planA = comment("C101", v2, "2026-03-01T00:00:00Z", issueNumber);
  const itemA = extractTaskItems(issueNumber, planA.id, planA.body)[0];
  const receiptA = makeReceipt(issueNumber, planA, null, [[planA.id, planA.body]], []);
  const acceptedA = receiptComment("C201", receiptA, "2026-03-02T00:00:00Z", issueNumber);

  const planBBody = v2.replace("The v2 plan is structurally valid.", "The successor starts unchecked.");
  const planB = comment("C102", planBBody, "2026-03-03T00:00:00Z", issueNumber);
  const itemB = extractTaskItems(issueNumber, planB.id, planB.body)[0];
  const receiptB = makeReceipt(issueNumber, planB, acceptedA.id, [
    [planA.id, planA.body], [planB.id, planB.body],
  ], [{
    itemId: itemA.id,
    status: "replaced",
    replacementItemIds: [itemB.id],
    authorizationEvidence: "Owner explicitly approved the concrete replacement in this fixture.",
  }]);
  const acceptedB = receiptComment("C202", receiptB, "2026-03-04T00:00:00Z", issueNumber);
  const result = resolveCurrentPlan({ number: issueNumber, body: "", comments: [planA, acceptedA, planB, acceptedB] });
  assert.equal(result.valid, true, result.diagnostics.join("; "));
  assert.equal(result.plan.id, planB.id);
  assert.deepEqual(result.activeCriteria.map((item) => item.text), ["The successor starts unchecked."]);
  assert.deepEqual(result.historicalCriteria.map((item) => item.id), [itemA.id]);
  assert.equal(result.activeCriteria[0].checked, false);
  assert.equal(classifyActiveCriteria({ number: issueNumber, body: "", comments: [planA, acceptedA, planB, acceptedB] }).activeCriteria[0].checked, false);
});

test("cancellation is historical only with a reason and specific authorization evidence", () => {
  const issueNumber = 9;
  const body = "- [ ] explicitly cancelled obligation\n";
  const plan = comment("C151", v2, "2026-03-10T00:00:00Z", issueNumber);
  const prior = extractTaskItems(issueNumber, "issue-body", body)[0];
  const documents = [["issue-body", body], [plan.id, plan.body]];
  const reconciliation = [{
    itemId: prior.id,
    status: "cancelled",
    reason: "The owner withdrew this specific obligation.",
    authorizationEvidence: "Owner request: cancel the explicitly named obligation.",
  }];
  const accepted = receiptComment("C152", makeReceipt(issueNumber, plan, null, documents, reconciliation), "2026-03-11T00:00:00Z", issueNumber);
  const result = resolveCurrentPlan({ number: issueNumber, body, comments: [plan, accepted] });
  assert.equal(result.valid, true, result.diagnostics.join("; "));
  assert.ok(result.historicalCriteria.some((item) => item.id === prior.id));
  assert.ok(!result.activeCriteria.some((item) => item.id === prior.id));

  const unauthorized = receiptComment("C153", makeReceipt(issueNumber, plan, null, documents, [{
    itemId: prior.id,
    status: "cancelled",
    reason: "No authorization supplied.",
  }]), "2026-03-11T00:00:01Z", issueNumber);
  const invalid = resolveCurrentPlan({ number: issueNumber, body, comments: [plan, unauthorized] });
  assert.equal(invalid.valid, false);
});

test("rejects stale plan digest and broken/conflicting receipt chains", () => {
  const issueNumber = 9;
  const plan = comment("C300", v2, "2026-04-01T00:00:00Z", issueNumber);
  const receipt = makeReceipt(issueNumber, plan, null, [[plan.id, plan.body]], []);
  const stale = { ...receipt, planDigestSha256: "0".repeat(64) };
  const badIssue = { number: issueNumber, body: "", comments: [plan, receiptComment("C400", stale, "2026-04-02T00:00:00Z", issueNumber)] };
  assert.equal(resolveCurrentPlan(badIssue).valid, false);

  const sourceBody = "- [ ] source criterion\n";
  const sourceItem = extractTaskItems(issueNumber, "issue-body", sourceBody)[0];
  const sourceReceipt = makeReceipt(issueNumber, plan, null, [
    ["issue-body", sourceBody], [plan.id, plan.body],
  ], [{ itemId: sourceItem.id, status: "retained" }]);
  const sourceAccepted = receiptComment("C404", sourceReceipt, "2026-04-02T00:00:00Z", issueNumber);
  const drifted = resolveCurrentPlan({
    number: issueNumber,
    body: sourceBody.replace("source criterion", "edited source criterion"),
    comments: [plan, sourceAccepted],
  });
  assert.equal(drifted.valid, false);
  assert.ok(drifted.diagnostics.some((message) => /locator|inventory|active criterion/i.test(message)));

  const validIssue = { number: issueNumber, body: "", comments: [plan, receiptComment("C401", receipt, "2026-04-02T00:00:00Z", issueNumber)] };
  const branchReceipt = { ...receipt, previousAcceptanceCommentId: "C401" };
  validIssue.comments.push(receiptComment("C402", branchReceipt, "2026-04-03T00:00:00Z", issueNumber));
  validIssue.comments.push(receiptComment("C403", branchReceipt, "2026-04-03T00:00:01Z", issueNumber));
  const branched = resolveCurrentPlan(validIssue);
  assert.equal(branched.valid, false);
  assert.ok(branched.diagnostics.some((message) => /root|missing|tip/i.test(message)));
});

test("resolves explicit stage targets without fallback and omitted targets by issue number", () => {
  const stages = JSON.parse(fixture("stage-targets.json"));
  assert.equal(resolveStageTarget(23, stages).target.number, 23);
  assert.equal(resolveStageTarget(99, stages).valid, false);
  assert.match(resolveStageTarget(99, stages).error, /no fallback/);
  assert.equal(resolveStageTarget(11, stages).valid, false);
  assert.equal(resolveStageTarget(undefined, stages).target.number, 18);
});

test("adversarial scenario fixtures are inert and explicitly agent-evaluation-only", () => {
  const scenarios = JSON.parse(fixture("agent-scenarios.json"));
  assert.ok(scenarios.length >= 3);
  for (const scenario of scenarios) {
    assert.equal(scenario.kind, "agent-evaluation-only");
    assert.equal(typeof scenario.expected, "string");
  }
  for (const id of ["contextual-unique-target", "contextual-ambiguous-target",
    "contextual-invalid-target", "bare-gt-help", "compound-explicit-effects",
    "compound-dependent-failure"]) {
    assert.ok(scenarios.some((scenario) => scenario.id === id), `missing agent scenario ${id}`);
  }
  const moduleSource = readFileSync(join(root, "../../../skills/gt/lib/plan-contract.mjs"), "utf8");
  assert.match(moduleSource, /from "node:crypto"/);
  assert.doesNotMatch(moduleSource, /node:(?:fs|child_process|http|https|net)|\bfetch\s*\(/);
});

test("does not treat an unmarked Tests comment as a plan", () => {
  const result = resolveCurrentPlan({
    number: 9,
    body: "",
    comments: [comment("C9", "## Tests\n\nTest command: node --test tests/\n", "2026-05-01T00:00:00Z")],
  });
  assert.equal(result.valid, false);
  assert.equal(result.plan, null);
});

test("receipt reconciliation must account for every prior active requirement", () => {
  const issueNumber = 9;
  const body = "- [ ] previous requirement\n";
  const plan = comment("C501", v2, "2026-06-01T00:00:00Z", issueNumber);
  const receipt = makeReceipt(issueNumber, plan, null, [["issue-body", body], [plan.id, plan.body]], []);
  const accepted = receiptComment("C502", receipt, "2026-06-02T00:00:00Z", issueNumber);
  const result = resolveCurrentPlan({ number: issueNumber, body, comments: [plan, accepted] });
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((message) => message.includes("has no disposition")));
});

test("accepted plan stays selected while a later candidate is pending and its items remain visible", () => {
  const issueNumber = 9;
  const plan = comment("C601", v2, "2026-07-01T00:00:00Z", issueNumber);
  const receipt = makeReceipt(issueNumber, plan, null, [[plan.id, plan.body]], []);
  const accepted = receiptComment("C602", receipt, "2026-07-02T00:00:00Z", issueNumber);
  const pendingBody = v2.replace("The v2 plan is structurally valid.", "A later pending criterion.");
  const pending = comment("C603", pendingBody, "2026-07-03T00:00:00Z", issueNumber);
  const result = resolveCurrentPlan({ number: issueNumber, body: "", comments: [plan, accepted, pending] });
  assert.equal(result.valid, true);
  assert.equal(result.plan.id, plan.id);
  assert.ok(result.diagnostics.some((message) => message.includes("pending or invalid plan candidate")));
  assert.ok(result.activeCriteria.some((item) => item.document === pending.id && item.text === "A later pending criterion."));
});
