import { playerState, keysPressed, gameObjects, playerSprites, PLAYER_SPEED, PLAYER_ACCELERATION, PLAYER_FRICTION, PLAYER_COLLISION_BOX, mouseState, FOOTSTEP_INTERVAL, TILE_SIZE, BIOME_THRESHOLD, SNOW_THRESHOLD, BIOME_NOISE_SCALE, joystickState, mobileMove } from './state.js';
import { playGeneratedSound } from './audio-manager.js';
import { getTileType } from './terrain.js';

function checkCollision(playerX, playerY) {
    const playerBox = {
        x: playerX + PLAYER_COLLISION_BOX.offsetX,
        y: playerY + PLAYER_COLLISION_BOX.offsetY,
        width: PLAYER_COLLISION_BOX.width,
        height: PLAYER_COLLISION_BOX.height
    };

    for (const obj of gameObjects) {
        if (!obj.collisionBox || obj.type === 'log_item') continue;
        const objBox = obj.collisionBox;

        if (
            playerBox.x < objBox.x + objBox.width &&
            playerBox.x + playerBox.width > objBox.x &&
            playerBox.y < objBox.y + objBox.height &&
            playerBox.y + playerBox.height > objBox.y
        ) {
            return true;
        }
    }
    return false;
}

export function handlePlayerMovement(deltaSeconds = 0) {
    if (deltaSeconds <= 0) return false;

    // --- Hunger-based speed penalty ---
    const speedMultiplier = playerState.currentHunger > 0 ? 1.0 : 0.5; // 50% speed when starving
    const currentSpeedLimit = PLAYER_SPEED * speedMultiplier;
    const currentAcceleration = PLAYER_ACCELERATION * speedMultiplier;

    let targetDx = 0;
    let targetDy = 0;

    // If the player is performing a chop action, disallow any new movement input.
    // The player will slide to a stop based on friction.
    if (!playerState.isChopping) {
        if (mobileMove.active) {
            const px = playerState.x + TILE_SIZE / 2;
            const py = playerState.y + TILE_SIZE / 2;
            const dx = mobileMove.tx - px;
            const dy = mobileMove.ty - py;
            const dist = Math.hypot(dx, dy);
            if (dist < 10) {
                mobileMove.active = false;
            } else {
                targetDx = dx / dist;
                targetDy = dy / dist;
            }
        } else if (joystickState.active) {
            targetDx = joystickState.x;
            targetDy = joystickState.y;
        } else {
            if (keysPressed.w || keysPressed.ArrowUp) targetDy -= 1;
            if (keysPressed.s || keysPressed.ArrowDown) targetDy += 1;
            if (keysPressed.a || keysPressed.ArrowLeft) targetDx -= 1;
            if (keysPressed.d || keysPressed.ArrowRight) targetDx += 1;
        }
    }

    // --- Acceleration ---
    if (targetDx !== 0 || targetDy !== 0) {
        // Normalize the direction vector
        const magnitude = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
        if (magnitude > 1) {
            targetDx /= magnitude;
            targetDy /= magnitude;
        }

        playerState.vx += targetDx * currentAcceleration * deltaSeconds;
        playerState.vy += targetDy * currentAcceleration * deltaSeconds;

    // --- Friction (Deceleration) ---
    } else {
        const currentSpeed = Math.sqrt(playerState.vx * playerState.vx + playerState.vy * playerState.vy);
        if (currentSpeed > 0) {
            const frictionMagnitude = Math.min(currentSpeed, PLAYER_FRICTION * deltaSeconds);
            playerState.vx -= (playerState.vx / currentSpeed) * frictionMagnitude;
            playerState.vy -= (playerState.vy / currentSpeed) * frictionMagnitude;
        }
    }

    // --- Speed Limiting ---
    const currentSpeed = Math.sqrt(playerState.vx * playerState.vx + playerState.vy * playerState.vy);
    if (currentSpeed > currentSpeedLimit) {
        const factor = currentSpeedLimit / currentSpeed;
        playerState.vx *= factor;
        playerState.vy *= factor;
    }

    // --- Stop if velocity is negligible ---
    if (Math.abs(playerState.vx) < 1 && Math.abs(playerState.vy) < 1 && targetDx === 0 && targetDy === 0) {
        playerState.vx = 0;
        playerState.vy = 0;
    }

    // --- Collision and Position Update ---
    let newX = playerState.x + playerState.vx * deltaSeconds;
    let newY = playerState.y + playerState.vy * deltaSeconds;

    if (!checkCollision(newX, playerState.y)) {
        playerState.x = newX;
    } else {
        playerState.vx = 0; // Stop horizontal movement on collision
    }

    if (!checkCollision(playerState.x, newY)) {
        playerState.y = newY;
    } else {
        playerState.vy = 0; // Stop vertical movement on collision
    }

    // Determine if the player is considered "moving" for animation purposes
    const isEffectivelyMoving = Math.abs(playerState.vx) > 5 || Math.abs(playerState.vy) > 5;
    return isEffectivelyMoving;
}

