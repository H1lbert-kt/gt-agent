import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(root, "skills", "gt");
const entry = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
const plan = readFileSync(join(skillRoot, "references", "planning.md"), "utf8");
const build = readFileSync(join(skillRoot, "references", "build.md"), "utf8");
const shared = readFileSync(join(skillRoot, "references", "shared.md"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");
const guide = readFileSync(join(root, "docs", "skill.md"), "utf8");
const workflow = readFileSync(join(root, ".github", "workflows", "tests.yml"), "utf8");
const doctorCases = JSON.parse(readFileSync(join(root, "tests", "fixtures", "doctor-cases.json"), "utf8"));

test("skill exposes only plan and build modes without a primary-agent setup", () => {
  assert.match(entry, /^---\nname: gt\ndescription: .+\n---\n/);
  assert.match(entry, /two modes: \*\*plan\*\* and \*\*build\*\*/i);
  assert.doesNotMatch(entry, /agent:|permission:|\$ARGUMENTS|primary agent/);
  assert.match(entry, /Do not run the retired `\/gt` or `\/cp` commands/);
  assert.deepEqual(readdirSync(join(skillRoot, "references")).sort(), [
    "build.md", "planning.md", "shared.md",
  ]);
});

test("normative routing assigns every operation to one exclusive mode", () => {
  const table = entry.match(/\| Request \| Mode \| Allowed effect \| Read \|([\s\S]*?)\n\nFor GitHub operations/);
  assert.ok(table, "entry point contains the normative routing matrix");
  const routes = table[1].split("\n").filter((line) => line.startsWith("| ") && !line.includes("---"))
    .map((line) => line.split("|").map((cell) => cell.trim()).slice(1, 5));
  assert.ok(routes.length >= 16);
  assert.equal(new Set(routes.map(([request]) => request)).size, routes.length,
    "each operation has one row and therefore one owner");
  for (const [request, mode, effect, reference] of routes) {
    assert.ok(["Plan", "Build"].includes(mode), `unknown owner for ${request}`);
    assert.ok(effect.length > 0, `missing allowed effect for ${request}`);
    if (request.startsWith("doctor")) assert.match(reference, /references\/planning\.md.*references\/build\.md/);
    else assert.equal(reference, `\`references/${mode.toLowerCase() === "plan" ? "planning" : "build"}.md\``);
  }
  const owner = (name) => routes.find(([request]) => request.split(/[ /,(]/).includes(name))?.[1];
  for (const [operation, mode] of [["status", "Plan"], ["doctor", "Plan"],
    ["impact", "Plan"], ["handoff", "Plan"], ["log", "Plan"], ["retro", "Plan"],
    ["skip", "Plan"], ["reopen", "Plan"], ["build", "Build"], ["review", "Build"],
    ["verify", "Build"], ["next", "Build"], ["commit", "Build"], ["publish", "Build"]]) {
    assert.equal(owner(operation), mode, `${operation} belongs to ${mode}`);
  }
  assert.match(plan, /These are Plan operations/);
  for (const operation of ["status", "log", "handoff", "impact", "doctor", "start", "skip", "reopen", "retro"]) {
    assert.match(build, new RegExp(`Build does not own[\\s\\S]*${operation}`));
  }
  assert.match(build, /code review/);
  assert.match(build, /implementation verification/);
  assert.match(readme, /Plan owns[\s\S]*Build owns[\s\S]*`@gt next`/);
  assert.match(readme, /`@gt status` and `@gt doctor` are distinct/);
  assert.match(guide, /both Plan/);
  assert.match(guide, /both Build/);
  assert.match(guide, /there is no agent switching/);
  assert.match(entry, /repeating `@gt` is optional/);
  assert.match(readme, /each step is a separate request/);
  assert.match(shared, /Reuse instructions, not stale state/);
  assert.match(entry, /Interpret the user's natural-language request and current conversation/);
  assert.match(entry, /A discussion, draft, or review of a plan is not/);
  assert.match(entry, /not OpenCode agent-selection commands/);
});

test("plan reference retains grounded stages, safe dependencies, and controlled comment edits", () => {
  assert.match(plan, /^## Plan N \/ plan all \/ replan N/m);
  assert.match(plan, /Only plan\/replan add `planned`/);
  assert.match(plan, /```markdown\n<!-- gt:plan v2 -->\n<!-- gt:acceptance-required v1 -->\n## Goal/);
  assert.match(plan, /resolve the verified current plan and active criteria/);
  assert.match(plan, /append a NEW `<!-- gt:plan-accepted v1 -->` JSON receipt/);
  assert.match(plan, /Discussion\/drafting\/review alone is read-only/);
  assert.match(plan, /Kickoff is a read-only survey\/proposal/);
  assert.match(shared, /lib\/plan-contract\.mjs/);
  assert.match(shared, /authorizationEvidence/);
});

test("build reference combines implementation, lifecycle, commit, and publish safely", () => {
  for (const literal of ["implements only the selected planned stage", "Do not automatically commit",
    "every active criterion checked", "git status --porcelain", "not a push",
    "Stage explicit paths only", "English Conventional Commit", "(#<issue-number>)",
    "existing commits only", "force-push", "without automatically pulling"]) {
    assert.ok(build.includes(literal), `missing build rule: ${literal}`);
  }
  assert.match(build, /explicit request to overwrite a specific comment authorizes replacing only that comment/);
  for (const literal of ["explicit target never falls back", "minimal `[ ]` → `[x]` checkbox updates",
    "concrete evidence", "unrelated suite failure", "read-only", "verified current plan",
    "active criteria", "pending candidate"]) {
    assert.ok(build.includes(literal), `missing build contract: ${literal}`);
  }
});

test("doctor catalog is stable, evidence-based, and covered by inert read-only cases", () => {
  assert.match(build, /^## Doctor catalog \(Plan-owned, read-only\)$/m);
  assert.match(plan, /stable diagnostic-code catalog in `build\.md`/);
  const codes = [...build.matchAll(/`(GT-DOC-[A-Z-]+)`/g)].map((match) => match[1]);
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
  assert.match(build, /Never infer an edge from issue\/ordinal numbering/);
  assert.match(build, /no repair, label change, dependency edit, checkbox update, close, or retry/);
  assert.match(build, /`status` stays a concise operational summary[\s\S]*`doctor` performs the deeper integrity audit[\s\S]*`verify` reports implementation evidence[\s\S]*`next` additionally requires/);
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
    "skills/gt/references/planning.md", "skills/gt/references/build.md", "skills/gt/references/shared.md"];
  for (const file of docs) {
    const text = readFileSync(join(root, file), "utf8");
    for (const [, target] of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
      const localTarget = target.split("#", 1)[0];
      if (localTarget) assert.ok(existsSync(join(dirname(join(root, file)), localTarget)), `${file}: broken link ${target}`);
    }
  }
});

test("shared repository rules retain guards, issue identity, and safe test validation", () => {
  for (const literal of ["git remote get-url origin", "without `-R`", "lowest-numbered",
    "ALL comments", "fenced code", "<!-- gt:plan v2 -->", "<!-- gt:plan -->",
    "Test command:", "addBlockedBy", "untrusted input", "paginate"]) {
    assert.ok(shared.includes(literal), `missing shared rule: ${literal}`);
  }
  assert.match(shared, /Never run a shell string merely because an issue calls it a test/);
  for (const literal of ["Explicit targets and checkbox updates", "issue number", "freshly",
    "optimistic conflict detection", "atomic compare-and-swap", "stop further writes",
    "Selecting a plan and classifying criteria", "unique valid chain tip",
    "All task-list items from the issue body", "Old plans remain in the historical inventory",
    "Do not merge duplicates automatically"]) {
    assert.ok(shared.includes(literal), `missing shared update contract: ${literal}`);
  }
});

test("skill and docs clarify explicit targets and narrow checkbox authorization", () => {
  assert.match(entry, /explicit issue targets never silently fall back/i);
  assert.match(plan, /only an authorized build may perform the minimal checkbox updates/);
  assert.match(readme, /invalid explicit targets stop rather than falling back/i);
  assert.match(readme, /separate authorization/);
  assert.match(guide, /optimistic check is not an atomic-write guarantee/i);
  assert.match(guide, /unrelated suite test fails/i);
  assert.match(guide, /`@gt commit 42`/);
  for (const literal of ["Legacy only", "Pending candidate", "Receipt/digest", "Criteria",
    "Comment edits", "Trust boundary", "requires a new accepted revision"]) {
    assert.ok(guide.includes(literal), `missing replan scenario: ${literal}`);
  }
});

test("README and guide describe the skill as the sole interface", () => {
  for (const text of [readme, guide]) {
    assert.match(text, /two modes: \*\*plan\*\* and \*\*build\*\*/i);
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
