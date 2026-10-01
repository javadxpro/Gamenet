#!/usr/bin/env node
/**
 * check-links.mjs — validates that every internal reference in the site
 * (href/src in .html files: pages, CSS, JS, images, audio) points to a
 * file that actually exists in the repository.
 *
 * Usage: node scripts/check-links.mjs [rootDir]
 * Exits non-zero if any reference is broken.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, isAbsolute } from 'node:path';

const root = resolve(process.argv[2] || '.');
const htmlFiles = readdirSync(root).filter(f => f.endsWith('.html'));

const SKIP_PREFIXES = ['http://', 'https://', 'data:', 'mailto:', 'tel:', '#', 'javascript:'];

const refRe = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;

let broken = 0;
let checked = 0;

for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');
  const pageDir = join(root, dirname(file));

  // strip inline event handlers' string content is not needed; we check all attrs
  let m;
  while ((m = refRe.exec(html)) !== null) {
    let ref = m[1].trim();
    if (SKIP_PREFIXES.some(p => ref.startsWith(p))) continue;
    // dynamic values inside JS template literals (e.g. src="${game.img}")
    if (ref.includes('${')) continue;

    // separate query/fragment
    ref = ref.split('#')[0].split('?')[0];
    if (!ref) continue;

    let decoded;
    try {
      decoded = decodeURIComponent(ref);
    } catch {
      decoded = ref;
    }

    const target = isAbsolute(decoded) ? decoded : join(pageDir, decoded);

    checked++;
    // try as-is, then with index.html appended (for folder refs)
    if (!existsSync(target) && !existsSync(join(target, 'index.html'))) {
      broken++;
      const line = html.slice(0, m.index).split('\n').length;
      console.error(`✗ ${file}:${line}  →  ${m[1]}  (missing: ${target.replace(root + '/', '')})`);
    }
  }
}

// also check <script src> / <link href> in head were covered above (same regex).

// ---- media assets referenced inside inline JS (e.g. gamesList) ----
// missing art is a warning (owner must upload the image), not a hard fail.
let missingMedia = 0;
const mediaRe = /\b(?:images|assets)\/[A-Za-z0-9_\-.\u0600-\u06FF %]+\.(?:jpe?g|png|gif|webp|svg|mp3|wav|ogg)\b/gi;
for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');
  const seen = new Set();
  let m2;
  while ((m2 = mediaRe.exec(html)) !== null) {
    const ref = decodeURIComponent(m2[0]);
    if (seen.has(ref)) continue;
    seen.add(ref);
    if (!existsSync(join(root, ref))) {
      missingMedia++;
      console.warn(`⚠ ${file}: media referenced but not in repo: ${ref}`);
    }
  }
}

console.log(`\n${htmlFiles.length} pages, ${checked} internal references checked.`);
if (broken > 0) {
  console.error(`❌ ${broken} broken reference(s).`);
  process.exit(1);
}
if (missingMedia > 0) {
  console.warn(`⚠ ${missingMedia} missing media file(s) (non-fatal).`);
}
console.log('✅ all internal references resolve.');
