import { playerState, gameObjects, TILE_SIZE, BIOME_NOISE_SCALE, BIOME_THRESHOLD, LOG_ITEM_PICKUP_DISTANCE, LOG_ITEM_HEIGHT, CACTUS_PIECE_HEIGHT, LOG_ITEM_WIDTH, CACTUS_PIECE_WIDTH, STONE_ITEM_WIDTH, STONE_ITEM_HEIGHT, farmlandState, FARMLAND_GROWTH_TIME, WHEAT_ITEM_HEIGHT, WHEAT_ITEM_WIDTH, BAMBOO_ITEM_HEIGHT, BAMBOO_ITEM_WIDTH, COAL_ITEM_HEIGHT, COAL_ITEM_WIDTH } from './state.js';
import { biomeNoise2D } from './noise.js';
import { addItemToInventory } from './inventory-manager.js';
import { farmlandGrowthStages, potatoGrowthStages } from './asset-manager.js';

// --- Item Collection Logic ---
function handleItemCollection() {
    const playerCenterX = playerState.x + (TILE_SIZE / 2);
    const playerCenterY = playerState.y + (TILE_SIZE / 2);

    for (let i = gameObjects.length - 1; i >= 0; i--) {
        const obj = gameObjects[i];
        if (obj.type === 'log_item' || obj.type === 'cactus_piece' || obj.type === 'stone_item' || obj.type === 'copper_ore_item' || obj.type === 'ice_chunk' || obj.type === 'ice_medalion' || obj.type === 'wheat_item' || obj.type === 'bamboo_item' || obj.type === 'wheat_seeds_item' || obj.type === 'potato_item' || obj.type === 'potato_seeds_item' || obj.type === 'coal_item') {
            // Check if the pickup delay has passed
            if (obj.pickupDelay && obj.pickupDelay > 0) {
                continue;
            }

            const dx = playerCenterX - (obj.x + (TILE_SIZE / 2));
            const dy = playerCenterY - (obj.y + (TILE_SIZE / 2));
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < LOG_ITEM_PICKUP_DISTANCE) {
                addItemToInventory(obj.type, 1);
                gameObjects.splice(i, 1);
            }
        }
    }
}

// --- Farmland Growth Logic ---
function updateFarmland(delta) {
    // We update all farmland objects in the game world.
    // Inactive ones (far from player) won't have `el` and won't be updated.
    for (const obj of gameObjects) {
        if (obj.type !== 'growing_farmland') continue;

        const growthStages = obj.crop === 'potato' ? potatoGrowthStages : farmlandGrowthStages;

        // Only grow if seeds have been planted (stage > 0)
        if (obj.stage > 0 && obj.stage < growthStages.length - 1) {
            obj.growthTimer += delta;
            if (obj.growthTimer >= FARMLAND_GROWTH_TIME) {
                obj.growthTimer = 0;
                obj.stage++;
                // update the visual if the element exists
                if (obj.el) {
                     obj.el.style.backgroundImage = `url(${growthStages[obj.stage]})`;
                }
            }
        }
    }
}

