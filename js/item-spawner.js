import { gameObjects, TILE_SIZE, LOG_ITEM_WIDTH, LOG_ITEM_HEIGHT, CACTUS_PIECE_WIDTH, CACTUS_PIECE_HEIGHT, STONE_ITEM_WIDTH, STONE_ITEM_HEIGHT, WHEAT_ITEM_WIDTH, WHEAT_ITEM_HEIGHT, BAMBOO_ITEM_WIDTH, BAMBOO_ITEM_HEIGHT, COAL_ITEM_WIDTH, COAL_ITEM_HEIGHT } from './state.js';
import { pseudoRandom } from './utils.js';

let itemIdCounter = 0;

export function spawnItem(sourceObject, itemType, count = 1) {
    let itemWidth, itemHeight, className;
    let customPhysics = {};

    switch (itemType) {
        case 'log_item':
            itemWidth = LOG_ITEM_WIDTH; itemHeight = LOG_ITEM_HEIGHT; className = 'log-item';
            break;
        case 'cactus_piece':
            itemWidth = CACTUS_PIECE_WIDTH; itemHeight = CACTUS_PIECE_HEIGHT; className = 'cactus-piece';
            break;
        case 'stone_item':
            itemWidth = STONE_ITEM_WIDTH; itemHeight = STONE_ITEM_HEIGHT; className = 'stone-item';
            break;
        case 'copper_ore_item':
            itemWidth = STONE_ITEM_WIDTH; itemHeight = STONE_ITEM_HEIGHT; className = 'copper-ore-item';
            break;
        case 'bamboo_item':
            itemWidth = BAMBOO_ITEM_WIDTH; itemHeight = BAMBOO_ITEM_HEIGHT; className = 'bamboo-item';
            break;
        case 'wheat_item':
            itemWidth = WHEAT_ITEM_WIDTH; itemHeight = WHEAT_ITEM_HEIGHT; className = 'wheat-item';
            customPhysics = { vz: 20 + Math.random() * 30, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20 };
            break;
        case 'wheat_seeds_item':
            itemWidth = WHEAT_ITEM_WIDTH; itemHeight = WHEAT_ITEM_HEIGHT; className = 'wheat-seeds-item';
            break;
        case 'potato_item':
            itemWidth = 30; itemHeight = 30; className = 'potato-item';
            break;
        case 'potato_seeds_item':
            itemWidth = 30; itemHeight = 30; className = 'potato-seeds-item';
            break;
        case 'coal_item':
            itemWidth = COAL_ITEM_WIDTH; itemHeight = COAL_ITEM_HEIGHT; className = 'coal-item';
            break;
        case 'ice_chunk':
            itemWidth = STONE_ITEM_WIDTH; itemHeight = STONE_ITEM_HEIGHT; className = 'ice-chunk';
            break;
        case 'ice_medalion':
            itemWidth = 30; itemHeight = 30; className = 'ice-medalion';
            break;
        default:
            console.warn(`Unknown item type to spawn: ${itemType}`);
            return;
    }

    for (let i = 0; i < count; i++) {
        const xOffset = (TILE_SIZE / 2) - (itemWidth / 2) + (Math.random() - 0.5) * 10;
        const spawnHeight = 10 + Math.random() * 20;

        const itemObject = {
            id: `item_${itemIdCounter++}`,
            type: itemType,
            className: className,
            x: sourceObject.x + xOffset,
            y: sourceObject.y + TILE_SIZE - itemHeight - 10,
            collisionBox: null,
            z: spawnHeight,
            vz: 50 + Math.random() * 50,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            bounces: 0,
            pickupDelay: 0.5,
            ...customPhysics
        };
        gameObjects.push(itemObject);
    }
}

