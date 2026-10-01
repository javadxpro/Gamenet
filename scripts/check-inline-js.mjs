#!/usr/bin/env node
/**
 * check-inline-js.mjs — parses every inline <script> (no src) in the site's
 * HTML pages and fails if any has a syntax error.
 *
 * Usage: node scripts/check-inline-js.mjs [rootDir]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] || '.');
const files = readdirSync(root).filter(f => f.endsWith('.html'));
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

let checked = 0;
let failed = 0;

for (const file of files) {
  const html = readFileSync(root + '/' + file, 'utf8');
  let m, i = 0;
  while ((m = re.exec(html)) !== null) {
    i++;
    checked++;
    try {
      new Function(m[1]);
    } catch (e) {
      failed++;
      const line = html.slice(0, m.index).split('\n').length;
      console.error(`✗ ${file} (inline script #${i}, ~line ${line}): ${e.message}`);
    }
  }
}

console.log(`${files.length} pages, ${checked} inline scripts checked.`);
if (failed > 0) {
  console.error(`❌ ${failed} inline script(s) with syntax errors.`);
  process.exit(1);
}
console.log('✅ all inline scripts parse.');
