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

function v3PlanComment(id, body, createdAt, issueNumber = 9) {
  const v3 = body.replace("<!-- gt:plan v2 -->\n<!-- gt:acceptance-required v1 -->", "<!-- gt:plan v3 -->\n");
  const explicit = v3.replace("- [ ] The v2 plan is structurally valid.", "- [ ] [criterion:core] The v3 plan is structurally valid.");
  return comment(id, explicit, createdAt, issueNumber);
}

function publicationComment(id, plan, previousPublicationCommentId, transitions, createdAt, issueNumber = 9, legacyRecovery) {
  const criteria = [...plan.body.matchAll(/^\s*[-*]\s+\[([ xX])\]\s+\[criterion:([a-z0-9][a-z0-9._-]{0,63})\]\s+(.+?)\s*$/gim)]
    .map(([, , criterionId, text]) => ({
      id: criterionId.toLowerCase(),
      text: text.trim(),
      digestSha256: createHash("sha256").update(text.trim(), "utf8").digest("hex"),
    }));
  const record = {
    schema: "gt-plan-publication/v2",
    issueNumber,
    planCommentId: plan.id,
    planUrl: plan.url,
    planDigestSha256: digestText(plan.body),
    previousPublicationCommentId,
    criteria,
    transitions,
  };
  if (legacyRecovery) record.legacyRecovery = legacyRecovery;
  return comment(id, `<!-- gt:plan-published v2 -->\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\``, createdAt, issueNumber);
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

test("v3 plans require explicit uniquely identified criteria, not incidental checklists", () => {
  const v3 = v3PlanComment("C31", v2, "2026-01-01T00:00:00Z");
  const parsed = parsePlanComment(v3);
  assert.equal(parsed.valid, true, parsed.diagnostics.join("; "));
  assert.equal(parsed.version, 3);
  assert.equal(parsed.requiresPublication, true);
  assert.equal(parsePlanComment(v3.body.replace("[criterion:core]", "[criterion:Core]")).valid, true);
  assert.equal(parsePlanComment(v3.body.replace("[criterion:core]", "[criterion:bad id]")).valid, false);
  assert.equal(parsePlanComment(v3.body.replace("[criterion:core]", "[criterion:other]\n- [ ] [criterion:other]")).valid, false);
  assert.equal(parsePlanComment(v3.body.replace("[criterion:core] ", "")).valid, false);
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

test("v3 accepts concise and complete semantic formats independent of order", () => {
  const concise = parsePlanComment(fixture("plan-v3-concise.md"));
  const complete = parsePlanComment(fixture("plan-v3-complete.md"));
  assert.equal(concise.valid, true, concise.diagnostics.join("; "));
  assert.equal(complete.valid, true, complete.diagnostics.join("; "));
  assert.equal(concise.version, 3);
  assert.equal(complete.version, 3);

  const withExtraSubsections = fixture("plan-v3-concise.md")
    .replace("## Boundaries", "## Notes\nOptional context.\n### Further detail\nNested content.\n## Boundaries")
    .replace("## Steps", "## Scope\nA second, ambiguous scope section.\n## Steps");
  assert.equal(parsePlanComment(withExtraSubsections).valid, false);
  assert.match(parsePlanComment(withExtraSubsections).diagnostics.join(" "), /exactly one unambiguous scope/);
});

test("v3 still requires unambiguous semantic sections, a test command, and explicit criterion tasks", () => {
  const concise = fixture("plan-v3-concise.md");
  const missingGoal = parsePlanComment(concise.replace("## Objective", "## Context"));
  assert.equal(missingGoal.valid, false);
  assert.match(missingGoal.diagnostics.join(" "), /unambiguous goal section/);

  const emptyScope = parsePlanComment(concise.replace("Only the local parser and its fixtures.", "TODO"));
  assert.equal(emptyScope.valid, false);
  assert.match(emptyScope.diagnostics.join(" "), /scope section has empty or placeholder content/);

  const emptyCommand = parsePlanComment(concise.replace("Test command: node --test tests/", "Test command:"));
  assert.equal(emptyCommand.valid, false);
  assert.match(emptyCommand.diagnostics.join(" "), /non-empty Test command/);

  const invalidCriterion = parsePlanComment(concise.replace("[criterion:concise-parser] ", ""));
  assert.equal(invalidCriterion.valid, false);
  assert.match(invalidCriterion.diagnostics.join(" "), /explicit \[criterion:<id>\]/);
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

test("v3 pending candidate does not replace the current legacy plan or activate its checklist", () => {
  const legacy = comment("C32", v1, "2026-01-01T00:00:00Z");
  const pending = v3PlanComment("C33", v2, "2026-01-02T00:00:00Z");
  const issue = { number: 9, body: "", comments: [legacy, pending] };
  const result = resolveCurrentPlan(issue);
  assert.equal(result.valid, true);
  assert.equal(result.plan.id, legacy.id);
  assert.ok(result.diagnostics.some((message) => message.includes("v3 plan is pending")));
  assert.ok(!result.activeCriteria.some((item) => item.document === pending.id));
});

test("v3 publication selects declared criteria and ignores incidental task lists", () => {
  const issueNumber = 9;
  const body = "- [ ] incidental issue checklist\n";
  const plan = v3PlanComment("C34", v2, "2026-01-01T00:00:00Z", issueNumber);
  const publication = publicationComment("C35", plan, null, [], "2026-01-02T00:00:00Z", issueNumber);
  const pending = resolveCurrentPlan({ number: issueNumber, body, comments: [plan] });
  assert.equal(pending.valid, false);
  assert.ok(pending.diagnostics.some((message) => message.includes("pending")));
  const result = resolveCurrentPlan({ number: issueNumber, body, comments: [plan, publication] });
  assert.equal(result.valid, true, result.diagnostics.join("; "));
  assert.equal(result.plan.id, plan.id);
  assert.equal(result.publication.id, publication.id);
  assert.deepEqual(result.activeCriteria.map((item) => [item.id, item.text, item.checked]), [
    ["core", "The v3 plan is structurally valid.", false],
  ]);
  assert.equal(result.activeCriteria.some((item) => item.text.includes("incidental")), false);
});

test("v3 revisions preserve stable criterion identity across unrelated edits and reject changed text", () => {
  const issueNumber = 9;
  const planASeed = v3PlanComment("C36", v2, "2026-01-01T00:00:00Z", issueNumber);
  const coreLine = "- [ ] [criterion:core] The v3 plan is structurally valid.";
  const planABody = planASeed.body.replace(coreLine, `${coreLine}\n- [ ] [criterion:extra] A second independent criterion.`);
  const planA = comment("C36", planABody, "2026-01-01T00:00:00Z", issueNumber);
  const publicationA = publicationComment("C37", planA, null, [], "2026-01-02T00:00:00Z", issueNumber);
  const changedOutsideCriterion = planA.body
    .replace("A deterministic parser fixture.", "An edited non-criterion plan detail.")
    .replace(`${coreLine}\n- [ ] [criterion:extra] A second independent criterion.`,
      `- [ ] [criterion:extra] A second independent criterion.\n${coreLine}`);
  const planB = comment("C38", changedOutsideCriterion, "2026-01-03T00:00:00Z", issueNumber);
  const publicationB = publicationComment("C39", planB, publicationA.id, [
    { id: "core", status: "retained" },
    { id: "extra", status: "retained" },
  ], "2026-01-04T00:00:00Z", issueNumber);
  const good = resolveCurrentPlan({ number: issueNumber, body: "", comments: [planA, publicationA, planB, publicationB] });
  assert.equal(good.valid, true, good.diagnostics.join("; "));
  assert.deepEqual(good.activeCriteria.map((item) => item.id), ["extra", "core"]);
  assert.equal(good.activeCriteria[1].text, "The v3 plan is structurally valid.");

  const alteredCriterion = planB.body.replace("The v3 plan is structurally valid.", "Changed criterion text.");
  const planC = comment("C40", alteredCriterion, "2026-01-05T00:00:00Z", issueNumber);
  const publicationC = publicationComment("C41", planC, publicationB.id, [
    { id: "core", status: "retained" },
    { id: "extra", status: "retained" },
  ], "2026-01-06T00:00:00Z", issueNumber);
  const bad = resolveCurrentPlan({
    number: issueNumber, body: "", comments: [planA, publicationA, planB, publicationB, planC, publicationC],
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.diagnostics.some((message) => message.includes("Retained criterion changed")));
});

test("v3 authorized replacement records history and does not inherit completion", () => {
  const issueNumber = 9;
  const planA = v3PlanComment("C47", v2, "2026-01-01T00:00:00Z", issueNumber);
  const completedA = comment("C48", planA.body.replace("[ ] [criterion:core]", "[x] [criterion:core]"),
    "2026-01-02T00:00:00Z", issueNumber);
  const publicationA = publicationComment("C49", completedA, null, [], "2026-01-03T00:00:00Z", issueNumber);
  const planB = comment("C50", completedA.body.replace("[x] [criterion:core] The v3 plan is structurally valid.",
    "[ ] [criterion:successor] The replacement criterion is verifiable."), "2026-01-04T00:00:00Z", issueNumber);
  const transition = {
    id: "core", status: "replaced", replacementIds: ["successor"],
    authorizationEvidence: "Owner explicitly authorized this named replacement in the active request.",
  };
  const publicationB = publicationComment("C51", planB, publicationA.id, [transition], "2026-01-05T00:00:00Z", issueNumber);
  const result = resolveCurrentPlan({ number: issueNumber, body: "", comments: [completedA, publicationA, planB, publicationB] });
  assert.equal(result.valid, true, result.diagnostics.join("; "));
  assert.deepEqual(result.activeCriteria.map((item) => [item.id, item.checked]), [["successor", false]]);
  assert.deepEqual(result.historicalCriteria.map((item) => [item.id, item.checked]), [["core", true]]);

  const unauthorized = publicationComment("C52", planB, publicationA.id, [{
    ...transition, authorizationEvidence: "",
  }], "2026-01-05T00:00:01Z", issueNumber);
  const invalid = resolveCurrentPlan({ number: issueNumber, body: "", comments: [completedA, publicationA, planB, unauthorized] });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.diagnostics.some((message) => message.includes("Replacement transition is incomplete or unauthorized")));
});

test("v3 cancellation requires specific authorization and records the cancelled criterion", () => {
  const issueNumber = 9;
  const planASeed = v3PlanComment("C53", v2, "2026-01-01T00:00:00Z", issueNumber);
  const core = "- [ ] [criterion:core] The v3 plan is structurally valid.";
  const planA = comment("C53", planASeed.body.replace(core, `${core}\n- [ ] [criterion:obsolete] An obsolete obligation.`),
    "2026-01-01T00:00:00Z", issueNumber);
  const publicationA = publicationComment("C54", planA, null, [], "2026-01-02T00:00:00Z", issueNumber);
  const planB = comment("C55", planA.body.replace("\n- [ ] [criterion:obsolete] An obsolete obligation.", ""),
    "2026-01-03T00:00:00Z", issueNumber);
  const transitions = [
    { id: "core", status: "retained" },
    { id: "obsolete", status: "cancelled", reason: "Owner withdrew this specific obligation.",
      authorizationEvidence: "Owner explicitly authorized cancellation in the active request." },
  ];
  const publicationB = publicationComment("C56", planB, publicationA.id, transitions, "2026-01-04T00:00:00Z", issueNumber);
  const result = resolveCurrentPlan({ number: issueNumber, body: "", comments: [planA, publicationA, planB, publicationB] });
  assert.equal(result.valid, true, result.diagnostics.join("; "));
  assert.deepEqual(result.activeCriteria.map((item) => item.id), ["core"]);
  assert.deepEqual(result.historicalCriteria.map((item) => item.id), ["obsolete"]);

  const invalidPublication = publicationComment("C57", planB, publicationA.id, [
    transitions[0], { ...transitions[1], reason: "", authorizationEvidence: "" },
  ], "2026-01-04T00:00:01Z", issueNumber);
  const invalid = resolveCurrentPlan({ number: issueNumber, body: "", comments: [planA, publicationA, planB, invalidPublication] });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.diagnostics.some((message) => message.includes("Cancellation transition is incomplete or unauthorized")));
});

test("v3 publication branches block selection; legacy transitions require explicit recovery; candidates stay pending", () => {
  const issueNumber = 9;
  const plan = v3PlanComment("C42", v2, "2026-01-01T00:00:00Z", issueNumber);
  const first = publicationComment("C43", plan, null, [], "2026-01-02T00:00:00Z", issueNumber);
  const branch = publicationComment("C44", plan, first.id, [], "2026-01-03T00:00:00Z", issueNumber);
  const branch2 = publicationComment("C46", plan, first.id, [], "2026-01-03T00:00:01Z", issueNumber);
  const branched = resolveCurrentPlan({ number: issueNumber, body: "", comments: [plan, first, branch, branch2] });
  assert.equal(branched.valid, false);
  assert.ok(branched.diagnostics.some((message) => /branch|tip/i.test(message)));

  const legacy = comment("C45", v1, "2025-12-31T00:00:00Z", issueNumber);
  const mixed = resolveCurrentPlan({ number: issueNumber, body: "", comments: [legacy, plan, first] });
  assert.equal(mixed.valid, false);
  assert.ok(mixed.diagnostics.some((message) => message.includes("Explicit legacy recovery")));

  const oldItem = extractTaskItems(issueNumber, legacy.id, legacy.body)[0];
  const recovery = {
    planCommentId: legacy.id,
    planDigestSha256: digestText(legacy.body),
    authorizationEvidence: "Owner explicitly authorized this one-time legacy criteria reconciliation.",
    mappings: [{
      legacyItemId: oldItem.id,
      status: "replaced",
      replacementIds: ["core"],
      authorizationEvidence: "Owner authorized mapping this legacy obligation to the named v3 criterion.",
    }],
  };
  const recoveredPublication = publicationComment("C58", plan, null, [], "2026-01-02T00:00:02Z", issueNumber, recovery);
  const recovered = resolveCurrentPlan({ number: issueNumber, body: "", comments: [legacy, plan, recoveredPublication] });
  assert.equal(recovered.valid, true, recovered.diagnostics.join("; "));
  assert.equal(recovered.plan.id, plan.id);
  assert.equal(recovered.activeCriteria[0].id, "core");
  assert.deepEqual(recovered.historicalCriteria.map((item) => item.id), [oldItem.id]);

  const partial = resolveCurrentPlan({ number: issueNumber, body: "", comments: [plan] });
  assert.equal(partial.valid, false);
  assert.ok(partial.diagnostics.some((message) => message.includes("pending")));
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
    "compound-dependent-failure", "decision-evidence-insufficient", "partial-commit-push",
    "concise-test-summary"]) {
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
