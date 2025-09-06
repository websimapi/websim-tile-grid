import { chunks, gameObjects, CHUNK_SIZE, TILE_SIZE, RENDER_DISTANCE_CHUNKS, playerState, cameraState, ZOOM_LEVEL, isInDebugMode, suppressChunkUnloadUntil } from './state.js';
import { generateChunkData } from './world-generation.js';

// --- Chunk Management ---

function loadChunk(chunkX, chunkY) {
    const chunkId = `${chunkX},${chunkY}`;
    if (chunks.has(chunkId)) return;
    
    // Reserve the chunk entry immediately to prevent duplicate generation requests
    chunks.set(chunkId, { tileOverrides: new Map(), objects: [], isGenerating: true });
    
    // The generation logic is now in a separate module
    generateChunkData(chunkX, chunkY);
}

function unloadChunk(chunkId) {
    const chunk = chunks.get(chunkId);
    if (chunk && !chunk.isGenerating) {
        // Find and remove objects from the global gameObjects array
        const chunkObjectIds = new Set(chunk.objects.map(obj => obj.id));
        for (let i = gameObjects.length - 1; i >= 0; i--) {
            if (chunkObjectIds.has(gameObjects[i].id)) {
                gameObjects.splice(i, 1);
            }
        }
        // No DOM elements to remove here anymore, renderer handles it
        chunks.delete(chunkId);
    }
}

export function manageObjects() {
    if (isInDebugMode) return; // Do not manage chunks/objects in debug mode.
    const requiredChunks = new Set();

    const halfWorldW = (window.innerWidth / 2) / ZOOM_LEVEL;
    const halfWorldH = (window.innerHeight / 2) / ZOOM_LEVEL;
    const visibleMinTileX = Math.floor((cameraState.x - halfWorldW) / TILE_SIZE) - 1;
    const visibleMaxTileX = Math.floor((cameraState.x + halfWorldW) / TILE_SIZE) + 1;
    const visibleMinTileY = Math.floor((cameraState.y - halfWorldH) / TILE_SIZE) - 1;
    const visibleMaxTileY = Math.floor((cameraState.y + halfWorldH) / TILE_SIZE) + 1;
    
    // Determine which chunks are needed based on camera view + render distance buffer
    const minChunkX = Math.floor(visibleMinTileX / CHUNK_SIZE) - RENDER_DISTANCE_CHUNKS;
    const maxChunkX = Math.floor(visibleMaxTileX / CHUNK_SIZE) + RENDER_DISTANCE_CHUNKS;
    const minChunkY = Math.floor(visibleMinTileY / CHUNK_SIZE) - RENDER_DISTANCE_CHUNKS;
    const maxChunkY = Math.floor(visibleMaxTileY / CHUNK_SIZE) + RENDER_DISTANCE_CHUNKS;

    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
        for (let cy = minChunkY; cy <= maxChunkY; cy++) {
            const chunkId = `${cx},${cy}`;
            requiredChunks.add(chunkId);
            const chunk = chunks.get(chunkId);
            if (!chunk) {
                loadChunk(cx, cy);
            }
        }
    }

    // Unload chunks that are no longer required
    const now = performance.now();
    if (now >= suppressChunkUnloadUntil) {
        for (const chunkId of chunks.keys()) {
            if (!requiredChunks.has(chunkId)) {
                unloadChunk(chunkId);
            }
        }
    }
}

export function getHoveredTile(event, tileHighlighter) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const mouseFromCenterX = event.clientX - centerX;
    const mouseFromCenterY = event.clientY - centerY;
    const mouseInScaledWorldX = mouseFromCenterX / ZOOM_LEVEL;
    const mouseInScaledWorldY = mouseFromCenterY / ZOOM_LEVEL;
    const worldX = mouseInScaledWorldX + cameraState.x;
    const worldY = mouseInScaledWorldY + cameraState.y;
    
    const tileGridX = Math.floor(worldX / TILE_SIZE);
    const tileGridY = Math.floor(worldY / TILE_SIZE);

    tileHighlighter.style.left = `${tileGridX * TILE_SIZE}px`;
    tileHighlighter.style.top = `${tileGridY * TILE_SIZE}px`;
    tileHighlighter.style.display = 'block';

    return { x: tileGridX, y: tileGridY };
}