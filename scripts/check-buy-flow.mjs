#!/usr/bin/env node
/**
 * check-buy-flow.mjs — تست جریان خرید مرحله‌ای صفحات اختصاصی بازی‌ها.
 *
 * روی صفحهٔ یک بازی Xboxدار (GTA V) و یک بازی بدون نسخهٔ اصلی (PES) با DOM جعلی:
 *  1. قبل از نهایی‌شدن انتخاب‌ها، قیمت و دکمهٔ «افزودن به سبد» نباید دیده شوند.
 *  2. با انتخاب Xbox، دکمهٔ کپی‌خور باید مخفی شود (برای Xbox کپی‌خور نداریم).
 *  3. مسیر Xbox ← اصلی ← ظرفیت آنلاین باید قلم «قیمت روز» مخصوص Xbox بسازد.
 *  4. مسیر PS ← کپی‌خور باید قیمت ثابت ۲۵۰,۰۰۰ تومان بسازد.
 *  5. PES فقط یک پلتفرم (PS) و یک نوع نسخه (کپی‌خور) دارد.
 *
 * Usage: node scripts/check-buy-flow.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
function assert(name, cond) {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}`); }
}

function makeClassList() {
  const set = new Set();
  return {
    add: c => set.add(c),
    remove: c => set.delete(c),
    toggle: (c, force) => { if (force === undefined) force = !set.has(c); force ? set.add(c) : set.delete(c); },
    contains: c => set.has(c)
  };
}

function loadPage(file) {
  const store = {};
  const alerts = [];
  const html = readFileSync(resolve(root, file), 'utf8');

  const byId = {};
  const buttons = [];
  // ساخت دکمه‌ها از روی HTML واقعی صفحه
  for (const m of html.matchAll(/<button[^>]*>/g)) {
    const tag = m[0];
    const get = name => { const mm = tag.match(new RegExp(`${name}="([^"]*)"`)); return mm ? mm[1] : null; };
    const btn = {
      _attrs: { 'data-platform': get('data-platform'), 'data-version': get('data-version'), 'data-capacity': get('data-capacity') },
      id: get('id'),
      style: {},
      hidden: false,
      classList: makeClassList(),
      getAttribute(n) { return this._attrs[n] ?? null; },
      addEventListener(ev, fn) { this._click = fn; },
      click() { if (this._click) this._click.call(this); }
    };
    buttons.push(btn);
    if (btn.id) byId[btn.id] = btn;
  }
  for (const id of ['stepVersion', 'stepCapacity', 'priceDisplay', 'addToCartBtn', 'xboxNoCopy']) {
    if (!byId[id]) {
      byId[id] = { style: { display: id === 'priceDisplay' || id === 'addToCartBtn' ? 'none' : '' }, hidden: true, textContent: '', classList: makeClassList(), addEventListener(ev, fn) { this._click = fn; }, click() { if (this._click) this._click.call(this); }, getAttribute: () => null };
    }
  }
  byId.addToCartBtn = buttons.find(b => b.id === 'addToCartBtn') || byId.addToCartBtn;

  const sandbox = {
    console, setTimeout,
    alert: m => alerts.push(m),
    localStorage: {
      getItem: k => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    document: {
      addEventListener() {},
      getElementById: id => byId[id] || null,
      querySelectorAll(sel) {
        if (sel.includes('[data-version], [data-capacity]')) return buttons.filter(b => b._attrs['data-version'] || b._attrs['data-capacity']);
        if (sel.includes('[data-platform]')) return buttons.filter(b => b._attrs['data-platform']);
        if (sel.includes('[data-version]')) return buttons.filter(b => b._attrs['data-version']);
        if (sel.includes('[data-capacity]')) return buttons.filter(b => b._attrs['data-capacity']);
        return buttons;
      },
      createElement: () => ({ style: {}, textContent: '' })
    },
    navigator: {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(resolve(root, 'script.js'), 'utf8'), sandbox);
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).pop();
  vm.runInContext(inline, sandbox);

  return { store, alerts, buttons, byId, cart: () => JSON.parse(store.gameCart || '[]') };
}

console.log('buy-flow checks (GTA V — Xboxدار):');
{
  const page = loadPage('game-gta-v.html');
  const platform = v => page.buttons.find(b => b._attrs['data-platform'] === v);
  const version = v => page.buttons.find(b => b._attrs['data-version'] === v);
  const capacity = v => page.buttons.find(b => b._attrs['data-capacity'] === v);

  assert('price hidden before any selection', page.byId.priceDisplay.style.display === 'none');
  platform('xbox').click();
  assert('copy button hidden on Xbox (no Xbox copy)', page.byId.btnCopy.style.display === 'none');
  assert('xbox no-copy note visible', page.byId.xboxNoCopy.hidden === false);
  version('original').click();
  assert('price still hidden before capacity chosen', page.byId.addToCartBtn.style.display === 'none');
  capacity('آنلاین').click();
  assert('final price shown = قیمت روز', page.byId.priceDisplay.textContent.includes('قیمت روز'));
  assert('final type mentions Xbox', page.byId.priceDisplay.textContent.includes('Xbox'));
  page.byId.addToCartBtn.click();
  let cart = page.cart();
  assert('cart item = ظرفیتی آنلاین Xbox با قیمت روز', cart.length === 1 && cart[0].type.includes('Xbox') && cart[0].price === 'قیمت روز');

  platform('ps').click();
  version('copy').click();
  assert('PS copy final price = 250,000', page.byId.priceDisplay.textContent.includes('250,000'));
  page.byId.addToCartBtn.click();
  cart = page.cart();
  assert('cart second item = کپی‌خور 250,000', cart.length === 2 && cart[1].price === '250,000');
}

console.log('buy-flow checks (PES — بدون نسخهٔ اصلی و بدون Xbox):');
{
  const page = loadPage('game-pes-football-life-2026.html');
  assert('only one platform button (PS)', page.buttons.filter(b => b._attrs['data-platform']).length === 1);
  assert('no original version button', !page.buttons.some(b => b._attrs['data-version'] === 'original'));
  assert('no capacity buttons', !page.buttons.some(b => b._attrs['data-capacity']));
  page.buttons.find(b => b._attrs['data-platform'] === 'ps').click();
  page.buttons.find(b => b._attrs['data-version'] === 'copy').click();
  assert('PES final price = 250,000', page.byId.priceDisplay.textContent.includes('250,000'));
  page.byId.addToCartBtn.click();
  const cart = page.cart();
  assert('PES cart item = کپی‌خور', cart.length === 1 && cart[0].type.includes('کپی'));
}

if (failures) { console.error(`❌ ${failures} buy-flow check(s) failed.`); process.exit(1); }
console.log('✅ all buy-flow checks passed.');