// --- Tumbleweed Update Logic ---
function updateTumbleweeds(delta) {
    const GRAVITY = 350; // pixels/s^2
    const HOP_VELOCITY = 150; // pixels/s

    for (const tw of gameObjects) {
        if (tw.type !== 'tumbleweed') continue;

        tw.stateTimer -= delta;

        if (tw.stateTimer <= 0) {
            if (tw.state === 'idle') {
                tw.state = 'moving';
                tw.stateTimer = 3 + Math.random() * 4; // Move for 3-7 seconds
                const angle = Math.random() * 2 * Math.PI;
                tw.dx = Math.cos(angle);
                tw.dy = Math.sin(angle);
                tw.vz = HOP_VELOCITY; // Start a hop
            } else { // moving
                tw.state = 'idle';
                tw.stateTimer = 2 + Math.random() * 3; // Idle for 2-5 seconds
                tw.dx = 0;
                tw.dy = 0;
            }
        }

        // Movement
        if (tw.state === 'moving') {
            const speed = 50; // pixels per second
            const nextX = tw.x + tw.dx * speed * delta;
            const nextY = tw.y + tw.dy * speed * delta;

            // Simple check to stay in the desert
            const nextTileX = Math.floor(nextX / TILE_SIZE);
            const nextTileY = Math.floor(nextY / TILE_SIZE);
            const biomeValue = biomeNoise2D(nextTileX / BIOME_NOISE_SCALE, nextTileY / BIOME_NOISE_SCALE);

            if (biomeValue > BIOME_THRESHOLD) { // Is sand
                tw.x = nextX;
                tw.y = nextY;
            } else { // Hit a non-desert tile, change direction
                tw.dx *= -1;
                tw.dy *= -1;
            }

            // Add rotation based on movement
            const rotationSpeed = 200; // degrees per second
            const rotationDirection = Math.sign(tw.dx) || 1; // Rotate based on horizontal direction
            tw.rotation = (tw.rotation + rotationSpeed * rotationDirection * delta) % 360;
        }

        // Hopping physics
        if (tw.state === 'moving' && tw.z <= 0 && tw.vz <= 0 && Math.random() < 0.05) {
            tw.vz = HOP_VELOCITY * (0.5 + Math.random() * 0.5);
        }

        if (tw.z > 0 || tw.vz > 0) {
            tw.vz -= GRAVITY * delta;
            tw.z += tw.vz * delta;
            if (tw.z < 0) {
                tw.z = 0;
                tw.vz = 0;
            }
        }

        // Update visual element if it exists (is on screen)
        if (tw.el) {
            tw.el.style.left = `${tw.x}px`;
            tw.el.style.top = `${tw.y + TILE_SIZE - 40}px`; // 40 is tumbleweed height
            tw.el.style.transform = `translateY(-${tw.z}px) rotate(${tw.rotation || 0}deg)`;
        }
    }
}

