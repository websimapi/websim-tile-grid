import { chunks, CHUNK_SIZE, BIOME_NOISE_SCALE, SNOW_THRESHOLD, gameObjects, snowAssets, TILE_SIZE } from './state.js';
import { registerTileOverride, removeTileOverride, getPlacedCampfires, markObjectRemoved, saveGame } from './save-system.js';
import { getTileType } from './terrain.js';
import { renderVisibleTiles } from './renderer.js';
import { biomeNoise2D } from './noise.js';

function changeTileType(tx, ty, fromType, toType) {
    const currentType = getTileType(tx, ty);
    // Do not melt a sprinkler tile
    if (currentType === 'sprinkler' || currentType !== fromType) {
        return;
    }

    registerTileOverride(tx, ty, toType);
    const chunkX = Math.floor(tx / CHUNK_SIZE);
    const chunkY = Math.floor(ty / CHUNK_SIZE);
    const chunk = chunks.get(`${chunkX},${chunkY}`);
    if (chunk) {
        const lx = tx - chunkX * CHUNK_SIZE;
        const ly = ty - chunkY * CHUNK_SIZE;
        chunk.tileOverrides.set(`${lx},${ly}`, { type: toType });
        renderVisibleTiles(true);
    }
}

export function applyMeltingFromCampfires(chunkX, chunkY) {
    const allCampfires = getPlacedCampfires();
    const MELT_RADIUS = 2;
    const chunkMinX = chunkX * CHUNK_SIZE;
    const chunkMaxX = (chunkX + 1) * CHUNK_SIZE - 1;
    const chunkMinY = chunkY * CHUNK_SIZE;
    const chunkMaxY = (chunkY + 1) * CHUNK_SIZE - 1;

    for (const { tx: campfireX, ty: campfireY } of allCampfires) {
        // Check if the campfire's melt radius could possibly intersect with this chunk
        if (campfireX + MELT_RADIUS < chunkMinX || campfireX - MELT_RADIUS > chunkMaxX ||
            campfireY + MELT_RADIUS < chunkMinY || campfireY - MELT_RADIUS > chunkMaxY) {
            continue;
        }

        // This campfire is close enough, check its surrounding tiles that fall within this chunk
        for (let dy = -MELT_RADIUS; dy <= MELT_RADIUS; dy++) {
            for (let dx = -MELT_RADIUS; dx <= MELT_RADIUS; dx++) {
                const checkX = campfireX + dx;
                const checkY = campfireY + dy;

                if (checkX >= chunkMinX && checkX <= chunkMaxX && checkY >= chunkMinY && checkY <= chunkMaxY) {
                    if (getTileType(checkX, checkY) === 'snow') {
                        registerTileOverride(checkX, checkY, 'grass');
                    }
                }
            }
        }
    }
}

function revertTileType(tx, ty) {
    const chunkX = Math.floor(tx / CHUNK_SIZE);
    const chunkY = Math.floor(ty / CHUNK_SIZE);
    const chunk = chunks.get(`${chunkX},${chunkY}`);

    // Do not refreeze a sprinkler tile
    if (getTileType(tx, ty) === 'sprinkler') return;

    if (removeTileOverride(tx, ty)) {
        if (chunk) {
            const lx = tx - chunkX * CHUNK_SIZE;
            const ly = ty - chunkY * CHUNK_SIZE;
            chunk.tileOverrides.delete(`${lx},${ly}`);
        }
        renderVisibleTiles(true);
    }
}

export function isTileOriginallySnow(tx, ty) {
    const v = biomeNoise2D(tx / BIOME_NOISE_SCALE, ty / BIOME_NOISE_SCALE);
    return v < SNOW_THRESHOLD;
}

export function startRefreezingSnow(removedCampfireX, removedCampfireY) {
    const MELT_RADIUS = 2;
    const allCampfires = getPlacedCampfires();

    for (let dy = -MELT_RADIUS; dy <= MELT_RADIUS; dy++) {
        for (let dx = -MELT_RADIUS; dx <= MELT_RADIUS; dx++) {
            const tileToRefreezeX = removedCampfireX + dx;
            const tileToRefreezeY = removedCampfireY + dy;

            // Only consider tiles that were originally snow and are now grass
            if (!isTileOriginallySnow(tileToRefreezeX, tileToRefreezeY) || getTileType(tileToRefreezeX, tileToRefreezeY) !== 'grass') {
                continue;
            }

            // Check if any *other* campfire is keeping this tile melted
            let isKeptMelted = false;
            for (const { tx: campfireX, ty: campfireY } of allCampfires) {
                const dist = Math.max(Math.abs(campfireX - tileToRefreezeX), Math.abs(campfireY - tileToRefreezeY));
                if (dist <= MELT_RADIUS) {
                    isKeptMelted = true;
                    break;
                }
            }

            if (!isKeptMelted) {
                // Stagger the refreezing effect
                const delay = (Math.max(Math.abs(dx), Math.abs(dy)) * 350) + (Math.random() * 200);
                setTimeout(() => {
                    revertTileType(tileToRefreezeX, tileToRefreezeY);

                    // NEW LOGIC: Refreeze nearby trees
                    const treeOnTile = gameObjects.find(obj => 
                        obj.type === 'tree' &&
                        Math.floor(obj.x / TILE_SIZE) === tileToRefreezeX &&
                        Math.floor((obj.y + 69 - TILE_SIZE) / TILE_SIZE) === tileToRefreezeY // 69 is TREE_HEIGHT
                    );
                    
                    if (treeOnTile && !treeOnTile.variant) {
                        treeOnTile.variant = snowAssets.tree;
                    }

                }, delay);
            }
        }
    }
}

