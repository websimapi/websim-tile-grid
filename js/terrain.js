import { biomeNoise2D } from './noise.js';
import { chunks, BIOME_NOISE_SCALE, BIOME_THRESHOLD, SNOW_THRESHOLD, CHUNK_SIZE, isInDebugMode, JUNGLE_THRESHOLD, JUNGLE_END_THRESHOLD } from './state.js';
import { BIOME_DATA } from './biome-data.js';

/**
 * Determines the original, noise-based biome of a tile, ignoring any manual overrides.
 * @param {number} tx - The world tile X-coordinate.
 * @param {number} ty - The world tile Y-coordinate.
 * @returns {string} The underlying biome type ('grass', 'sand', 'snow', 'jungle').
 */
function getUnderlyingBiome(tx, ty) {
    const v = biomeNoise2D(tx / BIOME_NOISE_SCALE, ty / BIOME_NOISE_SCALE);
    if (v < SNOW_THRESHOLD) return 'snow';
    if (v >= BIOME_THRESHOLD) return 'sand';
    if (v >= JUNGLE_THRESHOLD && v < JUNGLE_END_THRESHOLD) return 'jungle';
    return 'grass';
}

/**
 * Determines the terrain type ('grass', 'sand', 'snow', 'wood', 'farmland', 'sprinkler') for a given tile coordinate.
 * Accounts for noise-based biomes and manual tile overrides.
 * @param {number} tx - The world tile X-coordinate.
 * @param {number} ty - The world tile Y-coordinate.
 * @returns {string} The tile type.
 */
export function getTileType(tx, ty) {
    const chunkX = Math.floor(tx / CHUNK_SIZE);
    const chunkY = Math.floor(ty / CHUNK_SIZE);
    const chunk = chunks.get(`${chunkX},${chunkY}`);
    
    if (chunk && chunk.tileOverrides) {
        const localX = tx - chunkX * CHUNK_SIZE;
        const localY = ty - chunkY * CHUNK_SIZE;
        const override = chunk.tileOverrides.get(`${localX},${localY}`);
        if (override) {
            return override.type;
        }
    }

    if (isInDebugMode) {
        const debugChunk = chunks.get('debug,0,0');
        const tileData = debugChunk?.tileOverrides.get(`${tx},${ty}`);
        if(tileData) {
            const v = biomeNoise2D(tx / BIOME_NOISE_SCALE, ty / BIOME_NOISE_SCALE);
            if (v < SNOW_THRESHOLD) return 'snow';
            if (v >= BIOME_THRESHOLD) return 'sand';
            if (v >= JUNGLE_THRESHOLD && v < JUNGLE_END_THRESHOLD) return 'jungle';
            return 'grass';
        }
    }

    const v = biomeNoise2D(tx / BIOME_NOISE_SCALE, ty / BIOME_NOISE_SCALE);
    if (v < SNOW_THRESHOLD) return 'snow';
    if (v >= BIOME_THRESHOLD) return 'sand';
    if (v >= JUNGLE_THRESHOLD && v < JUNGLE_END_THRESHOLD) return 'jungle';
    return 'grass';
}

/**
 * Retrieves comprehensive information about a biome at a given coordinate, including its type and category.
 * This is the preferred function for querying biome-related data.
 * @param {number} tx The world tile X-coordinate.
 * @param {number} ty The world tile Y-coordinate.
 * @returns {{type: string, category: string}} An object with the biome's type and category.
 */
export function getBiomeInfo(tx, ty) {
    const tileType = getTileType(tx, ty);

    let baseBiomeType;
    // For special tiles like farmland, the biome characteristics should match the underlying terrain.
    if (tileType === 'farmland' || tileType === 'sprinkler' || tileType === 'copper_sprinkler') {
        baseBiomeType = getUnderlyingBiome(tx, ty);
    } else if (tileType === 'wood') {
        // Wood floors are considered temperate, like grass.
        baseBiomeType = 'grass';
    } else {
        baseBiomeType = tileType;
    }

    const data = BIOME_DATA[baseBiomeType] || BIOME_DATA.unknown;
    return {
        type: baseBiomeType,
        ...data
    };
}