import { playerState, gameObjects, playerSprites, TILE_SIZE, PLAYER_COLLISION_BOX, INTERACTION_DISTANCE, CHOP_ANIMATION_DURATION, inventory, cameraState } from './state.js';
import { playGeneratedSound, playSound } from './audio-manager.js';
import { pseudoRandom } from './utils.js';
import { markObjectRemoved, registerCampfireRemoved, saveGame, removeTileOverride, registerOvenRemoved } from './save-system.js';
import { spawnLogItem, spawnCactusPiece, spawnStoneItem, spawnCopperAndRock, spawnIceChunk, spawnRandomLoot, spawnWheatItem, spawnBambooItem, spawnItem } from './item-spawner.js';
import { isTileOriginallySnow, startRefreezingSnow } from './environment.js';
import { getTileType } from './terrain.js';
import { renderVisibleTiles } from './renderer.js';
import { farmlandGrowthStages, potatoGrowthStages } from './asset-manager.js';
import { consumeSelectedItem } from './inventory-manager.js';
import { handleObjectDestruction } from './resource-gathering.js';

let itemIdCounter = 0;
let chopTimeoutId = null; // To manage the timeout for resetting the chopping state

function breakSprinkler(tileX, tileY, tileType) {
    if (playerState.isChopping) return;

    const playerEl = document.getElementById('player');

    playerState.isChopping = true;
    playerState.currentAnimation = 'chopping';
    playerEl.style.backgroundImage = `url(${playerSprites.rockBreaking})`;

    cameraState.shake = 10;
    playGeneratedSound('rock_break');

    handleObjectDestruction({ type: tileType, x: tileX * TILE_SIZE, y: tileY * TILE_SIZE });

    // Remove surrounding farmland
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const farmX = tileX + dx;
            const farmY = tileY + dy;
            
            const farmlandIndex = gameObjects.findIndex(obj => 
                obj.type === 'growing_farmland' && 
                Math.floor(obj.x / TILE_SIZE) === farmX &&
                Math.floor(obj.y / TILE_SIZE) === farmY
            );

            if (farmlandIndex > -1) {
                gameObjects.splice(farmlandIndex, 1);
            }
        }
    }
    
    // Force re-render of tiles to show the change
    renderVisibleTiles(true);

    if (chopTimeoutId) {
        clearTimeout(chopTimeoutId);
    }

    chopTimeoutId = setTimeout(() => {
        playerState.isChopping = false;
        chopTimeoutId = null;
    }, CHOP_ANIMATION_DURATION);
}

function breakGrass(tileX, tileY) {
    if (playerState.isChopping) return;

    const playerEl = document.getElementById('player');

    playerState.isChopping = true;
    playerState.currentAnimation = 'chopping';
    playerEl.style.backgroundImage = `url(${playerSprites.chopping})`;

    playSound('dirt_dig');

    // Always drop 1 seed, 50/50 between wheat and potato
    const spawnPos = { x: tileX * TILE_SIZE, y: tileY * TILE_SIZE };
    const seedType = Math.random() < 0.5 ? 'wheat_seeds_item' : 'potato_seeds_item';
    spawnItem(spawnPos, seedType, 1);

    if (chopTimeoutId) {
        clearTimeout(chopTimeoutId);
    }

    chopTimeoutId = setTimeout(() => {
        playerState.isChopping = false;
        chopTimeoutId = null;
    }, CHOP_ANIMATION_DURATION);
}

