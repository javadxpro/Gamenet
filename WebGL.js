// ========== نمایشگر FPS ==========
let frameCount = 0;
let lastFpsUpdate = performance.now();

function updateFPS() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 1000) {
        const fps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
        document.getElementById('fpsValue').textContent = fps;
        frameCount = 0;
        lastFpsUpdate = now;
    }
    requestAnimationFrame(updateFPS);
}
updateFPS();

// ============================================================
//  WebGL - تیله‌های دورانی با Three.js
// ============================================================
(function() {
    const container = document.getElementById('webglCanvas');
    if (!container) return;

    // ========== تنظیمات کیفیت ==========
    let quality = 'high';
    let testMode = false;

    const qualityConfig = {
        high: { balls: 60, size: 12, pixelRatio: 2 },
        medium: { balls: 35, size: 10, pixelRatio: 1.5 },
        low: { balls: 20, size: 8, pixelRatio: 1 }
    };

    if (window.getQuality) {
        quality = window.getQuality();
    }

    const config = qualityConfig[quality] || qualityConfig.high;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05050a);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.pixelRatio));
    renderer.setClearColor(0x05050a, 1);
    container.appendChild(renderer.domElement);

    // ========== نورها ==========
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0xff6a00, 1, 800);
    light1.position.set(200, 200, 300);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x00ffff, 0.8, 800);
    light2.position.set(-200, -200, 300);
    scene.add(light2);

    const light3 = new THREE.PointLight(0xff00ff, 0.6, 800);
    light3.position.set(0, 300, -200);
    scene.add(light3);

    // ========== توابع ساخت ==========
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
                emissiveIntensity: 0.2,
                shininess: 80,
                specular: 0xffffff,
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
                specular: 0xffffff,
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
                baseColor: color
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
                shininess: 50,
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

    // ========== ساخت اشیاء اولیه ==========
    let objects = [];

    function rebuildScene(mode) {
        objects.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
            scene.remove(obj);
        });
        objects = [];

        if (mode) {
            objects = createLights(35);
        } else {
            objects = createBalls(config.balls, config.size);
        }
    }

    rebuildScene(false);

    // ========== تابع تغییر حالت ==========
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

    // ========== گوش دادن به تغییرات کیفیت ==========
    window.addEventListener('message', function(event) {
        if (event.data.type === 'qualityChange') {
            quality = event.data.quality;
            location.reload();
        }
    });

    // ========== انیمیشن ==========
    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        objects.forEach((obj, index) => {
            if (obj.userData && obj.userData.radius !== undefined) {
                const data = obj.userData;
                data.theta += data.speed * 0.8;
                data.phi += data.speed * 0.3;

                const r = data.radius + Math.sin(time + index) * 10;
                obj.position.x = r * Math.sin(data.phi) * Math.cos(data.theta);
                obj.position.y = r * Math.cos(data.phi) + Math.sin(time * 0.5 + index) * 15;
                obj.position.z = r * Math.sin(data.phi) * Math.sin(data.theta);

                obj.rotation.x += data.rotSpeed || 0;
                obj.rotation.y += (data.rotSpeed || 0) * 0.7;

                // تغییر رنگ چراغ‌ها (حالت تست)
                if (testMode && obj.material && obj.material.emissive) {
                    const hue = (time * 0.03 + index * 0.005) % 1;
                    const color = new THREE.Color().setHSL(hue, 1, 0.6);
                    obj.material.color.set(color);
                    obj.material.emissive.set(color);
                    
                    if (obj.material.emissiveIntensity) {
                        obj.material.emissiveIntensity = 1.5 + Math.sin(time * 2 + index) * 0.8;
                    }
                }
            }

            // به‌روزرسانی هاله‌ها
            if (obj.userData && obj.userData.parent) {
                const parent = obj.userData.parent;
                obj.position.copy(parent.position);
                const scale = 1 + Math.sin(time * 1.5 + obj.userData.phase) * 0.2;
                obj.scale.set(scale, scale, scale);
                if (obj.material) {
                    obj.material.opacity = 0.2 + Math.sin(time * 1.2 + obj.userData.phase) * 0.15;
                }
            }

            // به‌روزرسانی نورهای نقطه‌ای
            if (obj.isLight && obj.userData && obj.userData.parent) {
                obj.position.copy(obj.userData.parent.position);
            }
        });

        scene.rotation.y += 0.0006;
        scene.rotation.x = Math.sin(time * 0.0003) * 0.03;

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    window.addEventListener('beforeunload', () => {
        renderer.dispose();
    });
})();

// ============================================================
//  انیمیشن کلیک دکمه
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
        burst.style.left = cx + 'px';
        burst.style.top = cy + 'px';
        const size = 4 + Math.random() * 12;
        burst.style.width = size + 'px';
        burst.style.height = size + 'px';
        burst.style.background = colors[Math.floor(Math.random() * colors.length)];
        burst.style.boxShadow = `0 0 ${size * 2}px ${burst.style.background}`;
        burst.style.animationDelay = (Math.random() * 0.15) + 's';
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