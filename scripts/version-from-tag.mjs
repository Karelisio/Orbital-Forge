#!/usr/bin/env node
// Derives versionName/versionCode from a git tag (vMAJOR.MINOR.PATCH).
//   node scripts/version-from-tag.mjs              -> prints JSON
//   node scripts/version-from-tag.mjs --github-output  -> appends to $GITHUB_OUTPUT
//   node scripts/version-from-tag.mjs --tag v1.2.3
// versionCode = MAJOR * 1_000_000 + MINOR * 1_000 + PATCH (same formula as android/app/build.gradle).
import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const args = process.argv.slice(2);
const tagArg = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : undefined;

function latestTag() {
  if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  try {
    return execSync('git describe --tags --abbrev=0 --match "v*"', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'v0.1.0';
  }
}

export function parseVersion(tag) {
  const m = /v?(\d+)\.(\d+)\.(\d+)/.exec(tag);
  if (!m) throw new Error(`Invalid version tag: ${tag}`);
  const [major, minor, patch] = m.slice(1).map(Number);
  return { tag: `v${major}.${minor}.${patch}`, name: `${major}.${minor}.${patch}`, code: major * 1_000_000 + minor * 1_000 + patch };
}

const v = parseVersion(tagArg || latestTag());
if (args.includes('--github-output') && process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `tag=${v.tag}\nname=${v.name}\ncode=${v.code}\n`);
}
console.log(JSON.stringify(v));