export function plantSeeds(hoveredTile, seedType) {
    const selectedItem = inventory.hotbar[inventory.selectedHotbarIndex];
    if (!selectedItem || selectedItem.type !== seedType) {
        return false;
    }
    
    const cropType = seedType === 'wheat_seeds_item' ? 'wheat' : 'potato';

    const currentTileType = getTileType(hoveredTile.x, hoveredTile.y);
    const farmlandObject = gameObjects.find(obj => {
        if (obj.type !== 'growing_farmland') return false;
        const objTileX = Math.floor(obj.x / TILE_SIZE);
        const objTileY = Math.floor(obj.y / TILE_SIZE);
        return objTileX === hoveredTile.x && objTileY === hoveredTile.y;
    });

    // Allow planting on empty farmland (stage 0) OR on a base farmland tile
    if ((farmlandObject && farmlandObject.stage === 0) || (currentTileType === 'farmland' && !farmlandObject)) {
        const worldX = hoveredTile.x * TILE_SIZE;
        const worldY = hoveredTile.y * TILE_SIZE;

        const dx = (playerState.x + TILE_SIZE / 2) - (worldX + TILE_SIZE / 2);
        const dy = (playerState.y + PLAYER_COLLISION_BOX.offsetY + PLAYER_COLLISION_BOX.height / 2) - (worldY + TILE_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < INTERACTION_DISTANCE) {
            if (consumeSelectedItem(1)) {
                if (farmlandObject) { // If a 'growing_farmland' object exists, update it
                    farmlandObject.stage = 1;
                    farmlandObject.growthTimer = 0;
                    farmlandObject.crop = cropType;
                    if (farmlandObject.el) {
                        const stages = cropType === 'potato' ? potatoGrowthStages : farmlandGrowthStages;
                        farmlandObject.el.style.backgroundImage = `url(${stages[1]})`;
                    }
                } else { // Otherwise, create a new 'growing_farmland' object
                    const newFarmlandObject = {
                        el: null,
                        id: `farmland_${hoveredTile.x}_${hoveredTile.y}`,
                        x: worldX,
                        y: worldY,
                        type: 'growing_farmland',
                        className: 'farmland-overlay',
                        stage: 1, // Start at stage 1 since we just planted
                        growthTimer: 0,
                        crop: cropType,
                        collisionBox: null
                    };
                    gameObjects.push(newFarmlandObject);
                }

                saveGame();
                return true;
            }
        }
    }
    return false;
}

function harvestFarmland(target) {
    if (!target || playerState.isChopping) return;
    const playerEl = document.getElementById('player');

    playerState.isChopping = true;
    playerState.currentAnimation = 'chopping';
    playerEl.style.backgroundImage = `url(${playerSprites.chopping})`;

    playSound('wheat_harvest');
    
    // Reset farmland to stage 0
    target.stage = 0;
    target.growthTimer = 0;
    if (target.el) {
        const stages = target.crop === 'potato' ? potatoGrowthStages : farmlandGrowthStages;
        target.el.style.backgroundImage = `url(${stages[0]})`;
    }

    if (target.crop === 'potato') {
        const potatoCount = Math.floor(Math.random() * 3) + 1; // 1-3 potatoes
        spawnItem(target, 'potato_item', potatoCount);
        const seedCount = Math.floor(Math.random() * 3); // 0, 1, or 2 seeds
        if (seedCount > 0) {
            spawnItem(target, 'potato_seeds_item', seedCount);
        }
    } else { // Default to wheat
        // Spawn 1-3 wheat
        const wheatCount = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        spawnWheatItem(target, wheatCount);

        // Spawn 0-2 seeds
        const seedCount = Math.floor(Math.random() * 3); // 0, 1, or 2
        if (seedCount > 0) {
            spawnItem(target, 'wheat_seeds_item', seedCount);
        }
    }

    if (chopTimeoutId) {
        clearTimeout(chopTimeoutId);
    }

    chopTimeoutId = setTimeout(() => {
        playerState.isChopping = false;
        chopTimeoutId = null;
    }, CHOP_ANIMATION_DURATION);
}

function chopObject(target) {
    if (!target || playerState.isChopping) return;
    const playerEl = document.getElementById('player');

    playerState.isChopping = true;
    playerState.currentAnimation = 'chopping';
    playerEl.style.backgroundImage = (target.type === 'rock' || target.type === 'ice' || target.type === 'campfire' || target.type === 'copper_rock' || target.type === 'desert_copper_rock' || target.type === 'coal_rock')
        ? `url(${playerSprites.rockBreaking})`
        : `url(${playerSprites.chopping})`;

    cameraState.shake = 10; // Trigger camera shake

    // Play sound based on object type
    if (target.type === 'tree' || target.type === 'cactus' || target.type === 'bamboo') {
        playSound('chop');
    } else if (target.type === 'rock' || target.type === 'ice' || target.type === 'campfire' || target.type === 'copper_rock' || target.type === 'desert_copper_rock' || target.type === 'coal_rock') {
        playGeneratedSound('rock_break');
    }
    
    handleObjectDestruction(target);
    
    // Clear any previous timeout to ensure the state isn't left hanging.
    if (chopTimeoutId) {
        clearTimeout(chopTimeoutId);
    }

    chopTimeoutId = setTimeout(() => {
        playerState.isChopping = false;
        chopTimeoutId = null;
    }, CHOP_ANIMATION_DURATION);
}

