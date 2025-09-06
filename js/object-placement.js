import { biomeNoise2D, treeNoise2D, forestNoise2D, bambooNoise2D } from './noise.js';
import { BIOME_NOISE_SCALE, BIOME_THRESHOLD, SNOW_THRESHOLD, JUNGLE_THRESHOLD } from './state.js';
import { getTileType } from './terrain.js';
import { pseudoRandom } from './utils.js';

const TREE_DENSITY_THRESHOLD = 0.1;
const TREE_NOISE_SCALE = 25;
const FOREST_NOISE_SCALE = 200;
const FOREST_THRESHOLD = 0.55;

/**
 * Deterministically checks if a tree should be placed at a given world coordinate,
 * based on various noise layers and a pseudo-random number generator.
 * @param {number} worldX - The world X-coordinate of the tile.
 * @param {number} worldY - The world Y-coordinate of the tile.
 * @returns {boolean} - True if a tree should be placed, false otherwise.
 */
export function shouldPlaceTree(worldX, worldY) {
    // Check biome type
    const biomeValue = biomeNoise2D(worldX / BIOME_NOISE_SCALE, worldY / BIOME_NOISE_SCALE);
    const tileType = getTileType(worldX, worldY);
    if (tileType === 'sand' || tileType === 'jungle') {
        return false; // No regular trees in sand or jungle.
    }
    // Disallow snow trees on snow biome edges (require snow in all cardinal neighbors)
    if (getTileType(worldX, worldY) === 'snow') {
        if (getTileType(worldX, worldY - 1) !== 'snow' || getTileType(worldX, worldY + 1) !== 'snow' ||
            getTileType(worldX - 1, worldY) !== 'snow' || getTileType(worldX + 1, worldY) !== 'snow') {
            return false;
        }
    }
    // allow trees in grass and snow (biomeValue <= BIOME_THRESHOLD)

    // Check if it's in a forest area for higher density
    const forestValue = forestNoise2D(worldX / FOREST_NOISE_SCALE, worldY / FOREST_NOISE_SCALE);
    const isForest = forestValue > FOREST_THRESHOLD;
    const treePlacementChance = isForest ? 0.7 : 0.25;

    // Check noise for tree clumps
    const clumpNoiseValue = treeNoise2D(worldX / TREE_NOISE_SCALE, worldY / TREE_NOISE_SCALE);
    
    // Use pseudoRandom for a deterministic chance, making neighbor checks reliable
    const rand = pseudoRandom(worldX, worldY);

    return clumpNoiseValue > TREE_DENSITY_THRESHOLD && rand < treePlacementChance;
}

/**
 * Deterministically checks if a cactus should be placed at a given world coordinate.
 * @param {number} worldX - The world X-coordinate of the tile.
 * @param {number} worldY - The world Y-coordinate of the tile.
 * @returns {boolean} - True if a cactus should be placed, false otherwise.
 */
export function shouldPlaceCactus(worldX, worldY) {
    // Check biome type
    const tileType = getTileType(worldX, worldY);
    if (tileType !== 'sand') {
        return false; // Not a sand biome
    }

    // Cacti shouldn't spawn right next to the grass border for a more natural look.
    const isSand = (x, y) => getTileType(x, y) === 'sand';
    if (!isSand(worldX, worldY - 1) || !isSand(worldX, worldY + 1) || !isSand(worldX - 1, worldY) || !isSand(worldX + 1, worldY)) {
        return false; // Don't spawn on a sand tile that is touching a grass tile.
    }
    
    // Use pseudoRandom for a deterministic chance
    const rand = pseudoRandom(worldX, worldY);
    const cactusPlacementChance = 0.05; // 5% chance to spawn on any desert tile

    return rand < cactusPlacementChance;
}

/**
 * Deterministically checks if a tumbleweed should be placed at a given world coordinate.
 * @param {number} worldX - The world X-coordinate of the tile.
 * @param {number} worldY - The world Y-coordinate of the tile.
 * @returns {boolean} - True if a tumbleweed should be placed, false otherwise.
 */
