import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createManifest, inspectBundle, syncBundle } from "../scripts/gt-skill.mjs";

const temporaryRoots = [];

async function makeSandbox() {
  const root = await mkdtemp(join(tmpdir(), "gt-skill-bundle-"));
  temporaryRoots.push(root);
  const repo = join(root, "repo");
  const source = join(repo, "skills", "gt");
  await mkdir(join(source, "references"), { recursive: true });
  await mkdir(repo, { recursive: true });
  await writeFile(join(source, "SKILL.md"), "name: gt\n");
  await writeFile(join(source, "references", "shared.md"), "rules\n");
  await writeFile(join(source, ".hidden"), "included\n");
  return { root, repo, source };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("manifest is deterministic and covers hidden and nested bundle files", async () => {
  const { source } = await makeSandbox();
  const first = await createManifest(source);
  const second = await createManifest(source);

  assert.equal(first.schema, "gt-skill-manifest/v1");
  assert.equal(first.digestSha256, second.digestSha256);
  assert.deepEqual(first.files.map(({ path }) => path), [".hidden", "SKILL.md", "references/shared.md"]);
  assert.ok(first.files.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)));
});

test("inspection distinguishes absent, equal, and divergent bundles without writing", async () => {
  const { repo, source } = await makeSandbox();
  const target = join(repo, ".opencode", "skills", "gt");
  const absent = await inspectBundle({ source, target, repo });
  assert.equal(absent.state, "absent");
  await assert.rejects(readdir(target), { code: "ENOENT" });
  assert.deepEqual(await readdir(join(repo, "skills", "gt")), [".hidden", "SKILL.md", "references"]);

  const installed = await syncBundle({ source, target, repo, apply: true });
  assert.equal(installed.action, "installed");
  const equal = await inspectBundle({ source, target, repo });
  assert.equal(equal.state, "equal");

  await writeFile(join(target, "SKILL.md"), "customized\n");
  await writeFile(join(target, "extra.md"), "local extra\n");
  await rm(join(target, "references", "shared.md"));
  const divergent = await inspectBundle({ source, target, repo });
  assert.equal(divergent.state, "divergent");
  assert.deepEqual(divergent.changed, ["SKILL.md"]);
  assert.deepEqual(divergent.extra, ["extra.md"]);
  assert.deepEqual(divergent.missing, ["references/shared.md"]);
  assert.equal(await readFile(join(target, "SKILL.md"), "utf8"), "customized\n");
});

test("sync requires explicit apply and refuses customizations unless replacement is authorized", async () => {
  const { repo, source } = await makeSandbox();
  const target = join(repo, ".opencode", "skills", "gt");
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "SKILL.md"), "owner customization\n");

  await assert.rejects(syncBundle({ source, target, repo }), /pass --apply/);
  const refused = await syncBundle({ source, target, repo, apply: true });
  assert.equal(refused.action, "refused-divergence");
  assert.equal(await readFile(join(target, "SKILL.md"), "utf8"), "owner customization\n");

  const updated = await syncBundle({ source, target, repo, apply: true, replace: true });
  assert.equal(updated.action, "updated");
  assert.ok(updated.backup);
  assert.equal(await readFile(join(target, "SKILL.md"), "utf8"), "name: gt\n");
  assert.equal(await readFile(join(updated.backup, "SKILL.md"), "utf8"), "owner customization\n");
});

test("external targets require explicit confirmation and remain fixture-only", async () => {
  const { root, repo, source } = await makeSandbox();
  const target = join(root, "global", "skills", "gt");

  await assert.rejects(
    syncBundle({ source, target, repo, apply: true }),
    /--confirm-external/,
  );
  await assert.rejects(readdir(join(root, "global")), { code: "ENOENT" });
  const installed = await syncBundle({ source, target, repo, apply: true, confirmExternal: true });
  assert.equal(installed.action, "installed");
  assert.equal(installed.targetIsExternal, true);
  assert.equal((await inspectBundle({ source, target, repo })).state, "equal");
});
