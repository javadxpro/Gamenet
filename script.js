// ============================================================
//  ابزارهای امن خواندن از localStorage
//  (دادهٔ خراب/دست‌کاری‌شده نباید کل اسکریپت صفحه را از کار بیندازد)
// ============================================================

function safeParseJSON(raw, fallback) {
    if (raw == null) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed == null ? fallback : parsed;
    } catch {
        return fallback;
    }
}

function getCart() {
    const cart = safeParseJSON(localStorage.getItem('gameCart'), []);
    return Array.isArray(cart) ? cart : [];
}

function getUser() {
    const user = safeParseJSON(localStorage.getItem('gameUser'), null);
    return user && typeof user === 'object' && !Array.isArray(user) ? user : null;
}

// تبدیل ارقام فارسی/عربی به لاتین (برای اعتبارسنجی تلفن/ایمیل)
function toLatinDigits(value) {
    return String(value == null ? '' : value)
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

// ============================================================
//  سبد خرید - توابع اصلی
// ============================================================

function saveCart(cart) {
    localStorage.setItem('gameCart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
    });
}

function addToCart(gameData, selectedType, selectedPrice) {
    if (!selectedType) {
        alert('لطفاً ابتدا حالت خرید را انتخاب کنید!');
        return false;
    }

    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === gameData.id && item.type === selectedType);

    if (existingIndex !== -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        cart.push({
            id: gameData.id,
            title: gameData.title,
            type: selectedType,
            price: selectedPrice,
            quantity: 1
        });
    }

    saveCart(cart);
    alert(`${gameData.title} (${selectedType}) با قیمت ${selectedPrice} تومان به سبد خرید اضافه شد!`);
    return true;
}

function removeFromCart(id, type) {
    // id ممکن است از data-* به‌صورت رشته بیاید؛ مقایسه را نوع‌آزاد انجام می‌دهیم
    const cart = getCart().filter(item => !(String(item.id) === String(id) && (item.type || '') === (type || '')));
    saveCart(cart);
    if (typeof renderCart === 'function') renderCart();
}

function changeQty(id, type, delta) {
    const cart = getCart();
    const item = cart.find(i => String(i.id) === String(id) && (i.type || '') === (type || ''));
    if (item) {
        item.quantity = Math.max(1, (item.quantity || 1) + delta);
        saveCart(cart);
        if (typeof renderCart === 'function') renderCart();
    }
}

// ============================================================
// تبدیل کاراکترهای خاص HTML (جلوگیری از تزریق HTML در خروجی innerHTML)
// ============================================================

function escHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// تبدیل قیمت رشته‌ای (مثلاً "150,000") به عدد صحیح
function parsePrice(price) {
    const n = parseInt(String(price).replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

// قیمت مؤثر یک قلم: اگر قیمت نامعتبر بود، همان مبلغ پیش‌فرضِ جمع کل استفاده می‌شود
// تا قیمت نمایشیِ هر قلم با «قابل پرداخت» تناقض نداشته باشد.
const FALLBACK_PRICE = 150000;
function effectivePrice(item) {
    return parsePrice(item.price) || FALLBACK_PRICE;
}

// ============================================================
//  نمایش سبد خرید
//  نکتهٔ امنیتی: عنوان/نوع کالا از localStorage می‌آید و قابل دست‌کاری است؛
//  بنابراین در onclick اینلاین interpolate نمی‌شود. دکمه‌ها data-* دارند
//  و با event delegation (در انتهای فایل) مدیریت می‌شوند.
// ============================================================

function renderCart() {
    const container = document.getElementById('cartItems');
    const summaryContainer = document.getElementById('cartSummary');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const cart = getCart();

    if (!cart || cart.length === 0) {
        if (container) {
            container.innerHTML = `
                <div class="empty-cart">
                    🛒 سبد خرید شما خالی است
                    <br><br>
                    <a href="shop-index.html" style="color:#ff6a00; font-weight:bold;">بازگشت به فروشگاه</a>
                </div>
            `;
        }
        if (summaryContainer) summaryContainer.innerHTML = '';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        const orderDiv = document.getElementById('orderCodeDiv');
        if (orderDiv) orderDiv.style.display = 'none';
        return;
    }

    let subtotal = 0;
    cart.forEach(item => {
        subtotal += effectivePrice(item) * (item.quantity || 1);
    });

    if (container) {
        container.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="item-title">${escHtml(item.title)} ${item.type ? `(${escHtml(item.type)})` : ''}</div>
                <div class="item-price-row">
                    <div class="price-tag">${effectivePrice(item).toLocaleString()} تومان</div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button class="remove-btn" data-cart-action="remove" data-index="${index}" aria-label="حذف از سبد">
                            <svg class="gi" aria-hidden="true"><use href="icons.svg#ic-trash"></use></svg>
                        </button>
                        <div class="quantity-control">
                            <button data-cart-action="dec" data-index="${index}" aria-label="کم کردن تعداد">-</button>
                            <span>${item.quantity || 1}</span>
                            <button data-cart-action="inc" data-index="${index}" aria-label="زیاد کردن تعداد">+</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="cart-summary">
                <div class="summary-row">
                    <span>مجموع</span>
                    <span>${subtotal.toLocaleString()} تومان</span>
                </div>
                <div class="total">
                    <span>قابل پرداخت</span>
                    <span>${subtotal.toLocaleString()} تومان</span>
                </div>
            </div>
        `;
    }

    if (checkoutBtn) checkoutBtn.style.display = 'block';
}

// حذف/تغییر تعداد با ایندکسِ قلم در آرایه (بدون درگیر شدن با id/type کاربر)
function handleCartAction(action, index) {
    const cart = getCart();
    const item = cart[index];
    if (!item) return;
    if (action === 'remove') {
        cart.splice(index, 1);
        saveCart(cart);
    } else if (action === 'inc' || action === 'dec') {
        item.quantity = Math.max(1, (item.quantity || 1) + (action === 'inc' ? 1 : -1));
        saveCart(cart);
    } else {
        return;
    }
    renderCart();
}

// ============================================================
//  کد پیگیری سفارش
// ============================================================

function generateOrderCode(username, cart) {
    const itemsPart = cart.map(item => {
        const tag = String(item.title == null ? '' : item.title).substring(0, 4).toUpperCase();
        return `${tag}x${item.quantity || 1}`;
    }).join('_');
    const date = new Date().toLocaleDateString('fa-IR').replace(/\//g, '.');
    let total = 0;
    cart.forEach(item => {
        total += effectivePrice(item) * (item.quantity || 1);
    });
    return `${username}_${itemsPart}_${date}_${total.toLocaleString()}`;
}

function copyOrderCode() {
    const code = document.getElementById('orderCode');
    if (!code) return;
    navigator.clipboard.writeText(code.innerText)
        .then(() => {
            const msg = document.getElementById('copySuccess');
            if (msg) {
                msg.style.display = 'block';
                setTimeout(() => msg.style.display = 'none', 2000);
            }
        })
        .catch(() => alert('لطفاً دستی کپی کنید: ' + code.innerText));
}

function checkout() {
    const cart = getCart();
    if (!cart || cart.length === 0) {
        alert('سبد خرید شما خالی است!');
        return;
    }

    const user = getUser();
    if (!user) {
        alert('لطفاً ابتدا در صفحه اصلی ثبت نام کنید!');
        window.location.href = 'shop-index.html';
        return;
    }

    const code = generateOrderCode(user.username, cart);
    const orderCodeDiv = document.getElementById('orderCodeDiv');
    const orderCodeEl = document.getElementById('orderCode');
    const orderDetailsEl = document.getElementById('orderDetails');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (orderCodeDiv) orderCodeDiv.style.display = 'block';
    if (orderCodeEl) orderCodeEl.textContent = code;

    let orderDetails = '';
    let total = 0;
    cart.forEach(item => {
        const price = effectivePrice(item);
        total += price * (item.quantity || 1);
        orderDetails += `${escHtml(item.title)} ${item.type ? `(${escHtml(item.type)})` : ''} × ${item.quantity || 1} = ${(price * (item.quantity || 1)).toLocaleString()} تومان<br>`;
    });

    if (orderDetailsEl) {
        orderDetailsEl.innerHTML = `
            <strong>📦 جزئیات سفارش:</strong><br>
            ${orderDetails}
            <strong>💰 مبلغ کل: ${total.toLocaleString()} تومان</strong><br>
            <strong>👤 نام: ${escHtml(user.fullName)}</strong><br>
            <strong>🆔 نام کاربری: ${escHtml(user.username)}</strong><br>
            <strong>📞 تلفن: ${escHtml(user.phone)}</strong><br>
            <strong>📧 ایمیل: ${escHtml(user.email)}</strong>
        `;
    }

    if (checkoutBtn) checkoutBtn.style.display = 'none';

    localStorage.setItem('lastOrderCode', code);
    localStorage.setItem('lastOrderCart', JSON.stringify(cart));
    localStorage.setItem('lastOrderUser', JSON.stringify(user));

    saveCart([]);
    if (typeof renderCart === 'function') renderCart();
    updateCartCount();

    setTimeout(copyOrderCode, 100);
    alert(`✅ سفارش شما ثبت شد!\n📌 کد پیگیری: ${code}\n📞 لطفاً با شماره‌های تماس، هماهنگی کنید.`);
}

// ============================================================
//  ثبت نام کاربر (با اعتبارسنجی واقعی؛ قبلاً هر متن غیرخالی قبول می‌شد)
// ============================================================

function setUserStatus(statusEl, message, ok) {
    if (!statusEl) return;
    statusEl.innerHTML = '';
    const span = document.createElement('span');
    span.style.color = ok ? '#4ade80' : '#ff4444';
    span.textContent = message;
    statusEl.appendChild(span);
}

function registerUser() {
    const fullName = document.getElementById('fullName');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const statusEl = document.getElementById('userStatus');

    if (!fullName || !username || !email || !phone) {
        setUserStatus(statusEl, '❌ همه فیلدها را پر کنید!', false);
        return;
    }

    const user = {
        fullName: fullName.value.trim(),
        username: username.value.trim(),
        email: toLatinDigits(email.value.trim()),
        phone: toLatinDigits(phone.value.trim()).replace(/[\s-]/g, '')
    };

    if (!user.fullName || !user.username || !user.email || !user.phone) {
        setUserStatus(statusEl, '❌ همه فیلدها را پر کنید!', false);
        return;
    }
    if (user.username.length < 3) {
        setUserStatus(statusEl, '❌ نام کاربری باید حداقل ۳ حرف باشد!', false);
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(user.email)) {
        setUserStatus(statusEl, '❌ ایمیل معتبر نیست! (مثل example@mail.com)', false);
        return;
    }
    if (!/^09\d{9}$/.test(user.phone)) {
        setUserStatus(statusEl, '❌ شماره تلفن باید ۱۱ رقم و با 09 شروع شود!', false);
        return;
    }

    localStorage.setItem('gameUser', JSON.stringify(user));
    setUserStatus(statusEl, `✅ ${user.fullName} عزیز ثبت نام شدید!`, true);
    updateUserDisplay();

    setTimeout(() => {
        const modal = document.getElementById('authModal');
        if (modal) modal.style.display = 'none';
    }, 1500);
}

function closeModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

// ============================================================
//  منو (همبرگری)
// ============================================================

function syncMenuAria() {
    const menu = document.getElementById('sideMenu');
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn && menu) {
        menuBtn.setAttribute('aria-expanded', menu.classList.contains('open') ? 'true' : 'false');
    }
}

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    if (menu) menu.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
    syncMenuAria();
}

function openMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    if (menu) menu.classList.add('open');
    if (overlay) overlay.classList.add('show');
    syncMenuAria();
}

function closeMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    if (menu) menu.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    syncMenuAria();
}

// ============================================================
//  انیمیشن کلیک (burstEffect)
// ============================================================

function burstEffectHandler(event, element) {
    event.preventDefault();
    const href = element.getAttribute('href');
    const openInNewTab = element.getAttribute('target') === '_blank';
    const rect = element.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    for (let i = 0; i < 3; i++) {
        const ring = document.createElement('span');
        ring.className = 'ring';
        ring.style.width = (20 + i * 15) + 'px';
        ring.style.height = (20 + i * 15) + 'px';
        ring.style.borderColor = ['#ff6a00', '#ff00ff', '#00ffff'][i];
        ring.style.animationDelay = (i * 0.08) + 's';
        ring.style.position = 'absolute';
        ring.style.top = '50%';
        ring.style.left = '50%';
        ring.style.transform = 'translate(-50%, -50%)';
        ring.style.borderRadius = '50%';
        ring.style.border = '4px solid';
        ring.style.pointerEvents = 'none';
        ring.style.animation = 'ringEffect 0.5s ease-out forwards';
        ring.style.zIndex = '-1';
        element.appendChild(ring);
    }

    const colors = ['#ff6a00', '#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#00ff88'];
    for (let i = 0; i < 20; i++) {
        const burst = document.createElement('span');
        burst.className = 'burst';
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 60;
        burst.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
        burst.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
        burst.style.position = 'absolute';
        burst.style.left = cx + 'px';
        burst.style.top = cy + 'px';
        const size = 4 + Math.random() * 12;
        burst.style.width = size + 'px';
        burst.style.height = size + 'px';
        burst.style.borderRadius = '50%';
        burst.style.background = colors[Math.floor(Math.random() * colors.length)];
        burst.style.boxShadow = `0 0 ${size * 2}px ${burst.style.background}`;
        burst.style.pointerEvents = 'none';
        burst.style.animation = 'burstEffect 0.5s ease-out forwards';
        burst.style.animationDelay = (Math.random() * 0.15) + 's';
        burst.style.zIndex = '-1';
        element.appendChild(burst);
    }

    setTimeout(() => {
        element.querySelectorAll('.burst, .ring').forEach(el => el.remove());
    }, 700);

    setTimeout(() => {
        if (href && href !== '#') {
            // لینک‌های target="_blank" (مثل آلبوم عکس) نباید تب فعلی را از سایت خارج کنند
            if (openInNewTab) {
                window.open(href, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = href;
            }
        }
    }, 300);
}

// ============================================================
//  مدیریت حساب کاربری
// ============================================================

function toggleAccountMenu() {
    const menu = document.getElementById('accountMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        if (menu.style.display === 'block') {
            updateUserDisplay();
        }
    }
}

function updateUserDisplay() {
    const user = getUser();
    const nameEl = document.getElementById('userNameDisplay');
    if (nameEl) {
        nameEl.textContent = user ? user.fullName : 'کاربر مهمان';
    }
}

function showLoginModal() {
    const modal = document.getElementById('authModal');
    const accountMenu = document.getElementById('accountMenu');
    if (accountMenu) accountMenu.style.display = 'none';
    if (modal) {
        modal.style.display = 'flex';
    } else {
        window.location.href = 'shop-index.html';
    }
}

function logoutUser() {
    if (confirm('آیا مطمئن هستید؟')) {
        localStorage.removeItem('gameUser');
        updateUserDisplay();
        const accountMenu = document.getElementById('accountMenu');
        if (accountMenu) accountMenu.style.display = 'none';
        alert('✅ با موفقیت خارج شدید');
    }
}

// ============================================================
//  اجرا در صفحه (DOM Ready)
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();
    updateUserDisplay();

    if (document.getElementById('cartItems')) {
        renderCart();
    }

    // دکمه‌های سبد خرید (حذف/تعداد) با delegation — بدون onclick اینلاین
    document.addEventListener('click', function(event) {
        const btn = event.target.closest('[data-cart-action]');
        if (!btn) return;
        handleCartAction(btn.getAttribute('data-cart-action'), parseInt(btn.getAttribute('data-index'), 10));
    });

    const menuBtn = document.getElementById('menuBtn');
    const closeMenuBtn = document.getElementById('closeMenu');
    const overlay = document.getElementById('overlay');

    if (menuBtn) menuBtn.addEventListener('click', openMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    // بستن منو/مودال با Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeMenu();
            closeModal();
        }
    });

    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.addEventListener('click', function() {
            const user = getUser();
            if (user) {
                alert(`👤 ${user.fullName}\n🆔 ${user.username}\n📞 ${user.phone}\n📧 ${user.email}`);
            } else {
                const modal = document.getElementById('authModal');
                if (modal) modal.style.display = 'flex';
            }
        });
    }

    const registerBtn = document.querySelector('#authModal button:first-child');
    if (registerBtn) {
        registerBtn.addEventListener('click', registerUser);
    }
});
