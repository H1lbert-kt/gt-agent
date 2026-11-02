import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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

test("skill exposes only plan and build modes without a primary-agent setup", () => {
  assert.match(entry, /^---\nname: gt\ndescription: .+\n---\n/);
  assert.match(entry, /two modes: \*\*plan\*\* and \*\*build\*\*/);
  assert.doesNotMatch(entry, /agent:|permission:|\$ARGUMENTS|primary agent/);
  assert.match(entry, /Do not run the retired `\/gt` or `\/cp` commands/);
  assert.deepEqual(readdirSync(join(skillRoot, "references")).sort(), [
    "build.md", "planning.md", "shared.md",
  ]);
});

test("plan reference retains grounded stages, safe dependencies, and controlled comment edits", () => {
  assert.match(plan, /^## Plan N \/ plan all \/ replan N/m);
  assert.match(plan, /Only plan\/replan add `planned`/);
  assert.match(plan, /```markdown\n<!-- gt:plan v2 -->\n<!-- gt:acceptance-required v1 -->\n## Goal/);
  assert.match(plan, /resolve the verified current plan and active criteria/);
  assert.match(plan, /append a NEW `<!-- gt:plan-accepted v1 -->` JSON receipt/);
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
    assert.match(text, /two modes: \*\*plan\*\* and \*\*build\*\*/);
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
    assert.match(text, /unique/i);
    assert.match(text, /skills documentation|Agent Skills documentation/i);
  }
  assert.match(readme, /--confirm-external/);
  assert.match(readme, /`check` is read-only/);
  assert.match(guide, /Node\.js 20 or newer/);
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
