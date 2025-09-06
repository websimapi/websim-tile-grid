import { inventory, gameObjects, TILE_SIZE, chunks, CHUNK_SIZE, playerState, PLAYER_COLLISION_BOX } from '../state.js';
import { consumeSelectedItem } from '../inventory-manager.js';
import { isCampfirePlaced, registerCampfirePlaced, saveGame, registerTileOverride, isOvenPlaced, registerOvenPlaced } from './save-system.js';
import { getTileType } from './terrain.js';
import { startMeltingSnow } from './environment.js';
import { updateMinimap } from './minimap.js';
import { farmlandGrowthStages } from './asset-manager.js';
import { renderVisibleTiles } from './renderer.js';

let farmlandIdCounter = 0;

function isTileOccupied(tileX, tileY) {
    const tileWorldX = tileX * TILE_SIZE;
    const tileWorldY = tileY * TILE_SIZE;
    return gameObjects.some(o => o.collisionBox &&
        tileWorldX < o.collisionBox.x + o.collisionBox.width &&
        tileWorldX + TILE_SIZE > o.collisionBox.x &&
        tileWorldY < o.collisionBox.y + o.collisionBox.height &&
        tileWorldY + TILE_SIZE > o.collisionBox.y);
}

function checkAndPushPlayer(obstacleBox) {
    const playerBox = {
        x: playerState.x + PLAYER_COLLISION_BOX.offsetX,
        y: playerState.y + PLAYER_COLLISION_BOX.offsetY,
        width: PLAYER_COLLISION_BOX.width,
        height: PLAYER_COLLISION_BOX.height
    };

    // AABB collision check
    const isColliding = playerBox.x < obstacleBox.x + obstacleBox.width &&
                        playerBox.x + playerBox.width > obstacleBox.x &&
                        playerBox.y < obstacleBox.y + obstacleBox.height &&
                        playerBox.y + playerBox.height > obstacleBox.y;

    if (isColliding) {
        // Collision detected. Find minimum push distance.
        const rightOverlap = (playerBox.x + playerBox.width) - obstacleBox.x;
        const leftOverlap = (obstacleBox.x + obstacleBox.width) - playerBox.x;
        const bottomOverlap = (playerBox.y + playerBox.height) - obstacleBox.y;
        const topOverlap = (obstacleBox.y + obstacleBox.height) - playerBox.y;

        const minOverlapX = Math.min(rightOverlap, leftOverlap);
        const minOverlapY = Math.min(bottomOverlap, topOverlap);

        // Push out on the axis with the smallest overlap
        if (minOverlapX < minOverlapY) {
            if (rightOverlap < leftOverlap) {
                playerState.x -= rightOverlap; // Push left
            } else {
                playerState.x += leftOverlap; // Push right
            }
        } else {
            if (bottomOverlap < topOverlap) {
                playerState.y -= bottomOverlap; // Push up
            } else {
                playerState.y += topOverlap; // Push down
            }
        }
    }
}

export function placeBlock(tileX, tileY) {
    const selected = inventory.hotbar[inventory.selectedHotbarIndex];
    if (!selected) return false;
    
    if (isTileOccupied(tileX, tileY)) return false;

    if (selected.type === 'campfire_item') {
        if (isCampfirePlaced(tileX, tileY)) return false;

        const x = tileX * TILE_SIZE, y = tileY * TILE_SIZE;
        const campfireObject = {
            el: null, id: `campfire_${tileX}_${tileY}`, className: 'campfire', type: 'campfire', x, y,
            collisionBox: { x, y, width: TILE_SIZE, height: TILE_SIZE }
        };
        gameObjects.push(campfireObject);

        consumeSelectedItem(1);
        registerCampfirePlaced(tileX, tileY);
        
        // Push player if they are now stuck inside the campfire
        checkAndPushPlayer(campfireObject.collisionBox);

        saveGame();
        return true;
    }

    if (selected.type === 'oven_item') {
        if (isOvenPlaced(tileX, tileY)) return false;

        const x = tileX * TILE_SIZE;
        const y = tileY * TILE_SIZE;
        const ovenObject = {
            el: null, 
            id: `oven_${tileX}_${tileY}`, 
            className: 'oven', 
            type: 'oven', 
            x, y,
            collisionBox: { x, y: y + TILE_SIZE / 2, width: TILE_SIZE, height: TILE_SIZE / 2 }
        };
        gameObjects.push(ovenObject);

        consumeSelectedItem(1);
        registerOvenPlaced(tileX, tileY);
        
        checkAndPushPlayer(ovenObject.collisionBox);
        
        saveGame();
        return true;
    }

    if (selected.type === 'sprinkler_item' || selected.type === 'copper_sprinkler_item') {
        const x = tileX * TILE_SIZE;
        const y = tileY * TILE_SIZE;
        
        const sprinklerTileType = selected.type === 'copper_sprinkler_item' ? 'copper_sprinkler' : 'sprinkler';
        registerTileOverride(tileX, tileY, sprinklerTileType);

        // Change surrounding 3x3 tiles to farmland
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip the center tile
                const farmX = tileX + dx;
                const farmY = tileY + dy;
                
                // Check if this tile is occupied by a solid object
                const isOccupied = gameObjects.some(obj => {
                    if (!obj.collisionBox) return false;
                    const objTileX = Math.floor((obj.collisionBox.x + obj.collisionBox.width / 2) / TILE_SIZE);
                    const objTileY = Math.floor((obj.collisionBox.y + obj.collisionBox.height / 2) / TILE_SIZE);
                    return objTileX === farmX && objTileY === farmY;
                });
                
                if (!isOccupied) {
                    registerTileOverride(farmX, farmY, 'farmland');
                }
            }
        }

        consumeSelectedItem(1);
        saveGame();
        renderVisibleTiles(true); // Force re-render to show changes
        updateMinimap();
        return true;
    }

    if (selected.type === 'log_item') {
        // block if an object occupies this tile - already checked above
        // set chunk tile override
        const chunkX = Math.floor(tileX / CHUNK_SIZE), chunkY = Math.floor(tileY / CHUNK_SIZE);
        const chunk = chunks.get(`${chunkX},${chunkY}`);
        if (!chunk) return false;
        const lx = tileX - chunkX * CHUNK_SIZE, ly = tileY - chunkY * CHUNK_SIZE;
        const key = `${lx},${ly}`;
        const existing = chunk.tileOverrides.get(key);
        if (existing && existing.type === 'wood') return false;
        chunk.tileOverrides.set(key, { type: 'wood' });
        registerTileOverride(tileX, tileY, 'wood');
        consumeSelectedItem(1);
        saveGame();
        return true;
    }
    return false;
}