export function startMeltingSnow(campfireX, campfireY) {
    const MELT_RADIUS = 2;
    for (let r = 1; r <= MELT_RADIUS; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) < r) continue;

                const tileToMeltX = campfireX + dx;
                const tileToMeltY = campfireY + dy;

                const delay = (r * 350) + (Math.random() * 200);
                setTimeout(() => {
                    changeTileType(tileToMeltX, tileToMeltY, 'snow', 'grass');
                    
                    // NEW LOGIC: Melt nearby trees
                    const treeOnTile = gameObjects.find(obj => 
                        obj.type === 'tree' &&
                        Math.floor(obj.x / TILE_SIZE) === tileToMeltX &&
                        Math.floor((obj.y + 69 - TILE_SIZE) / TILE_SIZE) === tileToMeltY // 69 is TREE_HEIGHT
                    );

                    if (treeOnTile && treeOnTile.variant) {
                        treeOnTile.variant = undefined;
                    }
                }, delay);
            }
        }
    }
}

const CAMPFIRE_IGNITION_RADIUS = 2 * TILE_SIZE;
const TREE_IGNITION_RADIUS = 1.5 * TILE_SIZE; // Trees spread fire in a smaller radius
const IGNITION_TIME = 5; // seconds for a tree to catch fire when near a source
const TREE_BURN_DURATION = 10; // seconds a tree burns before being destroyed
const FIRE_SPREAD_INTERVAL = 3; // seconds between spread attempts for a burning tree
const FIRE_SPREAD_CHANCE = 0.5; // 50% chance to spread to a neighbor

export function updateFires(delta) {
    const allTrees = gameObjects.filter(obj => obj.type === 'tree');
    // Early exit if no trees to manage
    if (allTrees.length === 0) return;

    // A fire source can be a campfire or another burning tree
    const fireSources = gameObjects.filter(obj => obj.type === 'campfire' || (obj.type === 'tree' && obj.isOnFire));
    
    // No fire sources, so nothing to do. We can also reset ignition timers.
    if (fireSources.length === 0) {
        for (const tree of allTrees) {
            if (tree.fireTimer) tree.fireTimer = 0;
        }
        return;
    }

    const treesToDestroy = [];

    // --- Main Fire Logic Loop ---
    for (const tree of allTrees) {
        if (tree.isOnFire) {
            // --- HANDLE BURNING TREE ---

            // Initialize timers if they don't exist
            if (tree.burnTimer === undefined) tree.burnTimer = 0;
            if (tree.spreadTimer === undefined) tree.spreadTimer = 0;

            // Increment timers
            tree.burnTimer += delta;
            tree.spreadTimer += delta;
            
            // Check if tree should be destroyed
            if (tree.burnTimer >= TREE_BURN_DURATION) {
                treesToDestroy.push(tree);
                continue; // Skip spread logic if it's already burning down this frame
            }

            // Check if it's time to attempt spreading fire
            if (tree.spreadTimer >= FIRE_SPREAD_INTERVAL) {
                tree.spreadTimer = 0; // Reset timer

                // Find nearby trees to potentially ignite
                for (const otherTree of allTrees) {
                    if (otherTree === tree || otherTree.isOnFire) continue;

                    const dx = (tree.x + TILE_SIZE / 2) - (otherTree.x + TILE_SIZE / 2);
                    const dy = (tree.y + TILE_SIZE) - (otherTree.y + TILE_SIZE); // Compare from the base of the trees
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= TREE_IGNITION_RADIUS) {
                        if (Math.random() < FIRE_SPREAD_CHANCE) {
                            otherTree.isOnFire = true;
                            // No ignition timer, it catches fire immediately from another tree
                        }
                    }
                }
            }

        } else {
            // --- HANDLE UNLIT TREE ---
            // Check if it's near any fire source and should start igniting

            let isNearFire = false;
            for (const source of fireSources) {
                const radius = source.type === 'campfire' ? CAMPFIRE_IGNITION_RADIUS : TREE_IGNITION_RADIUS;
                const sourceCenterX = source.x + TILE_SIZE / 2;
                // Use base of tree for Y, center for campfire
                const sourceCenterY = source.type === 'campfire' ? source.y + TILE_SIZE / 2 : source.y + TILE_SIZE;
                
                const treeCenterX = tree.x + TILE_SIZE / 2;
                const treeCenterY = tree.y + TILE_SIZE;

                const dx = treeCenterX - sourceCenterX;
                const dy = treeCenterY - sourceCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= radius) {
                    isNearFire = true;
                    break;
                }
            }

            if (isNearFire) {
                tree.fireTimer = (tree.fireTimer || 0) + delta;
                if (tree.fireTimer >= IGNITION_TIME) {
                    tree.isOnFire = true;
                    tree.fireTimer = 0; // Reset ignition timer
                }
            } else {
                // If not near fire, reset ignition progress
                tree.fireTimer = 0;
            }
        }
    }

    // --- Cleanup Phase ---
    // Remove all trees that have finished burning in a separate loop to avoid modifying the array while iterating.
    if (treesToDestroy.length > 0) {
        for (const deadTree of treesToDestroy) {
            const mainIndex = gameObjects.findIndex(obj => obj.id === deadTree.id);
            if (mainIndex > -1) {
                gameObjects.splice(mainIndex, 1);
            }
            markObjectRemoved(deadTree.id);
        }
        // Save the game state since the world has permanently changed
        saveGame();
    }
}