// --- Dropped Item Physics Logic ---
function updateDroppedItems(delta) {
    const GRAVITY = 600;
    const DAMPENING = 0.6;
    const FRICTION = 0.98;
    const MAX_BOUNCES = 2;

    const droppedItems = gameObjects.filter(obj =>
        (obj.type === 'log_item' || obj.type === 'cactus_piece' || obj.type === 'stone_item' || obj.type === 'copper_ore_item' || obj.type === 'ice_chunk' || obj.type === 'ice_medalion' || obj.type === 'wheat_item' || obj.type === 'bamboo_item' || obj.type === 'wheat_seeds_item' || obj.type === 'potato_item' || obj.type === 'potato_seeds_item' || obj.type === 'coal_item') && obj.hasOwnProperty('z')
    );

    // 1. Update individual physics (gravity, ground friction, etc.)
    for (const item of droppedItems) {
        // Update pickup delay timer
        if (item.pickupDelay > 0) {
            item.pickupDelay -= delta;
        }

        // Apply gravity if in the air
        if (item.z > 0 || item.vz > 0) {
            item.vz -= GRAVITY * delta;
            item.z += item.vz * delta;
        }

        // Horizontal movement while airborne
        if (item.z > 0) {
            item.x += item.vx * delta;
            item.y += item.vy * delta;
        }

        // Check for ground collision (bounce)
        if (item.z < 0) {
            item.z = 0;
            item.bounces++;
            if (item.bounces <= MAX_BOUNCES) {
                item.vz = -item.vz * DAMPENING; // Reverse and dampen velocity
                item.vx *= DAMPENING;
                item.vy *= DAMPENING;
                // If bounce is too small, just stop it
                if (item.vz < 10) {
                    item.vz = 0;
                    item.bounces = MAX_BOUNCES + 1; // Prevent further bouncing
                }
            } else {
                item.vz = 0; // Stop vertical movement
            }
        }

        // Apply friction if on the ground and still moving
        if (item.z === 0 && (item.vx !== 0 || item.vy !== 0)) {
            item.vx *= FRICTION;
            item.vy *= FRICTION;
            // Stop movement if it's very slow
            if (Math.abs(item.vx) < 1 && Math.abs(item.vy) < 1) {
                item.vx = 0;
                item.vy = 0;
            }
        }
    }

    // 2. Resolve inter-item collisions to prevent overlap and exchange momentum
    const COLLISION_ITERATIONS = 4; // Iterate multiple times for stability
    for (let i = 0; i < COLLISION_ITERATIONS; i++) {
        for (let j = 0; j < droppedItems.length; j++) {
            for (let k = j + 1; k < droppedItems.length; k++) {
                const itemA = droppedItems[j];
                const itemB = droppedItems[k];

                // Only check for collisions on the ground for simplicity
                if (itemA.z > 2 || itemB.z > 2) continue;

                const dx = itemB.x - itemA.x;
                const dy = itemB.y - itemA.y;
                const distanceSq = dx * dx + dy * dy;

                const radiusA = (itemA.type === 'log_item' ? LOG_ITEM_WIDTH : (itemA.type === 'cactus_piece' ? CACTUS_PIECE_WIDTH : (itemA.type === 'wheat_item' ? WHEAT_ITEM_WIDTH : (itemA.type === 'bamboo_item' ? BAMBOO_ITEM_WIDTH : (itemA.type === 'potato_item' || itemA.type === 'potato_seeds_item' || itemA.type === 'coal_item' ? COAL_ITEM_WIDTH : STONE_ITEM_WIDTH))))) * 0.45;
                const radiusB = (itemB.type === 'log_item' ? LOG_ITEM_WIDTH : (itemB.type === 'cactus_piece' ? CACTUS_PIECE_WIDTH : (itemB.type === 'wheat_item' ? WHEAT_ITEM_WIDTH : (itemB.type === 'bamboo_item' ? BAMBOO_ITEM_WIDTH : (itemB.type === 'potato_item' || itemB.type === 'potato_seeds_item' || itemB.type === 'coal_item' ? COAL_ITEM_WIDTH : STONE_ITEM_WIDTH))))) * 0.45;
                const minDistance = radiusA + radiusB;

                if (distanceSq > 0.001 && distanceSq < minDistance * minDistance) {
                    const distance = Math.sqrt(distanceSq);

                    // --- Positional Correction ---
                    const overlap = (minDistance - distance) / 2; // Each moves by half the overlap
                    const collisionNormalX = dx / distance;
                    const collisionNormalY = dy / distance;

                    itemA.x -= collisionNormalX * overlap;
                    itemA.y -= collisionNormalY * overlap;
                    itemB.x += collisionNormalX * overlap;
                    itemB.y += collisionNormalY * overlap;

                    // --- Rigid Body Velocity Response ---
                    const v_rel_x = itemA.vx - itemB.vx;
                    const v_rel_y = itemA.vy - itemB.vy;
                    const dot = v_rel_x * collisionNormalX + v_rel_y * collisionNormalY;

                    if (dot > 0) continue;

                    const impulse_x = dot * collisionNormalX;
                    const impulse_y = dot * collisionNormalY;

                    const RESTITUTION = 0.5;

                    itemA.vx -= impulse_x * (1 + RESTITUTION);
                    itemA.vy -= impulse_y * (1 + RESTITUTION);
                    itemB.vx += impulse_x * (1 + RESTITUTION);
                    itemB.vy += impulse_y * (1 + RESTITUTION);
                }
            }
        }
    }

    // 3. Update visual elements (DOM) after all physics calculations
    for (const item of droppedItems) {
        if (item.el) {
            item.el.style.left = `${item.x}px`;
            const itemHeight = item.type === 'log_item' ? LOG_ITEM_HEIGHT : (item.type === 'cactus_piece' ? CACTUS_PIECE_HEIGHT : (item.type === 'wheat_item' ? WHEAT_ITEM_HEIGHT : (item.type === 'bamboo_item' ? BAMBOO_ITEM_HEIGHT : (item.type === 'potato_item' || item.type === 'potato_seeds_item' ? 30 : (item.type === 'coal_item' ? COAL_ITEM_HEIGHT : STONE_ITEM_HEIGHT)))));
            item.el.style.top = `${item.y + TILE_SIZE - itemHeight}px`;
            item.el.style.transform = `translateY(-${item.z}px)`;
        }
    }
}

/**
 * Main update function for all non-player entities.
 * @param {number} deltaSeconds - Time since the last frame.
 */
export function updateEntities(deltaSeconds) {
    handleItemCollection();
    updateTumbleweeds(deltaSeconds);
    updateDroppedItems(deltaSeconds);
    updateFarmland(deltaSeconds);
}