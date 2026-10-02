#!/usr/bin/env node
/**
 * inject-head.mjs — one-shot helper (not part of the site)
 * Adds meta description / OG tags / favicon link to every HTML page's <head>,
 * and aria-labels to icon-only buttons.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || '.';
const files = readdirSync(root).filter(f => f.endsWith('.html'));

const DESCRIPTIONS = {
  'shop-index.html': 'فروشگاه گیم نت: خرید بازی کپی خور PS و Xbox، گیفت کارت، اشتراک و سکه و جم — با پشتیبانی تلفنی.',
  'index.html': 'گیم‌نت | صفحه رسمی — معرفی گیم نت، خدمات، اخبار و آلبوم عکس با گرافیک سه‌بعدی WebGL.',
  'WebPC.html': 'گیم‌نت | نمایش گرافیک فراکهکشانی با three.js و کیفیت‌های مختلف رندر.',
  'games.html': 'فهرست کامل بازی‌های موجود در فروشگاه گیم نت برای PS4/PS5 و Xbox.',
  'game1.html': 'جزئیات بازی PES eFootball SP Football Life 2026 و خرید کپی خور در فروشگاه گیم نت.',
  'game2.html': 'جزئیات بازی Call of Duty: Black Ops Cold War و خرید کپی خور در فروشگاه گیم نت.',
  'game3.html': 'جزئیات بازی Gang Beast و خرید کپی خور در فروشگاه گیم نت.',
  'cart.html': 'سبد خرید فروشگاه گیم نت — بررسی اقلام، ثبت سفارش و دریافت کد پیگیری.',
  'giftcard.html': 'فروش گیفت کارت اپل، پلی استیشن، ایکس باکس، استیم، گوگل پلی و دیگر سرویس‌ها در گیم نت.',
  'offers.html': 'پیشنهادها و تخفیف‌های ویژه فروشگاه گیم نت.',
  'subscriptions.html': 'فروش اشتراک‌های بازی: پلی استیشن پلاس، گیم پس، رویال پس و ... در فروشگاه گیم نت.',
  'news.html': 'اخبار گیم نت: جدیدترین اخبار بازی، آپدیت‌ها و پچ‌ها.',
  'shop.html': 'فروش بازی، گیفت کارت و اشتراک در فروشگاه گیم نت.',
  'team.html': 'ترکیب تیم فوتبال راه ابریشم — گیم نت.',
  'team-info.html': 'اطلاعات و وضعیت بازیکنان تیم راه ابریشم.',
  'analysis.html': 'آنالیز آماری بازیکنان تیم راه ابریشم.',
  '404.html': 'صفحه‌ای که دنبالش بودید پیدا نشد — گیم نت.',
};

for (const file of files) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  let changed = false;

  const m = html.match(/<title>([^<]*)<\/title>/);
  const pageTitle = m ? m[1].trim() : 'گیم نت';
  const desc = DESCRIPTIONS[file] || 'گیم نت — فروشگاه بازی، گیفت کارت و اشتراک.';

  if (!/name="description"/.test(html)) {
    const viewportLine = html.match(/<meta name="viewport"[^>]*>/);
    if (viewportLine) {
      const block =
        `    <meta name="description" content="${desc}">\n` +
        `    <meta property="og:title" content="${pageTitle}">\n` +
        `    <meta property="og:description" content="${desc}">\n` +
        `    <meta property="og:type" content="website">\n` +
        `    <link rel="icon" type="image/svg+xml" href="favicon.svg">\n`;
      const idx = html.indexOf(viewportLine[0]) + viewportLine[0].length;
      html = html.slice(0, idx) + '\n' + block + html.slice(idx);
      changed = true;
    }
  }

  // aria-labels for icon-only controls
  const ariaFixes = [
    [/<button class="menu-btn" id="menuBtn">/, '<button class="menu-btn" id="menuBtn" aria-label="باز کردن منو">'],
    [/<button class="user-btn" id="userBtn">/, '<button class="user-btn" id="userBtn" aria-label="حساب کاربری">'],
    [/<button class="close-menu" id="closeMenu">/, '<button class="close-menu" id="closeMenu" aria-label="بستن منو">'],
    [/<div class="cart-icon" onclick="location\.href='cart\.html'">/,
     '<div class="cart-icon" role="button" tabindex="0" aria-label="سبد خرید" onclick="location.href=\'cart.html\'">'],
  ];
  for (const [re, repl] of ariaFixes) {
    if (re.test(html)) {
      html = html.replace(re, repl);
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(path, html, 'utf8');
    console.log('updated:', file);
  } else {
    console.log('skipped :', file);
  }
}