export function spawnLogItem(sourceObject, count = 2) {
    for (let i = 0; i < count; i++) {
        // Give each log a slightly different starting position on the tile
        const xOffset = (TILE_SIZE / 2) - (LOG_ITEM_WIDTH / 2) + (Math.random() - 0.5) * 10;
        
        const spawnHeight = 20 + Math.random() * 30; // Start partway up the tree

        const logObject = {
            id: `item_${itemIdCounter++}`,
            type: 'log_item',
            className: 'log-item',
            x: sourceObject.x + xOffset,
            y: sourceObject.y + TILE_SIZE - LOG_ITEM_HEIGHT - 10,
            collisionBox: null, // Logs don't block movement
            // --- Physics properties for dropping animation ---
            z: spawnHeight, // Vertical position off the ground
            vz: 50 + Math.random() * 50, // Give it a slight pop upwards
            vx: (Math.random() - 0.5) * 20, // A very small horizontal velocity to separate them
            vy: (Math.random() - 0.5) * 20,
            bounces: 0,      // Keep track of bounces
            pickupDelay: 0.5 // Can't be picked up for 0.5 seconds
        };
        gameObjects.push(logObject);
    }
}

export function spawnCactusPiece(cactus) {
    for (let i = 0; i < 2; i++) {
        const xOffset = (TILE_SIZE / 2) - (CACTUS_PIECE_WIDTH / 2) + (Math.random() - 0.5) * 10;
        const spawnHeight = 10 + Math.random() * 20;

        const pieceObject = {
            id: `item_${itemIdCounter++}`,
            type: 'cactus_piece',
            className: 'cactus-piece',
            x: cactus.x + xOffset,
            y: cactus.y + TILE_SIZE - CACTUS_PIECE_HEIGHT - 10,
            collisionBox: null,
            // --- Physics properties for dropping animation ---
            z: spawnHeight,
            vz: 50 + Math.random() * 50,
            vx: (Math.random() - 0.5) * 30, // A bit more horizontal pop
            vy: (Math.random() - 0.5) * 30,
            bounces: 0,
            pickupDelay: 0.5
        };
        gameObjects.push(pieceObject);
    }
}

export function spawnBambooItem(sourceObject, count = 2) {
    for (let i = 0; i < count; i++) {
        const xOffset = (TILE_SIZE / 2) - (BAMBOO_ITEM_WIDTH / 2) + (Math.random() - 0.5) * 10;
        const spawnHeight = 10 + Math.random() * 20;

        const bambooObject = {
            id: `item_${itemIdCounter++}`,
            type: 'bamboo_item',
            className: 'bamboo-item',
            x: sourceObject.x + xOffset,
            y: sourceObject.y + TILE_SIZE - BAMBOO_ITEM_HEIGHT - 10,
            collisionBox: null,
            z: spawnHeight,
            vz: 50 + Math.random() * 50,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            bounces: 0,
            pickupDelay: 0.5
        };
        gameObjects.push(bambooObject);
    }
}

export function spawnWheatItem(sourceObject, count = 1) {
    for (let i = 0; i < count; i++) {
        const xOffset = (TILE_SIZE / 2) - (WHEAT_ITEM_WIDTH / 2) + (Math.random() - 0.5) * 10;
        const spawnHeight = 10 + Math.random() * 10;

        const wheatObject = {
            id: `item_${itemIdCounter++}`,
            type: 'wheat_item',
            className: 'wheat-item',
            x: sourceObject.x + xOffset,
            y: sourceObject.y + TILE_SIZE - WHEAT_ITEM_HEIGHT, // a bit higher to look like it's on top
            collisionBox: null,
            z: spawnHeight,
            vz: 20 + Math.random() * 30,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            bounces: 0,
            pickupDelay: 0.5
        };
        gameObjects.push(wheatObject);
    }
}

export function spawnStoneItem(rock, count = 2) { // Default to 2 for rocks
    for (let i = 0; i < count; i++) { // Drop 'count' stones
        const xOffset = (TILE_SIZE / 2) - (STONE_ITEM_WIDTH / 2) + (Math.random() - 0.5) * 10;
        const spawnHeight = 10 + Math.random() * 10; // Rocks don't bounce much

        const stoneObject = {
            id: `item_${itemIdCounter++}`,
            type: 'stone_item',
            className: 'stone-item',
            x: rock.x + xOffset,
            y: rock.y + TILE_SIZE - STONE_ITEM_HEIGHT - 10,
            collisionBox: null,
            z: spawnHeight,
            vz: 20 + Math.random() * 30, // Less pop than wood/cactus
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            bounces: 0,
            pickupDelay: 0.5
        };
        gameObjects.push(stoneObject);
    }
}

