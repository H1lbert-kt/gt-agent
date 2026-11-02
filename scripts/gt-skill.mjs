#!/usr/bin/env node

import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
export const repositoryRoot = resolve(dirname(scriptPath), "..");
export const sourceRoot = join(repositoryRoot, "skills", "gt");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function comparePath(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isWithin(parent, child) {
  const pathFromParent = relative(parent, child);
  return pathFromParent === "" || (!pathFromParent.startsWith(`..${sep}`) && pathFromParent !== "..");
}

async function listFiles(root, { rejectSymlinks = false } = {}) {
  const files = [];

  async function walk(directory, prefix = "") {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => comparePath(left.name, right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(path, relativePath);
      } else if (entry.isFile()) {
        const contents = await readFile(path);
        files.push({ path: relativePath, size: contents.length, sha256: sha256(contents), kind: "file" });
      } else if (entry.isSymbolicLink()) {
        if (rejectSymlinks) throw new Error(`Source bundle contains a symbolic link: ${relativePath}`);
        files.push({ path: relativePath, size: null, sha256: null, kind: "symlink" });
      } else {
        files.push({ path: relativePath, size: null, sha256: null, kind: "special" });
      }
    }
  }

  await walk(root);
  return files.sort((left, right) => comparePath(left.path, right.path));
}

export async function createManifest(root = sourceRoot) {
  const rootInfo = await lstat(root).catch(() => null);
  if (!rootInfo?.isDirectory()) throw new Error(`Skill source directory is missing: ${root}`);
  const files = await listFiles(root, { rejectSymlinks: true });
  if (!files.length) throw new Error(`Skill source directory has no files: ${root}`);
  const manifestFiles = files.map(({ path, size, sha256: hash }) => ({ path, size, sha256: hash }));
  const serialized = JSON.stringify(manifestFiles);
  return {
    schema: "gt-skill-manifest/v1",
    digestSha256: sha256(Buffer.from(serialized, "utf8")),
    files: manifestFiles,
  };
}

async function canonicalizeTargetParent(targetPath) {
  const absoluteTarget = resolve(targetPath);
  let cursor = dirname(absoluteTarget);
  const remainder = [basename(absoluteTarget)];
  while (true) {
    try {
      const canonical = await realpath(cursor);
      return join(canonical, ...remainder);
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      const parent = dirname(cursor);
      if (parent === cursor) throw error;
      remainder.unshift(basename(cursor));
      cursor = parent;
    }
  }
}

export async function inspectBundle({ source = sourceRoot, target, repo = repositoryRoot } = {}) {
  if (typeof target !== "string" || !target) throw new Error("A target directory is required");
  const sourceCanonical = await realpath(source);
  const targetCanonical = await canonicalizeTargetParent(target);
  const manifest = await createManifest(sourceCanonical);
  const targetInfo = await lstat(targetCanonical).catch((error) => {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  });

  if (!targetInfo) {
    const repoCanonical = await realpath(repo);
    return {
      state: "absent",
      source: sourceCanonical,
      target: targetCanonical,
      targetIsExternal: !isWithin(repoCanonical, targetCanonical),
      manifest,
      missing: manifest.files.map((file) => file.path),
      extra: [],
      changed: [],
    };
  }

  let actual;
  if (targetInfo.isDirectory()) actual = await listFiles(targetCanonical);
  else actual = [{ path: "<target>", size: null, sha256: null, kind: "special" }];
  const expectedByPath = new Map(manifest.files.map((file) => [file.path, file]));
  const actualByPath = new Map(actual.map((file) => [file.path, file]));
  const missing = manifest.files.filter((file) => !actualByPath.has(file.path)).map((file) => file.path);
  const extra = actual.filter((file) => !expectedByPath.has(file.path)).map((file) => file.path);
  const changed = manifest.files
    .filter((file) => {
      const installed = actualByPath.get(file.path);
      return installed && (installed.kind !== "file" || installed.size !== file.size || installed.sha256 !== file.sha256);
    })
    .map((file) => file.path);
  const state = missing.length || extra.length || changed.length ? "divergent" : "equal";
  const repoCanonical = await realpath(repo);
  return {
    state,
    source: sourceCanonical,
    target: targetCanonical,
    targetIsExternal: !isWithin(repoCanonical, targetCanonical),
    manifest,
    missing,
    extra,
    changed,
  };
}

async function copyTree(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) await copyTree(from, to);
    else if (entry.isFile()) await copyFile(from, to, constants.COPYFILE_EXCL);
    else throw new Error(`Cannot install unsupported source entry: ${entry.name}`);
  }
}

