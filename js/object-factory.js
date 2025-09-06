import { TILE_SIZE, TREE_HEIGHT, TREE_COLLISION_BOX, JUNGLE_TREE_HEIGHT, JUNGLE_TREE_COLLISION_BOX, BAMBOO_HEIGHT, BAMBOO_COLLISION_BOX, CACTUS_HEIGHT, CACTUS_COLLISION_BOX, ROCK_HEIGHT, ROCK_COLLISION_BOX, COAL_ROCK_HEIGHT, COAL_ROCK_COLLISION_BOX, COPPER_ROCK_HEIGHT, COPPER_ROCK_COLLISION_BOX, ICE_STRUCTURE_HEIGHT, ICE_STRUCTURE_COLLISION_BOX, TUMBLEWEED_COLLISION_BOX, SNOW_THRESHOLD, BIOME_NOISE_SCALE, BIOME_THRESHOLD, snowAssets } from './state.js';
import { getAssetPath, cactusVariants, rockAssets, coalAssets } from './asset-manager.js';
import { getTreeFireState } from './save-system.js';
import { pseudoRandom } from './utils.js';
import { biomeNoise2D } from './noise.js';
import { getTileType } from './terrain.js';

export function createTreeObject(worldTileX, worldTileY) {
    const posX = worldTileX * TILE_SIZE;
    const posY = worldTileY * TILE_SIZE + TILE_SIZE - TREE_HEIGHT;
    const biomeValue = biomeNoise2D(worldTileX / BIOME_NOISE_SCALE, worldTileY / BIOME_NOISE_SCALE);
    const inSnow = biomeValue < SNOW_THRESHOLD;
    const treeId = `tree_${worldTileX}_${worldTileY}`;
    const fireState = getTreeFireState(treeId);

    return {
        el: null, id: treeId, x: posX, y: posY, type: 'tree', className: 'tree',
        variant: inSnow ? snowAssets.tree : undefined,
        isOnFire: fireState?.isOnFire || false,
        fireTimer: 0,
        collisionBox: { x: posX + TREE_COLLISION_BOX.offsetX, y: posY + TREE_COLLISION_BOX.offsetY, width: TREE_COLLISION_BOX.width, height: TREE_COLLISION_BOX.height }
    };
}

export function createJungleTreeObject(worldTileX, worldTileY) {
    const posX = worldTileX * TILE_SIZE - 12; // Center the 64px tree on a 40px tile
    const posY = worldTileY * TILE_SIZE + TILE_SIZE - JUNGLE_TREE_HEIGHT;
    const treeId = `tree_${worldTileX}_${worldTileY}`;
    const fireState = getTreeFireState(treeId);

    return {
        el: null, id: treeId, x: posX, y: posY, type: 'tree', className: 'tree',
        variant: getAssetPath('jungleTree'),
        isOnFire: fireState?.isOnFire || false,
        fireTimer: 0,
        collisionBox: { x: posX + JUNGLE_TREE_COLLISION_BOX.offsetX, y: posY + JUNGLE_TREE_COLLISION_BOX.offsetY, width: JUNGLE_TREE_COLLISION_BOX.width, height: JUNGLE_TREE_COLLISION_BOX.height }
    };
}

export function createBambooObject(worldTileX, worldTileY) {
    const posX = worldTileX * TILE_SIZE;
    const posY = worldTileY * TILE_SIZE + TILE_SIZE - BAMBOO_HEIGHT;
    const bambooId = `bamboo_${worldTileX}_${worldTileY}`;

    return {
        el: null, id: bambooId, x: posX, y: posY, type: 'bamboo', className: 'bamboo',
        variant: getAssetPath('bamboo'),
        collisionBox: { x: posX + BAMBOO_COLLISION_BOX.offsetX, y: posY + BAMBOO_COLLISION_BOX.offsetY, width: BAMBOO_COLLISION_BOX.width, height: BAMBOO_COLLISION_BOX.height }
    };
}

export function createCactusObject(worldTileX, worldTileY) {
    const posX = worldTileX * TILE_SIZE;
    const posY = worldTileY * TILE_SIZE + TILE_SIZE - CACTUS_HEIGHT;
    const variantIndex = Math.floor(pseudoRandom(worldTileX + 1000, worldTileY + 1000) * cactusVariants.length);

    return {
        el: null, id: `cactus_${worldTileX}_${worldTileY}`, x: posX, y: posY, type: 'cactus', className: 'cactus',
        variant: cactusVariants[variantIndex],
        collisionBox: { x: posX + CACTUS_COLLISION_BOX.offsetX, y: posY + CACTUS_COLLISION_BOX.offsetY, width: CACTUS_COLLISION_BOX.width, height: CACTUS_COLLISION_BOX.height }
    };
}