export function handleInteraction(hoveredTile) {
    // --- Start of change: Allow harvesting even if holding an item ---
    // Check for fully grown farmland interaction FIRST.
    const farmlandObject = gameObjects.find(obj => {
        if (obj.type !== 'growing_farmland') return false;
        const objTileX = Math.floor(obj.x / TILE_SIZE);
        const objTileY = Math.floor(obj.y / TILE_SIZE);
        return objTileX === hoveredTile.x && objTileY === hoveredTile.y;
    });

    const growthStages = farmlandObject?.crop === 'potato' ? potatoGrowthStages : farmlandGrowthStages;

    if (farmlandObject && farmlandObject.stage === growthStages.length - 1) {
        const dx = (playerState.x + TILE_SIZE / 2) - (farmlandObject.x + TILE_SIZE / 2);
        const dy = (playerState.y + PLAYER_COLLISION_BOX.offsetY + PLAYER_COLLISION_BOX.height / 2) - (farmlandObject.y + TILE_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < INTERACTION_DISTANCE) {
            harvestFarmland(farmlandObject);
            return true;
        }
    }
    // --- End of change ---

    // Do not allow breaking if holding any item in the selected hotbar slot
    if (inventory.hotbar[inventory.selectedHotbarIndex]) {
        return false;
    }
    // Find tree or cactus on the hovered tile
    const targetObject = gameObjects.find(obj => {
        if (!obj.el || obj.el.classList.contains('falling')) return false;
        if (obj.type !== 'tree' && obj.type !== 'cactus' && obj.type !== 'rock' && obj.type !== 'ice' && obj.type !== 'campfire' && obj.type !== 'copper_rock' && obj.type !== 'desert_copper_rock' && obj.type !== 'bamboo' && obj.type !== 'oven' && obj.type !== 'coal_rock') return false;
        if (!obj.collisionBox) return false;

        // Check if the hovered tile is inside the object's visual footprint (which is roughly its collision box)
        const tileWorldX = hoveredTile.x * TILE_SIZE;
        const tileWorldY = hoveredTile.y * TILE_SIZE;

        return tileWorldX < obj.collisionBox.x + obj.collisionBox.width &&
               tileWorldX + TILE_SIZE > obj.collisionBox.x &&
               tileWorldY < obj.collisionBox.y + obj.collisionBox.height &&
               tileWorldY + TILE_SIZE > obj.collisionBox.y;
    });

    if (targetObject) {
        // Check distance to the object's base
        const dx = (playerState.x + TILE_SIZE / 2) - (targetObject.x + TILE_SIZE / 2);
        const dy = (playerState.y + PLAYER_COLLISION_BOX.offsetY + PLAYER_COLLISION_BOX.height / 2) - (targetObject.collisionBox.y + targetObject.collisionBox.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < INTERACTION_DISTANCE) {
            // --- New logic: Flip player to face the object ---
            const playerEl = document.getElementById('player');
            if (playerEl) {
                const objectIsToTheRight = targetObject.x > playerState.x;
                if (objectIsToTheRight && playerState.facingDirection !== 'right') {
                    playerState.facingDirection = 'right';
                    playerEl.style.transform = 'scaleX(1)';
                } else if (!objectIsToTheRight && playerState.facingDirection !== 'left') {
                    playerState.facingDirection = 'left';
                    playerEl.style.transform = 'scaleX(-1)';
                }
            }
            // --- End new logic ---
            chopObject(targetObject);
            return true; // indicate interaction occurred
        }
    }

    // NEW: Check for sprinkler interaction
    const tileType = getTileType(hoveredTile.x, hoveredTile.y);
    if (tileType === 'sprinkler' || tileType === 'copper_sprinkler') {
        const dx = (playerState.x + TILE_SIZE / 2) - ((hoveredTile.x * TILE_SIZE) + TILE_SIZE / 2);
        const dy = (playerState.y + PLAYER_COLLISION_BOX.offsetY + PLAYER_COLLISION_BOX.height / 2) - ((hoveredTile.y * TILE_SIZE) + TILE_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < INTERACTION_DISTANCE) {
            breakSprinkler(hoveredTile.x, hoveredTile.y, tileType);
            return true;
        }
    }

    // NEW: Break grass for seeds
    if (tileType === 'grass' || tileType === 'jungle') {
        const dx = (playerState.x + TILE_SIZE / 2) - ((hoveredTile.x * TILE_SIZE) + TILE_SIZE / 2);
        const dy = (playerState.y + PLAYER_COLLISION_BOX.offsetY + PLAYER_COLLISION_BOX.height / 2) - ((hoveredTile.y * TILE_SIZE) + TILE_SIZE / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < INTERACTION_DISTANCE) {
            breakGrass(hoveredTile.x, hoveredTile.y);
            return true;
        }
    }

    return false; // no interaction performed
}