import { chunks, gameObjects, CHUNK_SIZE, TILE_SIZE, farmlandState } from './state.js';
import { shouldPlaceTree, shouldPlaceCactus, shouldPlaceTumbleweed, shouldPlaceRock, shouldPlaceCopperRock, shouldPlaceIceStructure, shouldPlaceJungleTree, shouldPlaceBamboo, shouldPlaceCoalRock } from './object-placement.js';
import { isObjectRemoved, getPlacedCampfires, getTileOverridesForChunk, getPlacedOvens } from './save-system.js';
import { createTreeObject, createBambooObject, createJungleTreeObject, createCactusObject, createTumbleweedObject, createRockObject, createCoalRockObject, createCopperRockObject, createIceStructureObject, createCampfireObject, createOvenObject, createFarmlandObject } from './object-factory.js';
import { applyMeltingFromCampfires } from './environment.js';

const MAX_TREE_NEIGHBORS = 5;

export function generateChunkData(chunkX, chunkY) {
    const chunkId = `${chunkX},${chunkY}`;
     
    const chunkObjects = [];
 
    // Apply melting effect before generating objects to ensure correct biome context
    applyMeltingFromCampfires(chunkX, chunkY);
 
    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const worldTileX = chunkX * CHUNK_SIZE + x;
            const worldTileY = chunkY * CHUNK_SIZE + y;
 
            // Step 1: Check if a tree *could* be placed here based on noise.
            if (shouldPlaceTree(worldTileX, worldTileY)) {
                
                // Step 2: "Field sweep" - check neighbors to prevent overcrowding.
                let neighborCount = 0;
                for (let ny = -1; ny <= 1; ny++) {
                    for (let nx = -1; nx <= 1; nx++) {
                        if (nx === 0 && ny === 0) continue; // Skip self
                        if (shouldPlaceTree(worldTileX + nx, worldTileY + ny)) {
                            neighborCount++;
                        }
                    }
                }

                // Step 3: If neighbor count is acceptable, place the tree.
                if (neighborCount <= MAX_TREE_NEIGHBORS) {
                    chunkObjects.push(createTreeObject(worldTileX, worldTileY));
                }
            }

            // --- Bamboo Placement ---
            if (shouldPlaceBamboo(worldTileX, worldTileY)) {
                chunkObjects.push(createBambooObject(worldTileX, worldTileY));
            }

            // --- Jungle Tree Placement ---
            if (shouldPlaceJungleTree(worldTileX, worldTileY)) {
                chunkObjects.push(createJungleTreeObject(worldTileX, worldTileY));
            }

            // --- Cactus Placement Logic ---
            if (shouldPlaceCactus(worldTileX, worldTileY)) {
                chunkObjects.push(createCactusObject(worldTileX, worldTileY));
            }

            // --- Tumbleweed Placement Logic ---
            if (shouldPlaceTumbleweed(worldTileX, worldTileY)) {
                chunkObjects.push(createTumbleweedObject(worldTileX, worldTileY));
            }

            // --- Rock Placement Logic (all biomes) ---
            if (shouldPlaceRock(worldTileX, worldTileY)) {
                // Prevent placing on top of already generated vegetation
                if (!chunkObjects.some(o => Math.floor(o.x / TILE_SIZE) === worldTileX && Math.floor(o.y / TILE_SIZE) === worldTileY -1)) {
                     chunkObjects.push(createRockObject(worldTileX, worldTileY));
                }
            }

            // --- Coal Rock Placement Logic (all biomes) ---
            if (shouldPlaceCoalRock(worldTileX, worldTileY)) {
                chunkObjects.push(createCoalRockObject(worldTileX, worldTileY));
            }

            // --- Copper Rock Placement Logic (all biomes) ---
            if (shouldPlaceCopperRock(worldTileX, worldTileY)) {
                 chunkObjects.push(createCopperRockObject(worldTileX, worldTileY));
            }
            
            // --- Ice Structure Placement (snow biome) ---
            if (shouldPlaceIceStructure(worldTileX, worldTileY)) {
                chunkObjects.push(createIceStructureObject(worldTileX, worldTileY));
            }
        }
    }
 
    // Replace reserved chunk entry with final data
    const chunkData = chunks.get(chunkId) || { tiles: [], objects: [] };
    const finalObjects = chunkObjects.filter(o => !isObjectRemoved(o.id));
    
    // Add saved/placed objects
    const placedCampfires = getPlacedCampfires();
    for (const {tx, ty} of placedCampfires) {
        if (tx >= chunkX*CHUNK_SIZE && tx < (chunkX+1)*CHUNK_SIZE && ty >= chunkY*CHUNK_SIZE && ty < (chunkY+1)*CHUNK_SIZE) {
            finalObjects.push(createCampfireObject(tx, ty));
        }
    }

    const placedOvens = getPlacedOvens();
    for (const {tx, ty} of placedOvens) {
        if (tx >= chunkX*CHUNK_SIZE && tx < (chunkX+1)*CHUNK_SIZE && ty >= chunkY*CHUNK_SIZE && ty < (chunkY+1)*CHUNK_SIZE) {
            finalObjects.push(createOvenObject(tx, ty));
        }
    }

    // Add saved farmland objects for this chunk
    for (const [key, data] of farmlandState.entries()) {
        const [tx, ty] = key.split(',').map(Number);
        if (tx >= chunkX*CHUNK_SIZE && tx < (chunkX+1)*CHUNK_SIZE && ty >= chunkY*CHUNK_SIZE && ty < (chunkY+1)*CHUNK_SIZE) {
            finalObjects.push(createFarmlandObject(tx, ty, data));
        }
    }

    chunkData.objects = finalObjects;
    // apply saved tile overrides for this chunk
    const overrides = getTileOverridesForChunk(chunkX, chunkY);
    const ovMap = chunkData.tileOverrides || new Map();
    for (const { tx, ty, type } of overrides) {
        const lx = tx - chunkX * CHUNK_SIZE;
        const ly = ty - chunkY * CHUNK_SIZE;
        ovMap.set(`${lx},${ly}`, { type });
    }
    chunkData.tileOverrides = ovMap;
    chunkData.isGenerating = false;
    chunks.set(chunkId, chunkData);
    gameObjects.push(...finalObjects);
}