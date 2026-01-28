/**
 * NINJA ARASHI CLONE - CORE ENGINE
 * Features: Double Jump, Dash, Parallax, Mobile Controls, and Particles.
 */

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 576,
    parent: 'game-container',
    transparent: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1600 },
            debug: false
        }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let player, platforms, hazards, cursors;
let isDashing = false;
let jumpCount = 0;
let dashCooldown = false;
let health = 100;

function preload() {
    // 1. Generate Ninja Texture
    const n = this.make.graphics({ x: 0, y: 0, add: false });
    n.fillStyle(0x000000); // Pure Shadow
    n.fillRect(0, 0, 30, 48);
    n.generateTexture('ninja', 30, 48);

    // 2. Generate Ground/Platforms
    const p = this.make.graphics({ x: 0, y: 0, add: false });
    p.fillStyle(0x0a0a0a);
    p.fillRect(0, 0, 100, 100);
    p.generateTexture('ground', 100, 100);

    // 3. Generate Spikes
    const s = this.make.graphics({ x: 0, y: 0, add: false });
    s.fillStyle(0x8b0000);
    s.fillTriangle(0, 30, 15, 0, 30, 30);
    s.generateTexture('spike', 30, 30);

    // 4. Particle Texture
    const dot = this.make.graphics({ x: 0, y: 0, add: false });
    dot.fillStyle(0xffffff, 0.5);
    dot.fillCircle(4, 4, 4);
    dot.generateTexture('dust', 8, 8);
}

function create() {
    // A. World Setup
    this.physics.world.setBounds(0, 0, 4000, 576);
    
    // B. Atmospheric Background
    this.cameras.main.setBackgroundColor('#1a1a2e');
    createMoonlight(this);

    // C. Physics Groups
    platforms = this.physics.add.staticGroup();
    hazards = this.physics.add.staticGroup();

    // D. Level Building (Example Layout)
    createLongGround(0, 530, 10);   // Start area
    createLongGround(1200, 530, 5); // Jump gap ground
    createLongGround(1900, 400, 3); // High platform
    
    // Add Spikes
    hazards.create(600, 515, 'spike');
    hazards.create(630, 515, 'spike');
    hazards.create(1500, 515, 'spike');

    // E. Player Setup
    player = this.physics.add.sprite(150, 400, 'ninja');
    player.setCollideWorldBounds(true);
    player.body.setGravityY(200);

    // F. Particles (Jump/Dash Dust)
    const emitter = this.add.particles(0, 0, 'dust', {
        speed: 100,
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        lifespan: 300,
        emitting: false
    });

    // G. Collisions
    this.physics.add.collider(player, platforms, () => {
        if (player.body.touching.down) jumpCount = 0;
    });
    this.physics.add.overlap(player, hazards, handleDeath, null, this);

    // H. Controls (Keyboard)
    cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
        dash: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });

    // I. Camera
    this.cameras.main.startFollow(player, true, 0.1, 0.1);

    // J. Mobile Button Logic
    setupMobileButtons(this);
}

function update() {
    if (isDashing || health <= 0) return;

    // Movement Logic
    const speed = 350;
    if (cursors.left.isDown || this.moveLeft) {
        player.setVelocityX(-speed);
        player.flipX = true;
    } else if (cursors.right.isDown || this.moveRight) {
        player.setVelocityX(speed);
        player.flipX = false;
    } else {
        player.setVelocityX(0);
    }

    // Jump Logic
    if (Phaser.Input.Keyboard.JustDown(cursors.up) || this.doJump) {
        if (jumpCount < 2) {
            player.setVelocityY(-650);
            jumpCount++;
            this.doJump = false; // Reset mobile trigger
        }
    }

    // Dash Logic
    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) || this.doDash) {
        performDash(this);
        this.doDash = false; // Reset mobile trigger
    }

    // Out of bounds death
    if (player.y > 570) handleDeath.call(this);
}

/** * HELPER FUNCTIONS 
 */

function createLongGround(x, y, scaleX) {
    let g = platforms.create(x, y, 'ground');
    g.setOrigin(0, 0);
    g.setScale(scaleX, 1).refreshBody();
}

function createMoonlight(scene) {
    for (let i = 0; i < 3; i++) {
        let circle = scene.add.circle(500, 400, 200 + (i * 150), 0x2e2e4a, 0.1);
        circle.setScrollFactor(i * 0.1);
    }
}

function performDash(scene) {
    if (dashCooldown) return;

    isDashing = true;
    dashCooldown = true;
    
    const direction = player.flipX ? -1 : 1;
    player.body.allowGravity = false;
    player.setVelocityY(0);
    player.setVelocityX(1200 * direction);
    player.setAlpha(0.5);

    // Shake camera for impact
    scene.cameras.main.shake(100, 0.01);

    scene.time.delayedCall(200, () => {
        isDashing = false;
        player.body.allowGravity = true;
        player.setAlpha(1);
    });

    // 2 second cooldown for Dash
    scene.time.delayedCall(1500, () => { dashCooldown = false; });
}

function handleDeath() {
    health -= 100; // Instant death for now
    document.getElementById('health-bar').style.width = '0%';
    
    this.physics.pause();
    player.setTint(0xff0000);
    
    document.getElementById('msg-screen').classList.remove('hidden');
}

function setupMobileButtons(scene) {
    // These link to the IDs in your index.html
    const bindBtn = (id, prop) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('pointerdown', () => { scene[prop] = true; });
        btn.addEventListener('pointerup', () => { scene[prop] = false; });
        btn.addEventListener('pointerout', () => { scene[prop] = false; });
    };

    bindBtn('btn-left', 'moveLeft');
    bindBtn('btn-right', 'moveRight');
    
    // Jump and Dash are "JustDown" events
    document.getElementById('btn-jump').addEventListener('pointerdown', () => { scene.doJump = true; });
    document.getElementById('btn-dash').addEventListener('pointerdown', () => { scene.doDash = true; });
}
