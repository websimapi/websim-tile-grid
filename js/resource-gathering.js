import { gameObjects, inventory, TILE_SIZE } from './state.js';
import { spawnLogItem, spawnCactusPiece, spawnStoneItem, spawnCopperAndRock, spawnIceChunk, spawnRandomLoot, spawnBambooItem, spawnItem } from './item-spawner.js';
import { markObjectRemoved, registerCampfireRemoved, saveGame, removeTileOverride, registerOvenRemoved } from './save-system.js';

/**
 * Handles the logic for destroying an object and spawning its resources.
 * @param {object} target - The game object to destroy.
 */
export function handleObjectDestruction(target) {
    const index = gameObjects.indexOf(target);

    // For non-animated objects that break instantly
    const instantBreak = ['rock', 'coal_rock', 'copper_rock', 'desert_copper_rock', 'campfire', 'oven', 'ice'];

    if (instantBreak.includes(target.type)) {
        if (index > -1 || target.type === 'sprinkler' || target.type === 'copper_sprinkler') { // Sprinklers are tiles, not in gameObjects
            spawnResourcesFor(target);
            if (index > -1) {
                gameObjects.splice(index, 1);
            }
            updateSaveDataFor(target);
        }
        return;
    }

    // For animated objects (trees, cacti)
    if (target.el) {
        target.el.classList.add('falling');
    }

    // Delay removal to allow the animation to play
    setTimeout(() => {
        spawnResourcesFor(target);
        const currentIndex = gameObjects.indexOf(target); // Re-check index in case it changed
        if (currentIndex > -1) {
            gameObjects.splice(currentIndex, 1);
        }
        updateSaveDataFor(target);
    }, 180); // A bit shorter than the animation duration
}


/**
 * Spawns the appropriate items for a given destroyed object.
 * @param {object} target - The game object that was destroyed.
 */
function spawnResourcesFor(target) {
    switch (target.type) {
        case 'tree':
            spawnLogItem(target);
            break;
        case 'cactus':
            spawnCactusPiece(target);
            break;
        case 'bamboo':
            spawnBambooItem(target);
            break;
        case 'rock':
            spawnStoneItem(target);
            // --- Ice Medallion Bonus Loot Check ---
            const isMedallionEquipped = inventory.equipment.some(item => item && item.type === 'ice_medalion');
            if (isMedallionEquipped && Math.random() < 0.25) {
                console.log("Ice Medallion bonus triggered!");
                spawnRandomLoot(target);
            }
            break;
        case 'coal_rock':
            spawnItem(target, 'coal_item', Math.floor(Math.random() * 2) + 1); // 1 or 2 coal
            break;
        case 'copper_rock':
        case 'desert_copper_rock':
            spawnCopperAndRock(target);
            break;
        case 'campfire':
            spawnLogItem(target, 2); // 75% of 3 logs, rounded down
            break;
        case 'oven':
            spawnStoneItem(target, 5); // Ovens drop 5 stone
            break;
        case 'ice':
            spawnIceChunk(target);
            if (target.hasLoot) spawnRandomLoot(target);
            break;
        case 'sprinkler':
            spawnStoneItem(target, 2);
            break;
        case 'copper_sprinkler':
            spawnItem(target, 'copper_ore_item', 2);
            break;
    }
}

/**
 * Updates the save system data after an object is permanently removed.
 * @param {object} target - The game object that was removed.
 */
function updateSaveDataFor(target) {
    if (target.id) {
        markObjectRemoved(target.id);
    }

    const tileX = Math.floor(target.x / TILE_SIZE);
    const tileY = Math.floor(target.y / TILE_SIZE);

    switch (target.type) {
        case 'campfire':
            registerCampfireRemoved(tileX, tileY);
            break;
        case 'oven':
            registerOvenRemoved(tileX, tileY);
            break;
        case 'sprinkler':
        case 'copper_sprinkler':
            removeTileOverride(tileX, tileY);
            break;
    }
    saveGame();
}