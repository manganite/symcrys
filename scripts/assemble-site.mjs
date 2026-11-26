// Assembles the documentation site of all releases: each release from 0.14
// attaches its built site as symcrys-site-X.Y.Z.tar.gz (job site of release.yml). The newest release
// goes to the root, so that the URLs stay as they are; each MINOR keeps its newest PATCH under
// /X.Y/; versions.json at the root lists them for the version menu of the sidebar
// (docs/_templates/sidebar/versions.html). Run by the job pages of release.yml:
//
//   node scripts/assemble-site.mjs <folder with the tarballs> <output folder> <version of the tag>
//
// It refuses to assemble without the site of the tagged version, so that a failed download cannot
// publish a site without it. A PATCH of an older MINOR (0.14.2 after 0.15.0) goes under /0.14/ and
// leaves the root to the newest release.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @typedef {{ label: string, version: string, path: string }} SiteVersion */

const TARBALL = /^symcrys-site-(\d+)\.(\d+)\.(\d+)\.tar\.gz$/;

/**
 * The versions of the site from the names of the tarballs: the newest at the root (path ''), then
 * the newest PATCH of each MINOR under 'X.Y/', newest first. Names that are no release tarball
 * (a pre-release, another file) are left out.
 * @param {readonly string[]} names
 * @returns {{ versions: SiteVersion[], tarballs: Record<string, string> }}
 */
export function planSite(names) {
  /** @type {{ v: number[], name: string }[]} */
  const found = [];
  for (const name of names) {
    const m = TARBALL.exec(name);
    if (m) found.push({ v: [Number(m[1]), Number(m[2]), Number(m[3])], name });
  }
  found.sort((a, b) => b.v[0] - a.v[0] || b.v[1] - a.v[1] || b.v[2] - a.v[2]);
  /** @type {SiteVersion[]} */
  const versions = [];
  /** @type {Record<string, string>} */
  const tarballs = {};
  if (found.length === 0) return { versions, tarballs };
  const newest = found[0].v.join('.');
  versions.push({ label: `${newest} (newest)`, version: newest, path: '' });
  tarballs[''] = found[0].name;
  const minors = new Set();
  for (const { v, name } of found) {
    const minor = `${v[0]}.${v[1]}`;
    if (minors.has(minor)) continue;
    minors.add(minor);
    versions.push({ label: `${minor} (${v.join('.')})`, version: v.join('.'), path: `${minor}/` });
    tarballs[`${minor}/`] = name;
  }
  return { versions, tarballs };
}

/**
 * Unpacks the planned sites into `output` and writes versions.json.
 * @param {string} input
 * @param {string} output
 * @param {string} required the version of the tag, which must be among the sites
 */
function assemble(input, output, required) {
  const names = readdirSync(input);
  if (!names.includes(`symcrys-site-${required}.tar.gz`)) {
    throw new Error(`assemble-site: no site of the tagged version ${required} among ${JSON.stringify(names)}`);
  }
  const { versions, tarballs } = planSite(names);
  rmSync(output, { recursive: true, force: true });
  for (const [path, name] of Object.entries(tarballs)) {
    const target = join(output, path);
    mkdirSync(target, { recursive: true });
    execFileSync('tar', ['-xzf', join(input, name), '-C', target]);
    // Only the root's sitemap is announced; one in a folder would list the root's addresses.
    if (path !== '' && existsSync(join(target, 'sitemap.xml'))) rmSync(join(target, 'sitemap.xml'));
  }
  writeFileSync(join(output, 'versions.json'), `${JSON.stringify(versions, null, 2)}\n`);
  console.log(`assemble-site: ${versions.map((v) => `${v.path || '/'} ${v.version}`).join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, output, required] = process.argv.slice(2);
  if (!input || !output || !required) {
    console.error('usage: node scripts/assemble-site.mjs <tarballs> <output> <version of the tag>');
    process.exit(2);
  }
  assemble(input, output, required);
}
