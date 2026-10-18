#!/usr/bin/env node
/**
 * build-game-pages.mjs — تولید صفحات اختصاصی بازی‌ها از روی games.json
 *
 * چه کار می‌کند:
 *  1. برای هر بازی «موجود» در games.json یک صفحهٔ game-<slug>.html می‌سازد
 *     (اطلاعات کامل + مقایسهٔ نسخهٔ اصلی و کپی‌خور + افزودن به سبد).
 *  2. آرایهٔ gamesList در games.html را بین مارکرهای AUTO-GAMES به‌روز می‌کند
 *     و کارت بازی‌های موجود را به صفحهٔ اختصاصی‌شان لینک می‌کند.
 *  3. game1/2/3.html قدیمی را به صفحهٔ جدید همان بازی ریدایرکت می‌کند.
 *  4. ورودی‌های صفحات بازی در sitemap.xml را بازسازی می‌کند.
 *
 * Usage:
 *   node scripts/build-game-pages.mjs           # تولید/به‌روزرسانی فایل‌ها
 *   node scripts/build-game-pages.mjs --check   # فقط بررسی به‌روز بودن (برای CI)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const data = JSON.parse(readFileSync(resolve(root, 'games.json'), 'utf8'));
const available = data.games.filter(g => g.status === 'موجود');
const unavailable = data.games.filter(g => g.status !== 'موجود');

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// «حدود ۸۵ GB (همراه پچ...)» -> «85 GB» برای نمایش خلاصه روی کارت
function shortSize(copySize) {
  if (!copySize) return '';
  const latin = String(copySize)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const m = latin.match(/([\d.]+)\s*GB/i);
  return m ? `${m[1]} GB` : String(copySize);
}

const PHONE_FA = '۰۹۹۳۳۸۸۰۱۴۰';
const PHONE_TEL = '+989933880140';
const PHONE2_FA = '۰۹۳۷۲۷۲۶۱۴۲';
const PHONE2_TEL = '+989372726142';

function gamePage(game) {
  const features = game.features.map(f => `<li>${esc(f)}</li>`).join('\n                    ');
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="خرید نسخه کپی‌خور ${esc(game.title)} برای PS4 و PS5 — مشخصات کامل، مقایسه حجم نسخه اصلی و کپی‌خور و قیمت در فروشگاه گیم نت.">
    <meta property="og:title" content="${esc(game.title)} | فروشگاه گیم نت">
    <meta property="og:description" content="خرید نسخه کپی‌خور ${esc(game.title)} برای PS4 و PS5 — مشخصات کامل، مقایسه حجم نسخه اصلی و کپی‌خور و قیمت در فروشگاه گیم نت.">
    <meta property="og:type" content="website">
    <link rel="icon" type="image/svg+xml" href="favicon.svg?v=4">

    <title>${esc(game.title)} | فروشگاه گیم نت</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet">
    <link rel="stylesheet" href="Webstyle.css?v=4">
</head>
<body>
<div class="container">
    <div class="main-header">
        <div class="logo"><p class="logo-text"><svg class="gi" width="1.18em" height="1.18em" aria-hidden="true"><use href="icons.svg?v=4#ic-store"></use></svg> فروشگاه گیم نت</p></div>
        <a href="games.html" class="back-link"><svg class="gi" width="1.18em" height="1.18em" aria-hidden="true"><use href="icons.svg?v=4#ic-back"></use></svg> همه بازی‌ها</a>
    </div>

    <div class="game-detail">
        <img class="game-img" src="${esc(game.img)}" alt="${esc(game.title)}" onerror="this.onerror=null; this.src='images/placeholder.svg';">
        <div class="game-info">
            <h1 class="game-title">${esc(game.title)}</h1>
            <div class="game-platform"><i class="fab fa-playstation" style="color: #0099ff;"></i> نسخه کپی‌خور: PS4 | PS5</div>
            <p class="game-description">${esc(game.desc)}</p>

            <div class="spec-grid">
                <div><span>🎮 ژانر</span><strong>${esc(game.genre)}</strong></div>
                <div><span>🛠 سازنده</span><strong>${esc(game.developer)}</strong></div>
                <div><span>🏢 ناشر</span><strong>${esc(game.publisher)}</strong></div>
                <div><span>📅 تاریخ انتشار</span><strong>${esc(game.release)}</strong></div>
                <div><span>👥 بازیکنان</span><strong>${esc(game.players)}</strong></div>
                <div><span>🔞 رده‌بندی سنی</span><strong>${esc(game.pegi)}</strong></div>
            </div>

            <h2 class="compare-title">📦 مقایسهٔ نسخهٔ اصلی و کپی‌خور</h2>
            <div class="version-compare">
                <div class="version-card original">
                    <h3>نسخهٔ اصلی (Original)</h3>
                    <div class="version-size">${esc(game.origSize)}</div>
                    <ul>
                        <li>خرید دیجیتال از PlayStation Store (پرداخت ارزی و اکانت خارجی لازم دارد)</li>
                        <li>حجم دانلود نسخهٔ PS4 از استور؛ با آپدیت‌ها و DLCها بیشتر می‌شود</li>
                        <li>بازی آنلاین رسمی روی سرورهای پلی‌استیشن (با PS Plus)</li>
                    </ul>
                </div>
                <div class="version-card copy">
                    <h3>نسخهٔ کپی‌خور (همین فروشگاه) ✅</h3>
                    <div class="version-size">${esc(game.copySize)}</div>
                    <ul>
                        <li><strong>فقط برای PS4 و PS5</strong> ارائه می‌شود (نسخهٔ هکی/کپی‌خور مخصوص این دو کنسول است)</li>
                        <li>حجم نصب روی کنسول با نسخهٔ اصلی فرق می‌کند؛ چون معمولاً زبان‌ها و فایل‌های اضافه حذف و بازی فشرده می‌شود</li>
                        <li>بدون نیاز به خرید دلاری و اکانت خارجی؛ مناسب بازی آفلاین و داستانی</li>
                    </ul>
                </div>
            </div>
            <p class="size-note">ℹ️ حجم‌ها تقریبی‌اند و با ریجن بازی، زبان‌های نصب‌شده و نسخهٔ آپدیت تغییر می‌کنند؛ حجم دقیق هنگام هماهنگی خرید اعلام می‌شود.</p>

            <h2 class="compare-title">⭐ ویژگی‌های بازی</h2>
            <ul class="feature-list">
                    ${features}
            </ul>

            <div class="type-selector">
                <h3>🎯 حالت خرید را انتخاب کنید:</h3>
                <div class="type-buttons">
                    <div class="type-btn disabled" data-type="نسخه اصلی" data-price="ناموجود">نسخه اصلی <span style="font-size:0.7rem;">(فقط اطلاع‌رسانی — فروش در استور)</span></div>
                    <div class="type-btn" data-type="کپی خور (PS4/PS5)" data-price="${esc(game.price)}">کپی خور PS4/PS5 <span style="font-size:0.7rem;">(${Number(String(game.price).replace(/[^0-9]/g, '')).toLocaleString('fa-IR')} تومان)</span></div>
                </div>
                <div id="priceDisplay" class="price-display" style="display: none;"></div>
            </div>

            <button id="addToCartBtn" class="add-to-cart" style="display: none;"><svg class="gi" width="1.18em" height="1.18em" aria-hidden="true"><use href="icons.svg?v=4#ic-plus"></use></svg> افزودن به سبد خرید</button>
        </div>
    </div>

    <div class="contact-bar">
        <svg class="gi" width="1.18em" height="1.18em" aria-hidden="true"><use href="icons.svg?v=4#ic-phone"></use></svg> برای شرایط خرید و اطمینان از منبع تماس بگیرید:
        <a href="tel:${PHONE_TEL}">${PHONE_FA}</a> |
        <a href="tel:${PHONE2_TEL}">${PHONE2_FA}</a>
    </div>

    <footer>
        <p>فروشگاه گیم نت | تمامی حقوق محفوظ است</p>
    </footer>
</div>

<div class="bottom-nav">
    <a href="shop-index.html"><svg class="gi" width="1.18em" height="1.18em" aria-hidden="true"><use href="icons.svg?v=4#ic-home"></use></svg> خانه</a>
    <a href="cart.html"><svg class="gi" width="1.18em" height="1.18em" aria-hidden="true"><use href="icons.svg?v=4#ic-cart"></use></svg> سبد خرید</a>
    <a href="offers.html"><svg class="gi" width="1.18em" height="1.18em" aria-hidden="true"><use href="icons.svg?v=4#ic-gift"></use></svg> پیشنهادها</a>
    <a href="games.html" class="active"><svg class="gi" width="1.18em" height="1.18em" aria-hidden="true"><use href="icons.svg?v=4#ic-gamepad"></use></svg> بازی‌ها</a>
    <a href="giftcard.html"><svg class="gi" width="1.18em" height="1.18em" aria-hidden="true"><use href="icons.svg?v=4#ic-ticket"></use></svg> گیفت کارت</a>
</div>

<script src="script.js?v=4"></script>
<script>
    const gameData = {
        id: ${game.id},
        title: ${JSON.stringify(game.title)},
        size: ${JSON.stringify(shortSize(game.copySize))}
    };

    let selectedType = null;
    let selectedPrice = null;

    document.querySelectorAll('.type-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');

            selectedType = this.getAttribute('data-type');
            selectedPrice = this.getAttribute('data-price');

            const priceDisplay = document.getElementById('priceDisplay');
            priceDisplay.style.display = 'block';
            priceDisplay.textContent = '💰 قیمت ' + selectedType + ': ' + selectedPrice + ' تومان';

            document.getElementById('addToCartBtn').style.display = 'block';
        });
    });

    document.getElementById('addToCartBtn').addEventListener('click', function() {
        addToCart(gameData, selectedType, selectedPrice);
    });
</script>
</body>
</html>
`;
}

function redirectPage(target, title) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=${target}">
    <link rel="canonical" href="${target}">
    <meta name="robots" content="noindex">
    <title>${esc(title)} | فروشگاه گیم نت</title>
</head>
<body>
    <p>در حال انتقال به صفحهٔ جدید بازی… اگر منتقل نشدید <a href="${target}">اینجا کلیک کنید</a>.</p>
    <script>location.replace(${JSON.stringify(target)});</script>
</body>
</html>
`;
}

const outputs = new Map(); // path -> content

for (const game of available) {
  if (!game.slug || !Number.isInteger(game.id)) {
    throw new Error(`بازی موجود بدون slug/id: ${game.title}`);
  }
  outputs.set(`game-${game.slug}.html`, gamePage(game));
}

// ریدایرکت صفحات قدیمی (حفظ لینک‌های قبلی و سبدهای ذخیره‌شده با idهای ۱ تا ۳)
const redirects = {
  'game1.html': available.find(g => g.id === 1),
  'game2.html': available.find(g => g.id === 2),
  'game3.html': available.find(g => g.id === 3)
};
for (const [file, game] of Object.entries(redirects)) {
  if (game) outputs.set(file, redirectPage(`game-${game.slug}.html`, game.title));
}

// ---- games.html: بازسازی gamesList بین مارکرها ----
const gamesPath = resolve(root, 'games.html');
let gamesHtml = readFileSync(gamesPath, 'utf8');
const listForPage = [...available, ...unavailable].map(g => ({
  title: g.title,
  size: shortSize(g.copySize) || shortSize(g.origSize),
  img: g.img,
  type: g.status === 'موجود' ? 'کپی خور' : null,
  status: g.status,
  slug: g.slug || null
}));
const listJs = `const gamesList = ${JSON.stringify(listForPage, null, 8).replace(/\n/g, '\n    ')};`;
const markerRe = /(\/\/ === AUTO-GAMES-START ===)[\s\S]*?(\/\/ === AUTO-GAMES-END ===)/;
if (!markerRe.test(gamesHtml)) {
  throw new Error('مارکرهای AUTO-GAMES در games.html پیدا نشدند.');
}
gamesHtml = gamesHtml.replace(markerRe, `$1\n    ${listJs}\n    $2`);
outputs.set('games.html', gamesHtml);

// ---- sitemap.xml: بازسازی لینک صفحات بازی ----
const sitemapPath = resolve(root, 'sitemap.xml');
let sitemap = readFileSync(sitemapPath, 'utf8');
sitemap = sitemap.replace(/\s*<url><loc>https:\/\/javadxpro\.github\.io\/Gamenet\/game[^<]*<\/loc><lastmod>[^<]*<\/lastmod><\/url>/g, '');
const gameUrls = available
  .map(g => `\n  <url><loc>https://javadxpro.github.io/Gamenet/game-${g.slug}.html</loc><lastmod>2026-10-18</lastmod></url>`)
  .join('');
sitemap = sitemap.replace(/(<url><loc>https:\/\/javadxpro\.github\.io\/Gamenet\/games\.html<\/loc><lastmod>[^<]*<\/lastmod><\/url>)/, `$1${gameUrls}`);
outputs.set('sitemap.xml', sitemap);

// ---- نوشتن / بررسی ----
let stale = 0;
for (const [rel, content] of outputs) {
  const path = resolve(root, rel);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === content) continue;
  if (checkOnly) {
    stale++;
    console.error(`✗ قدیمی است و باید دوباره تولید شود: ${rel}`);
  } else {
    writeFileSync(path, content, 'utf8');
    console.log(`✓ تولید شد: ${rel}`);
  }
}

if (checkOnly) {
  if (stale > 0) {
    console.error(`❌ ${stale} فایل با games.json هم‌خوان نیست؛ node scripts/build-game-pages.mjs را اجرا کنید.`);
    process.exit(1);
  }
  console.log(`✅ صفحات هر ${available.length} بازی موجود با games.json به‌روزند.`);
} else {
  console.log(`\n${available.length} صفحهٔ اختصاصی بازی آماده است.`);
}
