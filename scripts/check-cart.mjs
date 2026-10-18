#!/usr/bin/env node
/**
 * check-cart.mjs — smoke tests for the shared cart/auth logic in script.js.
 *
 * Runs script.js in a vm with a tiny DOM/localStorage stub and verifies:
 *  1. corrupted localStorage data does not crash getCart()
 *  2. malicious title/type stored in the cart cannot break out of the
 *     rendered HTML (no <script>, no inline onclick; data-* delegation)
 *  3. quantity/remove handling by index works
 *  4. registration validation rejects bad username/email/phone and
 *     accepts a valid phone typed with Persian digits (normalized to Latin)
 *
 * Usage: node scripts/check-cart.mjs
 * Exits non-zero on the first failed assertion.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
function assert(name, cond) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}`);
  }
}

const store = {};
const els = {
  cartItems: { innerHTML: '' },
  cartSummary: { innerHTML: '' },
  checkoutBtn: { style: {} },
  orderCodeDiv: { style: {} }
};
let statusMsg = '';

const sandbox = {
  console,
  setTimeout,
  localStorage: {
    getItem: k => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  document: {
    addEventListener() {},
    createElement: () => ({
      style: {},
      set textContent(v) { statusMsg = v; },
      get textContent() { return statusMsg; }
    }),
    querySelectorAll: () => [],
    getElementById: id => els[id] || null
  },
  alert() {},
  navigator: {}
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync(resolve(root, 'script.js'), 'utf8'), sandbox);

console.log('cart/auth checks:');

// 1) corrupted storage
store.gameCart = '{not-json!';
assert('corrupted gameCart returns [] instead of throwing', Array.isArray(sandbox.getCart()) && sandbox.getCart().length === 0);

// 2) hostile cart content
store.gameCart = JSON.stringify([
  { id: 1, title: '<script>alert(1)</' + 'script>', type: "');alert(1);//", price: '150,000', quantity: 2 }
]);
sandbox.renderCart();
assert('rendered cart contains no <script> from item title', !els.cartItems.innerHTML.includes('<script>alert'));
assert('rendered cart contains no inline onclick', !els.cartItems.innerHTML.includes('onclick='));
assert('item title is HTML-escaped', els.cartItems.innerHTML.includes('&lt;script&gt;'));
assert('cart buttons use data-cart-action/index', els.cartItems.innerHTML.includes('data-cart-action="remove" data-index="0"'));
assert('summary total = price × qty', els.cartSummary.innerHTML.includes((300000).toLocaleString()));

// 3) qty/remove by index
sandbox.handleCartAction('inc', 0);
assert('inc raises quantity to 3', sandbox.getCart()[0].quantity === 3);
sandbox.handleCartAction('remove', 0);
assert('remove empties the cart', sandbox.getCart().length === 0);

// 4) registration validation
const fields = {
  fullName: { value: 'کاربر تست' },
  username: { value: 'ab' },
  email: { value: 'not-an-email' },
  phone: { value: '0933' }
};
sandbox.document.getElementById = id => fields[id] || { innerHTML: '', appendChild() {}, style: {} };

sandbox.registerUser();
assert('short username rejected', statusMsg.includes('نام کاربری'));
fields.username.value = 'testuser';
sandbox.registerUser();
assert('invalid email rejected', statusMsg.includes('ایمیل'));
fields.email.value = 'a@b.com';
sandbox.registerUser();
assert('invalid phone rejected', statusMsg.includes('شماره تلفن'));
fields.phone.value = '۰۹۳۷۲۷۲۶۱۴۲'; // Persian digits
sandbox.registerUser();
assert('valid form accepted', statusMsg.includes('ثبت نام شدید'));
assert('phone normalized to Latin digits', JSON.parse(store.gameUser).phone === '09372726142');

if (failures > 0) {
  console.error(`❌ ${failures} cart/auth check(s) failed.`);
  process.exit(1);
}
console.log('✅ all cart/auth checks passed.');