async function unusedBackupPath(target) {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const backupRoot = join(dirname(target), ".gt-backups");
  await mkdir(backupRoot, { recursive: true });
  let candidate = join(backupRoot, `gt-${timestamp}`);
  let suffix = 1;
  while (true) {
    try {
      await access(candidate);
      candidate = join(backupRoot, `gt-${timestamp}-${suffix++}`);
    } catch (error) {
      if (error.code === "ENOENT") return candidate;
      throw error;
    }
  }
}

export async function syncBundle({
  source = sourceRoot,
  target,
  repo = repositoryRoot,
  apply = false,
  confirmExternal = false,
  replace = false,
} = {}) {
  if (!apply) throw new Error("No files changed: pass --apply to authorize installation or update");
  const result = await inspectBundle({ source, target, repo });
  if (result.target === result.source) throw new Error("Refusing to overwrite the versioned source bundle");
  if (basename(result.target) !== "gt") throw new Error("Target must be the skill directory named gt");
  if (isWithin(result.source, result.target)) throw new Error("Target cannot be inside the versioned source bundle");
  if (result.targetIsExternal && !confirmExternal) {
    throw new Error("External destination refused: pass --confirm-external after reviewing this exact target");
  }
  if (result.state === "equal") return { ...result, action: "unchanged", backup: null };
  if (result.state === "divergent" && !replace) {
    return { ...result, action: "refused-divergence", backup: null };
  }

  await mkdir(dirname(result.target), { recursive: true });
  const staging = await mkdtemp(join(dirname(result.target), ".gt-skill-staging-"));
  let backup = null;
  let movedExisting = false;
  try {
    await copyTree(result.source, staging);
    if (result.state === "divergent") {
      backup = await unusedBackupPath(result.target);
      await rename(result.target, backup);
      movedExisting = true;
    }
    await rename(staging, result.target);
    return { ...result, action: result.state === "absent" ? "installed" : "updated", backup };
  } catch (error) {
    if (movedExisting) {
      try {
        await rename(backup, result.target);
      } catch (restoreError) {
        throw new Error(`${error.message}; also failed to restore backup ${backup}: ${restoreError.message}`);
      }
    }
    throw error;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

function printInspection(result) {
  console.log(`status: ${result.state}`);
  console.log(`source: ${result.source}`);
  console.log(`target: ${result.target}`);
  console.log(`manifest: sha256:${result.manifest.digestSha256}`);
  console.log(`files: ${result.manifest.files.length}`);
  if (result.missing.length) console.log(`missing: ${result.missing.join(", ")}`);
  if (result.extra.length) console.log(`extra: ${result.extra.join(", ")}`);
  if (result.changed.length) console.log(`changed: ${result.changed.join(", ")}`);
}

function usage() {
  console.log(`Usage:
  node scripts/gt-skill.mjs manifest
  node scripts/gt-skill.mjs check <path-to-gt-skill>
  node scripts/gt-skill.mjs sync <path-to-gt-skill> --apply [--confirm-external] [--replace]

check is read-only. sync refuses external destinations without --confirm-external
and divergent destinations without --replace; replaced content is kept in a sibling backup.`);
}

async function main(args) {
  const [command, target, ...flags] = args;
  if (!command || command === "--help" || command === "-h") {
    usage();
    return 0;
  }
  if (command === "manifest" && !target) {
    console.log(JSON.stringify(await createManifest(), null, 2));
    return 0;
  }
  if (command === "check" && target && flags.length === 0) {
    const result = await inspectBundle({ target });
    printInspection(result);
    return result.state === "equal" ? 0 : 1;
  }
  if (command === "sync" && target) {
    const allowed = new Set(["--apply", "--confirm-external", "--replace"]);
    if (flags.some((flag) => !allowed.has(flag)) || new Set(flags).size !== flags.length) {
      throw new Error("Unknown or duplicate sync option");
    }
    const result = await syncBundle({
      target,
      apply: flags.includes("--apply"),
      confirmExternal: flags.includes("--confirm-external"),
      replace: flags.includes("--replace"),
    });
    printInspection(result);
    if (result.action === "refused-divergence") {
      console.error("Refused to overwrite divergent/customized content; review the paths and rerun with --replace to preserve a backup first.");
      return 1;
    }
    console.log(`action: ${result.action}`);
    if (result.backup) console.log(`backup: ${result.backup}`);
    return 0;
  }
  usage();
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main(process.argv.slice(2)).then((status) => {
    process.exitCode = status;
  }).catch((error) => {
    console.error(`error: ${error.message}`);
    process.exitCode = 2;
  });
}
