// ============================================================
//  نمایشگر FPS
// ============================================================

let frameCount = 0;
let lastFpsUpdate = performance.now();

function updateFPS() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 1000) {
        const fps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
        const el = document.getElementById('fpsValue');
        if (el) el.textContent = fps;
        frameCount = 0;
        lastFpsUpdate = now;
    }
    requestAnimationFrame(updateFPS);
}
updateFPS();

// ============================================================
//  WebGL - تیله‌های سه‌بعدی
// ============================================================

(function() {
    'use strict';

    // ========== گرفتن المان ==========
    const container = document.getElementById('webglCanvas');
    if (!container) {
        console.error('❌ webglCanvas پیدا نشد!');
        return;
    }

    // ========== تنظیمات کیفیت ==========
    let quality = sessionStorage.getItem('quality') || 'high';
    let testMode = false;

    const qualityConfig = {
        high: { balls: 60, size: 12, pixelRatio: 2, lights: 4 },
        medium: { balls: 35, size: 10, pixelRatio: 1.5, lights: 2 },
        low: { balls: 20, size: 8, pixelRatio: 1, lights: 1 }
    };

    const config = qualityConfig[quality] || qualityConfig.high;

    // ========== صحنه ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05050a);

    // ========== دوربین ==========
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 500;

    // ========== رندرر ==========
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.pixelRatio));
    renderer.setClearColor(0x05050a, 1);
    container.appendChild(renderer.domElement);

    // ============================================================
    //  تصویر پس‌زمینه (Skybox)
    // ============================================================

    const textureLoader = new THREE.TextureLoader();
    const imageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80';

    textureLoader.load(imageUrl, function(texture) {
        const skyGeo = new THREE.SphereGeometry(900, 32, 32);
        const skyMat = new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.BackSide,
            emissive: 0x222244,
            emissiveIntensity: 0.1
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.position.set(0, 0, 0);
        scene.add(sky);
    });

    // ============================================================
    //  نورها
    // ============================================================

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0xff6a00, 1.2, 800);
    light1.position.set(200, 200, 300);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x00ffff, 1.0, 800);
    light2.position.set(-200, -200, 300);
    scene.add(light2);

    const light3 = new THREE.PointLight(0xff00ff, 0.8, 800);
    light3.position.set(0, 300, -200);
    scene.add(light3);

    const hemiLight = new THREE.HemisphereLight(0x4488ff, 0x442200, 0.6);
    scene.add(hemiLight);

    // ============================================================
    //  ساخت تیله‌ها
    // ============================================================

    function createBalls(count, sizeConfig) {
        const items = [];
        const colors = [
            0xff6a00, 0xff00ff, 0x00ffff, 0xffff00,
            0x00ff88, 0xff4444, 0x8800ff, 0xff8800
        ];

        for (let i = 0; i < count; i++) {
            const radius = 120 + Math.random() * 180;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const size = 3 + Math.random() * sizeConfig;
            const color = colors[Math.floor(Math.random() * colors.length)];

            const geometry = new THREE.SphereGeometry(size, 24, 24);
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3,
                shininess: 80,
                specular: 0xffffff
            });

            const ball = new THREE.Mesh(geometry, material);
            ball.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
            );
            ball.userData = {
                radius: radius,
                theta: theta,
                phi: phi,
                speed: 0.001 + Math.random() * 0.002,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                size: size,
                color: color
            };

            scene.add(ball);
            items.push(ball);
        }
        return items;
    }

    // ============================================================
    //  ساخت چراغ‌ها (حالت تست)
    // ============================================================

    function createLights(count) {
        const items = [];
        const lightColors = [
            0xff0000, 0x00ff00, 0x0000ff, 0xffff00,
            0xff00ff, 0x00ffff, 0xff8800, 0x00ff88,
            0xff0066, 0x6600ff, 0xffaa00, 0x00aaff
        ];

        for (let i = 0; i < count; i++) {
            const radius = 150 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const color = lightColors[Math.floor(Math.random() * lightColors.length)];

            // هسته چراغ
            const coreGeo = new THREE.SphereGeometry(8 + Math.random() * 15, 16, 16);
            const coreMat = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 2.0,
                shininess: 100,
                specular: 0xffffff
            });
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
            );
            core.userData = {
                radius: radius,
                theta: theta,
                phi: phi,
                speed: 0.001 + Math.random() * 0.002,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                baseColor: color,
                size: 8 + Math.random() * 15
            };
            scene.add(core);
            items.push(core);

            // هاله نور
            const glowGeo = new THREE.SphereGeometry(16 + Math.random() * 25, 16, 16);
            const glowMat = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 1.0,
                transparent: true,
                opacity: 0.3,
                shininess: 50
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.copy(core.position);
            glow.userData = {
                parent: core,
                baseSize: 16 + Math.random() * 25,
                phase: Math.random() * Math.PI * 2
            };
            scene.add(glow);
            items.push(glow);

            // نور نقطه‌ای
            const pointLight = new THREE.PointLight(color, 2.5, 300);
            pointLight.position.copy(core.position);
            scene.add(pointLight);
            items.push(pointLight);
        }
        return items;
    }

    // ============================================================
    //  مدیریت اشیاء
    // ============================================================

    let objects = [];

    function rebuildScene(mode) {
        // حذف اشیاء قبلی
        objects.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
            scene.remove(obj);
        });
        objects = [];

        const config = qualityConfig[quality] || qualityConfig.high;

        if (mode) {
            objects = createLights(config.lights);
        } else {
            objects = createBalls(config.balls, config.size);
        }
    }

    rebuildScene(false);

    // ============================================================
    //  تغییر حالت تست
    // ============================================================

    window.toggleTestMode = function() {
        testMode = !testMode;
        rebuildScene(testMode);

        const btn = document.querySelector('.btn-test');
        if (btn) {
            if (testMode) {
                btn.innerHTML = '<i class="fas fa-gamepad"></i> حالت عادی';
                btn.style.background = 'rgba(0, 255, 100, 0.15)';
                btn.style.color = '#4ade80';
            } else {
                btn.innerHTML = '<i class="fas fa-microchip"></i> تست نور';
                btn.style.background = 'rgba(0, 200, 255, 0.15)';
                btn.style.color = '#00ddff';
            }
        }
    };

    // ============================================================
    //  تغییر کیفیت
    // ============================================================

    window.qualityChange = function(level) {
        quality = level;
        sessionStorage.setItem('quality', level);

        const qualityNames = {
            high: '🔴 بالا',
            medium: '🟡 متوسط',
            low: '🟢 کم مصرف'
        };
        const qualityColors = {
            high: '#4ade80',
            medium: '#fbbf24',
            low: '#f87171'
        };

        const el = document.getElementById('qualityText');
        if (el) {
            el.textContent = qualityNames[level] || 'بالا';
            el.style.color = qualityColors[level] || '#fbbf24';
        }

        rebuildScene(testMode);
    };

    // ============================================================
    //  انیمیشن
    // ============================================================

    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        const items = objects.filter(obj => obj.userData && obj.userData.radius !== undefined);

        items.forEach((obj, index) => {
            const data = obj.userData;
            data.theta += data.speed * 0.8;
            data.phi += data.speed * 0.3;

            const r = data.radius + Math.sin(time + index) * 10;
            obj.position.x = r * Math.sin(data.phi) * Math.cos(data.theta);
            obj.position.y = r * Math.cos(data.phi) + Math.sin(time * 0.5 + index) * 15;
            obj.position.z = r * Math.sin(data.phi) * Math.sin(data.theta);

            obj.rotation.x += data.rotSpeed || 0;
            obj.rotation.y += (data.rotSpeed || 0) * 0.7;

            // تغییر رنگ در حالت تست
            if (testMode && obj.material && obj.material.emissive) {
                const hue = (time * 0.03 + index * 0.005) % 1;
                const color = new THREE.Color().setHSL(hue, 1, 0.6);
                obj.material.color.set(color);
                obj.material.emissive.set(color);

                if (obj.material.emissiveIntensity) {
                    obj.material.emissiveIntensity = 1.5 + Math.sin(time * 2 + index) * 0.8;
                }
            }
        });

        // به‌روزرسانی هاله‌ها
        objects.forEach(obj => {
            if (obj.userData && obj.userData.parent) {
                const parent = obj.userData.parent;
                obj.position.copy(parent.position);
                const scale = 1 + Math.sin(time * 1.5 + obj.userData.phase) * 0.2;
                obj.scale.set(scale, scale, scale);
                if (obj.material) {
                    obj.material.opacity = 0.2 + Math.sin(time * 1.2 + obj.userData.phase) * 0.15;
                }
            }
            if (obj.isLight && obj.userData && obj.userData.parent) {
                obj.position.copy(obj.userData.parent.position);
            }
        });

        // چرخش آرام صحنه
        scene.rotation.y += 0.0006;
        scene.rotation.x = Math.sin(time * 0.0003) * 0.03;

        renderer.render(scene, camera);
    }

    animate();

    // ============================================================
    //  ریسپانسیو
    // ============================================================

    window.addEventListener('resize', function() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    window.addEventListener('beforeunload', function() {
        renderer.dispose();
    });

    console.log('✅ WebGL راه‌اندازی شد!');
    console.log('📊 کیفیت:', quality, '| تعداد تیله:', config.balls);

})();

