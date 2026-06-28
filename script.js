// ============================================================
//  سبد خرید - توابع اصلی
// ============================================================

function getCart() {
    return JSON.parse(localStorage.getItem('gameCart')) || [];
}

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
    
    let cart = getCart();
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

function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
    if (typeof renderCart === 'function') renderCart();
}

function changeQty(id, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity = Math.max(1, (item.quantity || 1) + delta);
        saveCart(cart);
        if (typeof renderCart === 'function') renderCart();
    }
}

// ============================================================
//  نمایش سبد خرید
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
                    <a href="index.html" style="color:#ff6a00; font-weight:bold;">بازگشت به فروشگاه</a>
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
        let price = parseInt(String(item.price).replace(/,/g, '')) || 150000;
        subtotal += price * (item.quantity || 1);
    });
    
    if (container) {
        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="item-title">${item.title} ${item.type ? `(${item.type})` : ''}</div>
                <div class="item-price-row">
                    <div class="price-tag">${Number(item.price).toLocaleString()} تومان</div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button class="remove-btn" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                        <div class="quantity-control">
                            <button onclick="changeQty(${item.id}, -1)">-</button>
                            <span>${item.quantity || 1}</span>
                            <button onclick="changeQty(${item.id}, 1)">+</button>
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

// ============================================================
//  کد پیگیری سفارش
// ============================================================

function generateOrderCode(username, cart) {
    const itemsPart = cart.map(item => {
        const tag = item.title.substring(0, 4).toUpperCase();
        return `${tag}x${item.quantity || 1}`;
    }).join('_');
    const date = new Date().toLocaleDateString('fa-IR').replace(/\//g, '.');
    let total = 0;
    cart.forEach(item => {
        let price = parseInt(String(item.price).replace(/,/g, '')) || 150000;
        total += price * (item.quantity || 1);
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
    
    const user = JSON.parse(localStorage.getItem('gameUser'));
    if (!user) {
        alert('لطفاً ابتدا در صفحه اصلی ثبت نام کنید!');
        window.location.href = 'index.html';
        return;
    }
    
    const code = generateOrderCode(user.username, cart);
    const orderCodeDiv = document.getElementById('orderCodeDiv');
    const orderCodeEl = document.getElementById('orderCode');
    const orderDetailsEl = document.getElementById('orderDetails');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (orderCodeDiv) orderCodeDiv.style.display = 'block';
    if (orderCodeEl) orderCodeEl.innerHTML = code;
    
    let orderDetails = '';
    let total = 0;
    cart.forEach(item => {
        let price = parseInt(String(item.price).replace(/,/g, '')) || 150000;
        total += price * (item.quantity || 1);
        orderDetails += `${item.title} ${item.type ? `(${item.type})` : ''} × ${item.quantity || 1} = ${(price * (item.quantity || 1)).toLocaleString()} تومان<br>`;
    });
    
    if (orderDetailsEl) {
        orderDetailsEl.innerHTML = `
            <strong>📦 جزئیات سفارش:</strong><br>
            ${orderDetails}
            <strong>💰 مبلغ کل: ${total.toLocaleString()} تومان</strong><br>
            <strong>👤 نام: ${user.fullName}</strong><br>
            <strong>🆔 نام کاربری: ${user.username}</strong><br>
            <strong>📞 تلفن: ${user.phone}</strong><br>
            <strong>📧 ایمیل: ${user.email}</strong>
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
//  ثبت نام کاربر
// ============================================================

function registerUser() {
    const fullName = document.getElementById('fullName');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const statusEl = document.getElementById('userStatus');
    
    if (!fullName || !username || !email || !phone) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff4444;">❌ همه فیلدها را پر کنید!</span>';
        return;
    }
    
    if (!fullName.value || !username.value || !email.value || !phone.value) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff4444;">❌ همه فیلدها را پر کنید!</span>';
        return;
    }
    
    const user = {
        fullName: fullName.value,
        username: username.value,
        email: email.value,
        phone: phone.value
    };
    
    localStorage.setItem('gameUser', JSON.stringify(user));
    
    if (statusEl) {
        statusEl.innerHTML = `<span style="color:#4ade80;">✅ ${fullName.value} عزیز ثبت نام شدید!</span>`;
    }
    
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

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    if (menu) menu.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
}

function openMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    if (menu) menu.classList.add('open');
    if (overlay) overlay.classList.add('show');
}

function closeMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    if (menu) menu.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

// ============================================================
//  انیمیشن کلیک (burstEffect)
// ============================================================

function burstEffectHandler(event, element) {
    event.preventDefault();
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
        const href = element.getAttribute('href');
        if (href && href !== '#') {
            window.location.href = href;
        }
    }, 300);
}

// ============================================================
//  اجرا در صفحه (DOM Ready)
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    
    updateCartCount();
    
    if (document.getElementById('cartItems')) {
        renderCart();
    }
    
    const menuBtn = document.getElementById('menuBtn');
    const closeMenuBtn = document.getElementById('closeMenu');
    const overlay = document.getElementById('overlay');
    
    if (menuBtn) menuBtn.addEventListener('click', openMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.addEventListener('click', function() {
            const user = JSON.parse(localStorage.getItem('gameUser'));
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
<script>
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
    const user = JSON.parse(localStorage.getItem('gameUser'));
    const nameEl = document.getElementById('userNameDisplay');
    if (nameEl) {
        nameEl.textContent = user ? user.fullName : 'کاربر مهمان';
    }
}

function showLoginModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('accountMenu').style.display = 'none';
    } else {
        window.location.href = 'index.html';
    }
}

function logoutUser() {
    if (confirm('آیا مطمئن هستید؟')) {
        localStorage.removeItem('gameUser');
        updateUserDisplay();
        document.getElementById('accountMenu').style.display = 'none';
        alert('✅ با موفقیت خارج شدید');
    }
}

// ============================================================
//  ثبت نام کاربر (همون تابع قبلی)
// ============================================================
function registerUser() {
    const fullName = document.getElementById('fullName');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const statusEl = document.getElementById('userStatus');
    
    if (!fullName || !username || !email || !phone) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff4444;">❌ همه فیلدها را پر کنید!</span>';
        return;
    }
    
    if (!fullName.value || !username.value || !email.value || !phone.value) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff4444;">❌ همه فیلدها را پر کنید!</span>';
        return;
    }
    
    const user = { fullName: fullName.value, username: username.value, email: email.value, phone: phone.value };
    localStorage.setItem('gameUser', JSON.stringify(user));
    
    if (statusEl) statusEl.innerHTML = `<span style="color:#4ade80;">✅ ${fullName.value} عزیز ثبت نام شدید!</span>`;
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
//  اجرا
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    updateUserDisplay();
});
</script>