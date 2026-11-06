import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(root, "skills", "gt");
const entry = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
const plan = readFileSync(join(skillRoot, "references", "planning.md"), "utf8");
const execution = readFileSync(join(skillRoot, "references", "execution.md"), "utf8");
const shared = readFileSync(join(skillRoot, "references", "shared.md"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");
const guide = readFileSync(join(root, "docs", "skill.md"), "utf8");
const workflow = readFileSync(join(root, ".github", "workflows", "tests.yml"), "utf8");
const stageTemplate = readFileSync(join(root, ".github", "ISSUE_TEMPLATE", "stage.md"), "utf8");
const taxonomy = readFileSync(join(skillRoot, "references", "issue-taxonomy.md"), "utf8");
const doctorCases = JSON.parse(readFileSync(join(root, "tests", "fixtures", "doctor-cases.json"), "utf8"));

test("skill defines a workflow without managing modes or agents", () => {
  assert.match(entry, /^---\nname: gt\ndescription: .+\n---\n/);
  assert.match(entry, /workflow through operations, not modes/);
  assert.match(entry, /GT does not define agent modes or select\/switch agents/);
  assert.match(entry, /Operations run under the active agent's permissions/);
  assert.match(entry, /If a requested operation is unavailable, explain the limitation and stop that operation/);
  assert.match(entry, /Do not delegate work to another agent/);
  assert.doesNotMatch(entry, /agent:|permission:|\$ARGUMENTS|primary agent/);
  assert.match(entry, /Do not run the retired `\/gt` or `\/cp` commands/);
  assert.deepEqual(readdirSync(join(skillRoot, "references")).sort(), [
    "execution.md", "issue-taxonomy.md", "planning.md", "shared.md",
  ]);
  for (const text of [entry, plan, execution, shared, readme, guide]) {
    assert.doesNotMatch(text, /two modes|\| Mode \||\b(?:Plan|Build) mode\b|\b(?:Plan|Build) owns\b|\bowning mode\b|Plan-owned|Build does not own|references\/build\.md/i);
  }
});

test("stage template and issue taxonomy stay complete, compact, and conservative", () => {
  for (const heading of ["## Pedido do responsável", "## Contexto e problema", "## Resultado esperado",
    "## Escopo incluído", "## Fora do escopo", "## Critérios de aceite", "## Classificação"]) {
    assert.ok(stageTemplate.includes(heading), `stage template is missing ${heading}`);
  }
  assert.match(stageTemplate, /^labels: stage$/m);
  assert.match(stageTemplate, /não adicione `planned` ou `skipped`/);

  const rows = taxonomy.split("\n").filter((line) => /^\| `[^`]+` \| .+ \| `?[A-Fa-f0-9]{6}/.test(line));
  const labels = rows.map((line) => line.match(/^\| `([^`]+)`/)[1]);
  assert.equal(new Set(labels).size, labels.length, "taxonomy labels are unique");
  assert.deepEqual(labels.filter((label) => label.startsWith("area:")), [
    "area:interaction", "area:planning", "area:issues", "area:relationships", "area:workflow", "area:quality",
  ]);
  assert.ok(labels.includes("bug") && labels.includes("enhancement") && labels.includes("documentation"));
  assert.ok(labels.includes("priority:p1") && labels.includes("priority:p2"));
  assert.match(taxonomy, /All area labels use the same blue family color `1D76DB`/);
  assert.match(taxonomy, /Omit unknown dimensions/);
  assert.match(taxonomy, /do not bulk-reclassify existing issues/);
  assert.match(taxonomy, /color and descriptions carry the meaning|names and descriptions carry the meaning/);
  assert.match(plan, /references\/issue-taxonomy\.md/);
  assert.match(plan, /omit unknown dimensions rather than guessing/);
  assert.match(guide, /Stage issue structure and labels/);
  assert.match(guide, /priority is omitted unless the request explicitly provides it/);
});

test("operations table preserves effects and reference contracts without mode ownership", () => {
  const table = entry.match(/\| Request \| Allowed effect \| Read \|([\s\S]*?)\n\nFor GitHub operations/);
  assert.ok(table, "entry point contains the operations table");
  const operations = table[1].split("\n").filter((line) => line.startsWith("| ") && !line.includes("---"))
    .map((line) => line.split("|").map((cell) => cell.trim()).slice(1, -1));
  const expected = [
    ["kickoff/start", "planning"],
    ["create issues/stages/dependencies", "planning"],
    ["plan/plan all/replan", "planning"],
    ["status", "planning"],
    ["doctor (planning audit)", "planning"],
    ["impact", "planning"],
    ["handoff", "planning"],
    ["log", "planning"],
    ["retro", "planning"],
    ["skip", "planning"],
    ["reopen", "planning"],
    ["build/implement", "execution"],
    ["code review", "execution"],
    ["verify implementation", "execution"],
    ["next/normal close", "execution"],
    ["owner-requested close", "execution"],
    ["commit", "execution"],
    ["publish", "execution"],
  ];
  assert.deepEqual(operations.map(([request]) => request), expected.map(([request]) => request));
  for (const [request, effect, reference, ...extra] of operations) {
    assert.deepEqual(extra, [], "operations have no mode column");
    assert.ok(effect.length > 0, `missing allowed effect for ${request}`);
    const referenceName = expected.find(([name]) => name === request)[1];
    assert.equal(reference, `\`references/${referenceName}.md\``);
    assert.ok(existsSync(join(skillRoot, "references", `${referenceName}.md`)));
  }
  const effectOf = (request) => operations.find(([name]) => name === request)?.[1];
  for (const request of ["status", "doctor (planning audit)", "impact", "log", "code review", "verify implementation"]) {
    assert.match(effectOf(request), /Read-only/, `${request} stays read-only`);
  }
  assert.match(effectOf("handoff"), /conversation only/);
  for (const request of ["create issues/stages/dependencies", "retro", "skip", "reopen", "commit", "publish"]) {
    assert.match(effectOf(request), /explicit/i, `${request} retains explicit authorization`);
  }
  assert.match(effectOf("next/normal close"), /Gate-check and close one eligible stage/);
  assert.match(effectOf("build/implement"), /selected planned scope/);
  assert.match(entry, /not an automatic sequence: perform only the requested operation/);
  assert.match(entry, /Commit and publish require their own explicit authorization/);
  assert.match(entry, /Never close, plan, commit, or publish as a side effect of another operation/);
  assert.match(plan, /Reports may be requested whenever relevant, including during implementation/);
  assert.match(execution, /Reports and planning operations remain available under their own contracts/);
  assert.match(execution, /no mode or agent change is required by GT/);
  assert.match(execution, /code review/);
  assert.match(execution, /implementation verification/);
  assert.match(readme, /`@gt status` and `@gt doctor` are distinct/);
  for (const text of [readme, guide]) {
    assert.match(text, /Reports[\s\S]*including during implementation/);
    assert.match(text, /does not select or switch agents/);
  }
  assert.match(entry, /repeating `@gt` is optional/);
  assert.match(readme, /each operation remains separately authorized unless the user explicitly requests a combined planning operation/);
  assert.match(shared, /Reuse instructions, not stale state/);
  assert.match(entry, /Interpret the user's natural-language request and current conversation/);
  assert.match(entry, /A discussion, draft, or review of a plan is not/);
  assert.match(entry, /Resolve targets in this order: an explicit issue number, a unique contextual/);
  assert.match(entry, /Context identifies what the user means; it never grants/);
  assert.match(entry, /A bare `@gt` asks for concise, contextual help/);
  assert.match(entry, /For a compound request, identify the requested operations and their order/);
});

test("plan reference retains grounded stages, safe dependencies, and controlled comment edits", () => {
  assert.match(plan, /^## Plan N \/ plan all \/ replan N/m);
  assert.match(plan, /Only plan\/replan add `planned`/);
  assert.match(plan, /```markdown\n<!-- gt:plan v3 -->\n## Objective/);
  assert.match(plan, /\[criterion:<stable-id>\]/);
  assert.match(plan, /resolve the verified current plan and active criteria/);
  assert.match(plan, /append a NEW `<!-- gt:plan-published v2 -->` record/);
  assert.match(shared, /not human approval, authorship, signature, or authorization/);
  assert.match(plan, /Discussion\/drafting\/review alone is read-only/);
  assert.match(plan, /Kickoff is a read-only, proportional survey\/proposal/);
  assert.match(plan, /Adaptive discovery and `grill-me`/);
  assert.match(plan, /When the owner explicitly says “grill-me”, “grill me”, or asks to be interviewed/);
  assert.match(plan, /Ask independent frontier questions together/);
  assert.match(plan, /one issue per coherent deliverable/);
  assert.match(plan, /single explicit request to create issue\(s\) and publish the associated plan authorizes those constituent planning writes/);
  assert.match(plan, /Scale analysis and prose to complexity, uncertainty, and impact/);
  assert.match(plan, /V3 plans do not require one exact template or heading order/);
  assert.match(plan, /complete plan can add `## Diagnostic evidence`/);
  assert.match(readme, /Plans are proportional to risk/);
  assert.match(guide, /concise objective\/scope\/implementation\/validation\/acceptance content/);
  assert.match(plan, /Do not pause for redundant confirmation between these steps/);
  assert.match(plan, /does not authorize implementation, commit, push, or closure/);
  assert.match(plan, /implementation requires a separate requested operation under `execution\.md`/);
  assert.doesNotMatch(plan, /implementation is outside this skill/);
  assert.match(shared, /lib\/plan-contract\.mjs/);
  assert.match(shared, /authorizationEvidence/);
});

test("execution reference preserves implementation, lifecycle, commit, and publish gates", () => {
  for (const literal of ["implements only the selected planned stage", "Do not automatically commit",
    "every active criterion checked", "git status --porcelain", "not a push",
    "Stage explicit paths only", "English Conventional Commit", "(#<issue-number>)",
    "existing commits only", "force-push", "without automatically pulling"]) {
    assert.ok(execution.includes(literal), `missing execution rule: ${literal}`);
  }
  assert.match(execution, /explicit request to overwrite a specific comment authorizes replacing only that comment/);
  for (const literal of ["An explicit or contextual target never falls back", "minimal `[ ]` → `[x]` checkbox updates",
    "concrete evidence", "unrelated suite failure", "read-only", "verified current plan",
    "active criteria", "pending candidate"]) {
    assert.ok(execution.includes(literal), `missing execution contract: ${literal}`);
  }
});

test("doctor catalog is stable, evidence-based, and covered by inert read-only cases", () => {
  assert.match(plan, /^## Doctor catalog \(read-only\)$/m);
  assert.match(plan, /stable diagnostic-code catalog below/);
  const codes = [...plan.matchAll(/`(GT-DOC-[A-Z-]+)`/g)].map((match) => match[1]);
  assert.equal(new Set(codes).size, codes.length, "catalog codes are unique");
  assert.ok(codes.length >= 10);
  assert.equal(new Set(doctorCases.map(({ code }) => code)).size, doctorCases.length);
  for (const item of doctorCases) {
    assert.ok(codes.includes(item.code), `fixture references undocumented code ${item.code}`);
    assert.ok(["error", "warning", "info"].includes(item.severity));
    assert.equal(item.readOnly, true);
    assert.ok(item.evidence.length > 0);
  }
  for (const code of codes) {
    assert.ok(doctorCases.some((item) => item.code === code), `catalog code lacks fixture: ${code}`);
  }
  assert.match(plan, /Never infer an edge from issue\/ordinal numbering/);
  assert.match(plan, /no repair, label change, dependency edit, checkbox update, close, or retry/);
  assert.match(plan, /`status` stays a concise operational summary[\s\S]*`doctor` performs the deeper integrity audit[\s\S]*`verify` reports implementation evidence[\s\S]*`next` additionally requires/);
});

test("CI uses supported Node 22 with read-only permissions and no credentials", () => {
  assert.match(workflow, /^on:\n  push:\n  pull_request:/m);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /run: node --test tests\//);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /secrets\.|issues:\s*write|contents:\s*write|gh issue|git push/i);
  for (const text of [readme, guide]) assert.match(text, /Node\.js 22 or newer/);
  assert.match(readme, /offline CI runs `node --test tests\/` on Node\.js 22/);
});

test("local Markdown links in maintained docs resolve within the repository", () => {
  const docs = ["README.md", "docs/skill.md", "skills/gt/SKILL.md",
    "skills/gt/references/planning.md", "skills/gt/references/execution.md", "skills/gt/references/shared.md",
    "skills/gt/references/issue-taxonomy.md"];
  for (const file of docs) {
    const text = readFileSync(join(root, file), "utf8");
    for (const [, target] of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
      const localTarget = target.split("#", 1)[0];
      if (localTarget) assert.ok(existsSync(join(dirname(join(root, file)), localTarget)), `${file}: broken link ${target}`);
    }
  }
});

test("the documented directory test command loads every suite", () => {
  const testEntry = readFileSync(join(root, "tests", "index.js"), "utf8");
  for (const file of ["plan-contract.test.mjs", "relationship-graph.test.mjs", "skill-bundle.test.mjs", "skill.test.mjs"]) {
    assert.ok(testEntry.includes(`./${file}`), `test directory entry is missing ${file}`);
  }
});

test("relationship contract documents distinct edge types, uncertainty, and API boundaries", () => {
  const graph = readFileSync(join(root, "skills", "gt", "lib", "relationship-graph.mjs"), "utf8");
  assert.match(graph, /export function analyzeRelationshipGraph/);
  assert.match(graph, /RELATION_CYCLE/);
  assert.match(graph, /HIERARCHY_CONFLICT/);
  assert.match(graph, /RELATION_TARGET_UNKNOWN/);
  assert.match(graph, /blockerState/);
  assert.match(shared, /parent\/sub-issue data is separate/);
  assert.match(shared, /Hierarchy mutations are not enabled by this skill/);
  assert.match(guide, /Parent\/sub-issue edges represent grouping/);
  assert.match(guide, /installed `gh issue` command exposes no hierarchy subcommand/);
  assert.match(guide, /triage|permission/i);
  assert.match(guide, /sub-issues API/);
  assert.match(guide, /issue-dependencies API/);
  assert.match(guide, /`Issues: read`/);
  assert.match(guide, /`Issues: write`/);
  assert.match(plan, /verified blockers, relationship completeness\/unknown state/);
  assert.match(plan, /GT-DOC-RELATIONSHIP-INVALID/);
  assert.match(plan, /GT-DOC-RELATIONSHIP-UNKNOWN/);
  assert.match(readme, /relationship snapshots offline|hierarchy\/dependency snapshots offline/);
});

test("shared repository rules retain guards, issue identity, and safe test validation", () => {
  for (const literal of ["git remote get-url origin", "without `-R`", "lowest-numbered",
    "ALL comments", "fenced code", "<!-- gt:plan v2 -->", "<!-- gt:plan -->",
    "Test command:", "addBlockedBy", "untrusted input", "paginate"]) {
    assert.ok(shared.includes(literal), `missing shared rule: ${literal}`);
  }
  assert.match(shared, /Never run a shell string merely because an issue calls it a test/);
  assert.match(shared, /a unique contextual reference in the active conversation may identify it/);
  assert.match(shared, /Contextual references must have one unambiguous referent/);
  assert.match(shared, /If an explicit or contextual target is invalid, stop without silently falling back/);
  for (const literal of ["Explicit targets and checkbox updates", "issue number", "freshly",
    "optimistic conflict detection", "atomic compare-and-swap", "stop further writes",
    "Selecting a plan and classifying criteria", "unique valid chain tip",
    "All task-list items from the issue body", "Old plans remain in the historical inventory",
    "Do not merge duplicates automatically"]) {
    assert.ok(shared.includes(literal), `missing shared update contract: ${literal}`);
  }
});

test("context, ambiguity, and compound requests keep target resolution separate from authorization", () => {
  assert.match(entry, /A bare `@gt` asks for concise, contextual help/);
  assert.match(entry, /does\s+not select an operation, propose a write as already authorized/);
  assert.match(entry, /Context identifies what the user means; it never grants[\s\S]*authorization/);
  assert.match(entry, /If context points to multiple or no unique issues, ask/);
  assert.match(entry, /If a failed operation blocks a\s+dependent requested operation, stop/);
  assert.match(shared, /explicit issue number first[\s\S]*unique contextual reference[\s\S]*documented default/);
  assert.match(execution, /invalid explicit or contextual target stops without fallback/);
  assert.match(readme, /A bare `@gt` gives contextual read-only help/);
  assert.match(readme, /Context can identify a target but never carries authorization/);
  assert.match(guide, /A bare `@gt` offers contextual read-only help/);
  assert.match(guide, /If multiple issues could be meant, ask/);
});

test("skill and docs clarify explicit targets and narrow checkbox authorization", () => {
  assert.match(entry, /Explicit or contextual issue targets never silently fall back/i);
  assert.match(plan, /only an authorized build may perform the minimal checkbox updates/);
  assert.match(readme, /Ambiguous or invalid targets stop without fallback/i);
  assert.match(readme, /separate authorization/);
  assert.match(guide, /optimistic check is not an atomic-write guarantee/i);
  assert.match(guide, /unrelated suite test fails/i);
  assert.match(guide, /`@gt commit 42`/);
  for (const literal of ["Legacy:", "Pending candidate", "Publication and digest", "Stable criteria",
    "Recovery:", "Trust boundary"]) {
    assert.ok(guide.includes(literal), `missing replan scenario: ${literal}`);
  }
});

test("README and guide describe the skill as the sole interface", () => {
  for (const text of [readme, guide]) {
    assert.match(text, /workflow[\s\S]*operations, not modes/);
    assert.match(text, /active agent's permissions/);
  }
  assert.match(readme, /a commit never implies publish/i);
  assert.match(guide, /former `\/gt` command, `\/cp` command/);
  assert.match(readme, /node scripts\/gt-skill\.mjs sync \.opencode\/skills\/gt --apply/);
  assert.match(guide, /node --test tests\//);
  assert.match(readme, /plan-contract\.mjs/);
  assert.match(guide, /agent-evaluation-only/);
  assert.match(guide, /no GitHub, network, filesystem, or shell side effects/);
});

test("bundle installation docs define read-only checks, explicit external sync, and unique skill IDs", () => {
  for (const text of [readme, guide]) {
    assert.match(text, /canonical, versioned source|canonical versioned source/i);
    assert.match(text, /gt-skill\.mjs/);
    assert.match(text, /\.gt-backups/);
    assert.match(text, /unique|duplicate/i);
    assert.match(text, /skills documentation|Agent Skills documentation/i);
  }
  assert.match(readme, /--confirm-external/);
  assert.match(readme, /`check` is read-only/);
  assert.match(guide, /Node\.js 22 or newer/);
  for (const text of [readme, guide]) {
    assert.match(text, /opencode\.ai\/v2\/docs\/skills/);
    assert.doesNotMatch(text, /opencode\.ai\/docs\/skills/);
  }
});

test("retired command, agent, and historical documentation artifacts are absent", () => {
  for (const path of ["agents/gt.md", "commands/gt.md", "commands/cp.md",
    "docs/usage.md", "docs/example.md", "docs/faq.md", "docs/safety.md"]) {
    assert.throws(() => readFileSync(join(root, path)), { code: "ENOENT" });
  }
  for (const path of ["cp.test.mjs", "example.test.mjs", "faq.test.mjs",
    "readme.test.mjs", "safety.test.mjs", "scaffold.test.mjs", "usage.test.mjs"]) {
    assert.ok(!readdirSync(join(root, "tests")).includes(path));
  }
});