export function updatePlayerAnimation(isMoving, playerEl, deltaSeconds) {
    // If the player is chopping, the direction is locked in by the interaction handler.
    if (!playerState.isChopping) {
        // Only flip player based on mouse if joystick is not active
        if (!joystickState.active) {
            const screenCenterX = window.innerWidth / 2;
            const cursorIsRight = mouseState.x > screenCenterX;

            if (cursorIsRight) {
                if (playerState.facingDirection !== 'right') {
                    playerState.facingDirection = 'right';
                    playerEl.style.transform = 'scaleX(1)';
                }
            } else {
                if (playerState.facingDirection !== 'left') {
                    playerState.facingDirection = 'left';
                    playerEl.style.transform = 'scaleX(-1)';
                }
            }
        } else { // Flip player based on joystick direction
            if (joystickState.x > 0.1 && playerState.facingDirection !== 'right') {
                 playerState.facingDirection = 'right';
                 playerEl.style.transform = 'scaleX(1)';
            } else if (joystickState.x < -0.1 && playerState.facingDirection !== 'left') {
                 playerState.facingDirection = 'left';
                 playerEl.style.transform = 'scaleX(-1)';
            }
        }
    }

    if (isMoving) {
        if (playerState.currentAnimation !== 'walking' && !playerState.isChopping) {
            playerState.currentAnimation = 'walking';
            playerEl.style.backgroundImage = `url(${playerSprites.walking})`;
        }
        // --- Footstep Sound Logic ---
        playerState.footstepTimer -= deltaSeconds;
        if (playerState.footstepTimer <= 0) {
            playerState.footstepTimer = FOOTSTEP_INTERVAL;

            // Determine ground material based on the center of the player's collision box
            const playerFeetX = playerState.x + PLAYER_COLLISION_BOX.offsetX + (PLAYER_COLLISION_BOX.width / 2);
            const playerFeetY = playerState.y + PLAYER_COLLISION_BOX.offsetY + (PLAYER_COLLISION_BOX.height / 2);
            const tileX = Math.floor(playerFeetX / TILE_SIZE);
            const tileY = Math.floor(playerFeetY / TILE_SIZE);
            
            const tileType = getTileType(tileX, tileY);
            let material = tileType || 'grass';
            if (material === 'farmland') material = 'wood'; // Use wood sound for farmland for now
            playGeneratedSound('footstep', { material });
        }
    } else {
        if (playerState.currentAnimation !== 'idle' && !playerState.isChopping) {
            playerState.currentAnimation = 'idle';
            playerEl.style.backgroundImage = `url(${playerSprites.idle})`;
        }
        // Reset timer when stopping so the first step is immediate next time.
        playerState.footstepTimer = 0;
    }
}