export function createTumbleweedObject(worldTileX, worldTileY) {
    const posX = worldTileX * TILE_SIZE;
    const posY = worldTileY * TILE_SIZE;
    return {
        el: null, id: `tumbleweed_${worldTileX}_${worldTileY}`, x: posX, y: posY, type: 'tumbleweed', className: 'tumbleweed',
        dx: 0, dy: 0, z: 0, vz: 0, state: 'idle', stateTimer: 2 + Math.random() * 3, rotation: 0,
        collisionBox: { x: posX + TUMBLEWEED_COLLISION_BOX.offsetX, y: posY + TUMBLEWEED_COLLISION_BOX.offsetY, width: TUMBLEWEED_COLLISION_BOX.width, height: TUMBLEWEED_COLLISION_BOX.height }
    };
}

export function createRockObject(worldTileX, worldTileY) {
    const posX = worldTileX * TILE_SIZE;
    const posY = worldTileY * TILE_SIZE + TILE_SIZE - ROCK_HEIGHT;
    const biomeValue = biomeNoise2D(worldTileX / BIOME_NOISE_SCALE, worldTileY / BIOME_NOISE_SCALE);
    const isDesert = biomeValue > BIOME_THRESHOLD;
    return {
        el: null, id: `rock_${worldTileX}_${worldTileY}`, x: posX, y: posY, type: 'rock', className: 'rock',
        variant: isDesert ? rockAssets.desert : rockAssets.grass,
        collisionBox: { x: posX + ROCK_COLLISION_BOX.offsetX, y: posY + ROCK_COLLISION_BOX.offsetY, width: ROCK_COLLISION_BOX.width, height: ROCK_COLLISION_BOX.height }
    };
}

export function createCoalRockObject(worldTileX, worldTileY) {
    const posX = worldTileX * TILE_SIZE;
    const posY = worldTileY * TILE_SIZE + TILE_SIZE - COAL_ROCK_HEIGHT;
    const tileType = getTileType(worldTileX, worldTileY);
    return {
        el: null, id: `coal_rock_${worldTileX}_${worldTileY}`, x: posX, y: posY, type: 'coal_rock', className: 'coal-rock',
        variant: tileType === 'sand' ? coalAssets.desert : coalAssets.grass,
        collisionBox: { x: posX + COAL_ROCK_COLLISION_BOX.offsetX, y: posY + COAL_ROCK_COLLISION_BOX.offsetY, width: COAL_ROCK_COLLISION_BOX.width, height: COAL_ROCK_COLLISION_BOX.height }
    };
}

export function createCopperRockObject(worldTileX, worldTileY) {
    const posX = worldTileX * TILE_SIZE;
    const posY = worldTileY * TILE_SIZE + TILE_SIZE - COPPER_ROCK_HEIGHT;
    const tileType = getTileType(worldTileX, worldTileY);
    return {
        el: null, id: `copper_rock_${worldTileX}_${worldTileY}`, x: posX, y: posY, type: 'copper_rock', className: 'copper-rock',
        variant: tileType === 'sand' ? getAssetPath('desertCopper') : getAssetPath('copperRock'),
        collisionBox: { x: posX + COPPER_ROCK_COLLISION_BOX.offsetX, y: posY + COPPER_ROCK_COLLISION_BOX.offsetY, width: COPPER_ROCK_COLLISION_BOX.width, height: COPPER_ROCK_COLLISION_BOX.height }
    };
}

export function createIceStructureObject(worldTileX, worldTileY) {
    const posX = worldTileX * TILE_SIZE;
    const posY = worldTileY * TILE_SIZE + TILE_SIZE - ICE_STRUCTURE_HEIGHT;
    const hasLoot = pseudoRandom(worldTileX, worldTileY + 500) < 0.2;
    return {
        el: null, id: `ice_${worldTileX}_${worldTileY}`, x: posX, y: posY, type: 'ice', className: 'ice-structure',
        variant: hasLoot ? getAssetPath('iceStructureLoot') : getAssetPath('iceStructure'),
        hasLoot: hasLoot,
        collisionBox: { x: posX + ICE_STRUCTURE_COLLISION_BOX.offsetX, y: posY + ICE_STRUCTURE_COLLISION_BOX.offsetY, width: ICE_STRUCTURE_COLLISION_BOX.width, height: ICE_STRUCTURE_COLLISION_BOX.height }
    };
}

export function createCampfireObject(tx, ty) {
    const x = tx * TILE_SIZE, y = ty * TILE_SIZE;
    return { 
        el: null, id: `campfire_${tx}_${ty}`, x, y, type: 'campfire', className: 'campfire',
        collisionBox: { x, y, width: TILE_SIZE, height: TILE_SIZE } 
    };
}

export function createOvenObject(tx, ty) {
    const x = tx * TILE_SIZE, y = ty * TILE_SIZE;
    return {
        el: null, id: `oven_${tx}_${ty}`, x, y, type: 'oven', className: 'oven',
        collisionBox: { x, y: y + TILE_SIZE / 2, width: TILE_SIZE, height: TILE_SIZE / 2 }
    };
}

export function createFarmlandObject(tx, ty, data) {
    const x = tx * TILE_SIZE, y = ty * TILE_SIZE;
    return {
        el: null, id: `farmland_${tx}_${ty}`, x, y, type: 'growing_farmland', className: 'farmland-overlay',
        stage: data.stage,
        growthTimer: data.growthTimer,
        crop: data.crop || 'wheat',
        collisionBox: null
    };
}