export function spawnCopperAndRock(sourceObject) {
    // Spawn 1 copper ore
    const copperObject = {
        id: `item_${itemIdCounter++}`,
        type: 'copper_ore_item',
        className: 'copper-ore-item',
        x: sourceObject.x + (TILE_SIZE / 2) - (STONE_ITEM_WIDTH / 2) + (Math.random() - 0.5) * 10,
        y: sourceObject.y + TILE_SIZE - STONE_ITEM_HEIGHT - 10,
        collisionBox: null,
        z: 10 + Math.random() * 10,
        vz: 20 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        bounces: 0,
        pickupDelay: 0.5
    };
    gameObjects.push(copperObject);

    // Spawn 1 stone
    const stoneObject = {
        id: `item_${itemIdCounter++}`,
        type: 'stone_item',
        className: 'stone-item',
        x: sourceObject.x + (TILE_SIZE / 2) - (STONE_ITEM_WIDTH / 2) + (Math.random() - 0.5) * 10,
        y: sourceObject.y + TILE_SIZE - STONE_ITEM_HEIGHT - 10,
        collisionBox: null,
        z: 10 + Math.random() * 10,
        vz: 20 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        bounces: 0,
        pickupDelay: 0.5
    };
    gameObjects.push(stoneObject);
}

export function spawnIceChunk(ice) {
    for (let i = 0; i < 2; i++) {
        const xOffset = (TILE_SIZE / 2) - (STONE_ITEM_WIDTH / 2) + (Math.random() - 0.5) * 10;
        const spawnHeight = 10 + Math.random() * 10;

        gameObjects.push({
            id: `item_${itemIdCounter++}`,
            type: 'ice_chunk',
            className: 'ice-chunk',
            x: ice.x + xOffset,
            y: ice.y + TILE_SIZE - STONE_ITEM_HEIGHT - 10,
            collisionBox: null,
            z: spawnHeight,
            vz: 20 + Math.random() * 30,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            bounces: 0,
            pickupDelay: 0.5
        });
    }
}

export function spawnRandomLoot(iceStructure) {
    const rand = pseudoRandom(iceStructure.x, iceStructure.y);
    let chosenLootType;

    if (rand < 0.05) { // 5% chance for rare drop
        chosenLootType = 'ice_medalion';
    } else {
        const commonLootTable = ['log_item', 'stone_item', 'cactus_piece'];
        const rand2 = pseudoRandom(iceStructure.x + 1, iceStructure.y - 1); // Use a different seed for the common loot
        chosenLootType = commonLootTable[Math.floor(rand2 * commonLootTable.length)];
    }

    let width, height, className;
    switch (chosenLootType) {
        case 'log_item':
            width = LOG_ITEM_WIDTH;
            height = LOG_ITEM_HEIGHT;
            className = 'log-item';
            break;
        case 'stone_item':
            width = STONE_ITEM_WIDTH;
            height = STONE_ITEM_HEIGHT;
            className = 'stone-item';
            break;
        case 'cactus_piece':
            width = CACTUS_PIECE_WIDTH;
            height = CACTUS_PIECE_HEIGHT;
            className = 'cactus-piece';
            break;
        case 'ice_medalion':
            width = 30;
            height = 30;
            className = 'ice-medalion';
            break;
    }

    const xOffset = (TILE_SIZE / 2) - (width / 2) + (Math.random() - 0.5) * 10;
    const spawnHeight = 15 + Math.random() * 15;

    const lootObject = {
        id: `item_${itemIdCounter++}`,
        type: chosenLootType,
        className: className,
        x: iceStructure.x + xOffset,
        y: iceStructure.y + TILE_SIZE - height - 10,
        collisionBox: null,
        z: spawnHeight,
        vz: 30 + Math.random() * 40,
        vx: (Math.random() - 0.5) * 25,
        vy: (Math.random() - 0.5) * 25,
        bounces: 0,
        pickupDelay: 0.5
    };
    gameObjects.push(lootObject);
}