export function shouldPlaceTumbleweed(worldX, worldY) {
    const tileType = getTileType(worldX, worldY);
    if (tileType !== 'sand') {
        return false; // Not a desert biome.
    }

    // Don't spawn on cacti.
    if (shouldPlaceCactus(worldX, worldY)) {
        return false;
    }
    
    // Use pseudoRandom for a deterministic chance
    const rand = pseudoRandom(worldX, worldY);
    const tumbleweedPlacementChance = 0.02; // 2% chance, was 1%

    return rand < tumbleweedPlacementChance;
}

/**
 * Rocks spawn in both biomes with a moderate chance, independent of trees/cacti.
 */
export function shouldPlaceRock(worldX, worldY) {
    const rand = pseudoRandom(worldX + 777, worldY - 777);
    return rand < 0.005;
}

export function shouldPlaceCoalRock(worldX, worldY) {
    // Avoid placing on other potential objects.
    if (shouldPlaceCactus(worldX, worldY) || shouldPlaceRock(worldX, worldY)) {
        return false;
    }

    const rand = pseudoRandom(worldX + 987, worldY - 654); // new seed
    return rand < 0.004; // A bit more common than copper
}

export function shouldPlaceCopperRock(worldX, worldY) {
    // Avoid placing on other potential objects.
    if (shouldPlaceCactus(worldX, worldY) || shouldPlaceRock(worldX, worldY) || shouldPlaceCoalRock(worldX, worldY)) {
        return false;
    }

    const rand = pseudoRandom(worldX + 123, worldY - 456);
    return rand < 0.003; // Rarer than normal rocks (0.005)
}

export function shouldPlaceDesertCopperRock(worldX, worldY) {
    // Only in desert biome
    const tileType = getTileType(worldX, worldY);
    if (tileType !== 'sand') {
        return false;
    }
    // Don't spawn on cacti or other rocks
    if (shouldPlaceCactus(worldX, worldY) || shouldPlaceRock(worldX, worldY)) {
        return false;
    }

    const rand = pseudoRandom(worldX - 555, worldY + 333); // different seed
    return rand < 0.003; // Same rarity as grass copper
}

export function shouldPlaceIceStructure(worldX, worldY) {
    if (getTileType(worldX, worldY) !== 'snow') return false;
    // prevent spawning on trees
    if (shouldPlaceTree(worldX, worldY)) return false;
    // avoid snow edge spawns
    if (getTileType(worldX, worldY - 1) !== 'snow' || getTileType(worldX, worldY + 1) !== 'snow' ||
        getTileType(worldX - 1, worldY) !== 'snow' || getTileType(worldX + 1, worldY) !== 'snow') return false;
    const rand = pseudoRandom(worldX - 313, worldY + 909);
    return rand < 0.0035;
}

export function shouldPlaceBamboo(worldX, worldY) {
    const tileType = getTileType(worldX, worldY);
    if (tileType !== 'jungle') {
        return false;
    }

    // Use noise to create large, distinct bamboo forest areas
    const bambooValue = bambooNoise2D(worldX / 150, worldY / 150);
    const inBambooForest = bambooValue > 0.5;

    if (!inBambooForest) {
        return false;
    }
    
    // Don't place on jungle trees (which shouldn't spawn here anyway now)
    if (shouldPlaceJungleTree(worldX, worldY)) {
        return false;
    }

    const rand = pseudoRandom(worldX + 500, worldY - 500);
    return rand < 0.75; // High chance within the bamboo forest patch
}

export function shouldPlaceJungleTree(worldX, worldY) {
    const tileType = getTileType(worldX, worldY);
    if (tileType !== 'jungle') {
        return false;
    }

    // Prevent jungle trees from spawning in bamboo forests
    const bambooValue = bambooNoise2D(worldX / 150, worldY / 150);
    if (bambooValue > 0.5) {
        return false;
    }

    const forestValue = forestNoise2D(worldX / FOREST_NOISE_SCALE, worldY / FOREST_NOISE_SCALE);
    const isDense = forestValue > 0.45; // slightly different threshold for jungle
    const treePlacementChance = isDense ? 0.8 : 0.3;

    const clumpNoiseValue = treeNoise2D(worldX / TREE_NOISE_SCALE, worldY / TREE_NOISE_SCALE);
    
    const rand = pseudoRandom(worldX, worldY);

    return clumpNoiseValue > (TREE_DENSITY_THRESHOLD + 0.1) && rand < treePlacementChance;
}