// ============================================================
//  انیمیشن کلیک (برای همه صفحات)
// ============================================================

function burstEffectHandler(event, element) {
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // حلقه‌های نورانی
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

    // جرقه‌های رنگی
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

    // حذف المان‌های انیمیشن
    setTimeout(() => {
        element.querySelectorAll('.burst, .ring').forEach(el => el.remove());
    }, 700);

    // هدایت به لینک
    setTimeout(() => {
        const href = element.getAttribute('href');
        if (href && href !== '#') {
            window.location.href = href;
        }
    }, 300);
}
// ============================================================
//  اعلان‌های زیبا
// ============================================================

function showNotification(text, duration = 2000) {
    const old = document.querySelector('.immersive-notification');
    if (old) old.remove();
    
    const div = document.createElement('div');
    div.className = 'immersive-notification';
    div.textContent = text;
    div.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(15px);
        color: #fff;
        padding: 12px 24px;
        border-radius: 12px;
        border: 1px solid rgba(255,106,0,0.2);
        font-family: 'Vazirmatn', system-ui;
        font-size: 0.9rem;
        z-index: 10002;
        opacity: 0;
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(div);
    
    requestAnimationFrame(() => {
        div.style.opacity = '1';
        div.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => div.remove(), 500);
    }, duration);
}
// ============================================================
//  واکنش به موزیک
// ============================================================

window.updateLightsWithAudio = function(intensity) {
    if (typeof lights === 'undefined') return;
    
    lights.forEach((item, i) => {
        if (!item.isGalaxy && item.light) {
            // تغییر شدت نور بر اساس موزیک
            const baseIntensity = currentQuality === 'nasa' ? 5 : 3.5;
            item.light.intensity = baseIntensity + intensity * 3;
            
            // تغییر رنگ نور بر اساس موزیک
            if (i % 2 === 0) {
                const hue = (time * 0.02 + i * 0.05) % 1;
                item.light.color.setHSL(hue, 1, 0.5 + intensity * 0.3);
            }
        }
    });
    
    // تغییر اندازه کره‌ها
    spheres.forEach((sphere, i) => {
        const scale = 1 + intensity * 0.2 * Math.sin(time + i);
        sphere.scale.set(scale, scale, scale);
    });
};