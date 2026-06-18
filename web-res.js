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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05050a);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x05050a, 1);
    container.appendChild(renderer.domElement);

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

    const balls = [];
    const NUM_BALLS = 60;
    const colors = [
        0xff6a00, 0xff00ff, 0x00ffff, 0xffff00,
        0x00ff88, 0xff4444, 0x8800ff, 0xff8800
    ];

    for (let i = 0; i < NUM_BALLS; i++) {
        const radius = 120 + Math.random() * 180;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const size = 3 + Math.random() * 12;
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
        balls.push(ball);
    }

    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        balls.forEach((ball, index) => {
            const data = ball.userData;
            data.theta += data.speed * 0.8;
            data.phi += data.speed * 0.3;

            const r = data.radius + Math.sin(time + index) * 10;
            ball.position.x = r * Math.sin(data.phi) * Math.cos(data.theta);
            ball.position.y = r * Math.cos(data.phi) + Math.sin(time * 0.5 + index) * 15;
            ball.position.z = r * Math.sin(data.phi) * Math.sin(data.theta);

            ball.rotation.x += data.rotSpeed;
            ball.rotation.y += data.rotSpeed * 0.7;

            if (index % 2 === 0) {
                const hue = (time * 0.02 + index * 0.01) % 1;
                const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
                ball.material.color.set(color);
                ball.material.emissive.set(color);
            }
        });

        scene.rotation.y += 0.0008;
        scene.rotation.x = Math.sin(time * 0.0005) * 0.05;

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