import { playerState, cameraState, TILE_SIZE, ZOOM_LEVEL, PLAYER_COLLISION_BOX, TREE_HEIGHT, CACTUS_HEIGHT, TUMBLEWEED_HEIGHT, isInDebugMode, chunks, LOG_ITEM_HEIGHT, CACTUS_PIECE_HEIGHT, STONE_ITEM_HEIGHT, ICE_STRUCTURE_HEIGHT, ROCK_HEIGHT, snowAssets } from './state.js';
import { CAMERA_SMOOTHING_FACTOR } from './constants.js';
import { getTileUrl } from './tile-lookups.js';
import { farmlandGrowthStages, getAssetPath, potatoGrowthStages } from './asset-manager.js';

// --- Object Pooling for Performance ---
const MAX_VIRTUAL_OBJECTS = 200; // Max visible objects at once
const virtualObjectPool = [];
const activeVirtualObjects = new Map(); // Map from gameObject.id to pool index
let virtualObjectContainer;

function initObjectPool() {
    virtualObjectContainer = document.getElementById('virtual-object-container');
    if (!virtualObjectContainer) {
        console.error("virtual-object-container not found!");
        return;
    }
    virtualObjectContainer.innerHTML = ''; // Clear previous
    for (let i = 0; i < MAX_VIRTUAL_OBJECTS; i++) {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.display = 'none'; // Initially hidden
        el.style.willChange = 'transform, opacity, z-index';
        virtualObjectPool.push({ el, inUse: false });
        virtualObjectContainer.appendChild(el);
    }
}
// Call init on script load
initObjectPool();

function updatePlayerPosition(playerEl) {
    // Only update DOM when there is an actual change to avoid unnecessary layout work
    const left = `${playerState.x}px`;
    const top = `${playerState.y}px`;
    if (playerEl.style.left !== left) playerEl.style.left = left;
    if (playerEl.style.top !== top) playerEl.style.top = top;
}

function updateVisibleObjects(gameObjects) {
    if (!virtualObjectContainer) return;

    // 1. Determine visible world bounds
    const halfWorldW = (window.innerWidth / 2) / ZOOM_LEVEL;
    const halfWorldH = (window.innerHeight / 2) / ZOOM_LEVEL;
    const view = {
        minX: cameraState.x - halfWorldW - TILE_SIZE, // Add buffer
        maxX: cameraState.x + halfWorldW + TILE_SIZE,
        minY: cameraState.y - halfWorldH - TILE_SIZE,
        maxY: cameraState.y + halfWorldH + TILE_SIZE * 3 // Larger buffer for tall objects
    };

    const visibleObjectIds = new Set();
    const visibleObjects = [];

    // 2. Find all objects within the visible bounds
    for (const obj of gameObjects) {
        // Simple bounding box check
        if (obj.x + TILE_SIZE > view.minX && obj.x < view.maxX &&
            obj.y + TREE_HEIGHT > view.minY && obj.y < view.maxY) { // Use TREE_HEIGHT as max possible height for buffer
            visibleObjectIds.add(obj.id);
            visibleObjects.push(obj);
        }
    }

    // 3. Deactivate objects that are no longer visible
    const toDeactivate = [];
    for (const [id, poolIndex] of activeVirtualObjects.entries()) {
        if (!visibleObjectIds.has(id)) {
            const poolObj = virtualObjectPool[poolIndex];
            if (poolObj) {
                poolObj.el.style.display = 'none';
                poolObj.inUse = false;
                poolObj.assignedId = null;
            }
            toDeactivate.push(id);
        }
    }
    toDeactivate.forEach(id => activeVirtualObjects.delete(id));

    // 4. Activate or update visible objects
    for (const obj of visibleObjects) {
        let poolIndex = activeVirtualObjects.get(obj.id);
        let isNew = poolIndex === undefined;

        if (isNew) {
            poolIndex = virtualObjectPool.findIndex(p => !p.inUse);
            if (poolIndex === -1) {
                // console.warn("Virtual object pool exhausted!");
                continue; // No free elements, skip this object
            }
        }
        
        const poolObj = virtualObjectPool[poolIndex];
        const el = poolObj.el;

        if (isNew) {
            poolObj.inUse = true;
            poolObj.assignedId = obj.id;
            activeVirtualObjects.set(obj.id, poolIndex);
            
            el.className = obj.className;
            el.style.display = 'block';
            
            // Assign a reference back to the main game object for z-indexing and direct updates
            obj.el = el;
        }

        // --- Class management for state changes ---
        if (obj.type === 'tree') {
            const hasFireClass = el.classList.contains('on-fire');
            if (obj.isOnFire && !hasFireClass) {
                el.classList.add('on-fire');
            } else if (!obj.isOnFire && hasFireClass) {
                el.classList.remove('on-fire');
            }

            const hasJungleClass = el.classList.contains('jungle-tree');
            const isJungleTree = obj.variant === getAssetPath('jungleTree');
            if(isJungleTree && !hasJungleClass) {
                el.classList.add('jungle-tree');
            } else if (!isJungleTree && hasJungleClass) {
                el.classList.remove('jungle-tree');
            }

            const hasSnowClass = el.classList.contains('snow-tree');
            const isSnowTree = obj.variant === snowAssets.tree;
            if (isSnowTree && !hasSnowClass) {
                el.classList.add('snow-tree');
            } else if (!isSnowTree && hasSnowClass) {
                el.classList.remove('snow-tree');
            }
        }

        // --- UPDATE LOGIC (runs for both new and existing objects) ---

        // Position
        el.style.left = `${obj.x}px`;
        el.style.top = `${obj.y}px`;

        // Background Image / Variant / Stage
        let newBgUrl = '';
        if (obj.type === 'growing_farmland') {
            const stages = obj.crop === 'potato' ? potatoGrowthStages : farmlandGrowthStages;
            newBgUrl = `url(${stages[obj.stage]})`;
        } else if (obj.variant) {
            newBgUrl = `url(${obj.variant})`;
        } else if (obj.customStyle) { // for debug dummies
             Object.assign(el.style, obj.customStyle);
        }

        if (el.style.backgroundImage !== newBgUrl && !obj.customStyle) {
            el.style.backgroundImage = newBgUrl;
        }
        
        // Transform for dynamic objects (tumbleweeds, items)
        let newTransform = '';
        if (obj.type === 'tumbleweed' || obj.type === 'log_item' || obj.type === 'cactus_piece' || obj.type === 'stone_item' || obj.type === 'copper_ore_item' || obj.type === 'ice_chunk' || obj.type === 'ice_medalion' || obj.type === 'wheat_item') {
            newTransform = `translateY(-${obj.z || 0}px) rotate(${obj.rotation || 0}deg)`;
        }
        
        if (el.style.transform !== newTransform) {
            el.style.transform = newTransform;
        }

        // One-time setup for new animated objects
        if (isNew) {
            if (obj.type === 'tree' || obj.type === 'cactus') {
                el.style.animationDelay = `${-(Math.random() * 5)}s`;
            }
        }
    }
    return visibleObjects;
}

let screenGrid = { cols: 0, rows: 0, tiles: [], minX: 0, minY: 0 };

export function forceGridRebuild() {
    screenGrid.cols = 0;
    screenGrid.rows = 0;
}

export function initScreenSpaceRenderer() {
    const gridContainer = document.getElementById('grid-container');
    if (!gridContainer) return;
    screenGrid.tiles = [];
    gridContainer.innerHTML = '';
    screenGrid.cols = 0; screenGrid.rows = 0; // force build on first render
}

export function renderVisibleTiles(forceUpdate = false) {
    const gridContainer = document.getElementById('grid-container');
    if (!gridContainer) return;

    const halfWorldW = (window.innerWidth / 2) / ZOOM_LEVEL;
    const halfWorldH = (window.innerHeight / 2) / ZOOM_LEVEL;
    const visibleMinTileX = Math.floor((cameraState.x - halfWorldW) / TILE_SIZE) - 1;
    const visibleMaxTileX = Math.floor((cameraState.x + halfWorldW) / TILE_SIZE) + 1;
    const visibleMinTileY = Math.floor((cameraState.y - halfWorldH) / TILE_SIZE) - 1;
    const visibleMaxTileY = Math.floor((cameraState.y + halfWorldH) / TILE_SIZE) + 1;

    // --- OPTIMIZATION ---
    // Calculate required grid size based on screen dimensions, not camera position.
    // This prevents expensive DOM rebuilds when the camera moves.
    const requiredCols = Math.ceil(window.innerWidth / (TILE_SIZE * ZOOM_LEVEL)) + 3;
    const requiredRows = Math.ceil(window.innerHeight / (TILE_SIZE * ZOOM_LEVEL)) + 3;

    // Only rebuild the grid if the screen size changes.
    if (requiredCols !== screenGrid.cols || requiredRows !== screenGrid.rows) {
        screenGrid.cols = requiredCols;
        screenGrid.rows = requiredRows;
        screenGrid.tiles = [];
        gridContainer.innerHTML = '';
        gridContainer.style.gridTemplateColumns = `repeat(${requiredCols}, ${TILE_SIZE}px)`;
        gridContainer.style.gridTemplateRows = `repeat(${requiredRows}, ${TILE_SIZE}px)`;
        gridContainer.style.width = `${requiredCols * TILE_SIZE}px`;
        gridContainer.style.height = `${requiredRows * TILE_SIZE}px`;
        for (let i = 0; i < requiredCols * requiredRows; i++) {
            const tile = document.createElement('div');
            tile.className = 'grid-tile';
            screenGrid.tiles.push(tile);
            gridContainer.appendChild(tile);
        }
    }

    // --- OPTIMIZATION ---
    // If the visible grid of tiles hasn't shifted, no need to update anything.
    if (!forceUpdate && visibleMinTileX === screenGrid.minX && visibleMinTileY === screenGrid.minY) {
        return;
    }

    screenGrid.minX = visibleMinTileX;
    screenGrid.minY = visibleMinTileY;
    gridContainer.style.left = `${visibleMinTileX * TILE_SIZE}px`;
    gridContainer.style.top = `${visibleMinTileY * TILE_SIZE}px`;

    let idx = 0;
    for (let yOffset = 0; yOffset < screenGrid.rows; yOffset++) {
        for (let xOffset = 0; xOffset < screenGrid.cols; xOffset++) {
            const tx = visibleMinTileX + xOffset;
            const ty = visibleMinTileY + yOffset;

            const tileEl = screenGrid.tiles[idx++];
            if (!tileEl) continue; // Safeguard if grid is resizing

            let tileInfo;

            if (isInDebugMode) {
                const debugChunk = chunks.get('debug,0,0');
                // Use the debug map, with a default background for empty areas
                const tileData = debugChunk?.tiles.get(`${tx},${ty}`);
                tileInfo = tileData || { url: null };
            } else {
                // Use the new advanced tile selection logic
                tileInfo = getTileUrl(tx, ty);
            }
            
            if (tileInfo && tileInfo.isSpecial) {
                // The URL can now be a multi-layered one (e.g., for sprinklers)
                const newBg = tileInfo.url ? `${tileInfo.url}` : '';
                if (tileEl.style.backgroundImage !== newBg) {
                    tileEl.style.backgroundImage = newBg;
                }
                if (!tileEl.classList.contains('special-tile-bg')) {
                    tileEl.classList.add('special-tile-bg');
                }
            } else {
                if (tileEl.classList.contains('special-tile-bg')) {
                    tileEl.classList.remove('special-tile-bg');
                }
                const newBg = tileInfo && tileInfo.url ? `url(${tileInfo.url})` : '';
                if (tileEl.style.backgroundImage !== newBg) {
                    tileEl.style.backgroundImage = newBg;
                } else if (!newBg) { // Explicitly clear if there's no new background
                    tileEl.style.backgroundImage = '';
                }
            }

            // Handle rotation for special tiles
            const rotation = (tileInfo && tileInfo.rotation) ? `rotate(${tileInfo.rotation}deg)` : '';
            if (tileEl.style.transform !== rotation) {
                tileEl.style.transform = rotation;
            }

            // Handle flip for special tiles
            if (tileInfo && tileInfo.flipX) {
                if (!tileEl.classList.contains('grid-tile-flipped-x')) {
                    tileEl.classList.add('grid-tile-flipped-x');
                }
            } else {
                if (tileEl.classList.contains('grid-tile-flipped-x')) {
                    tileEl.classList.remove('grid-tile-flipped-x');
                }
            }
        }
    }
}

function updateCamera(deltaSeconds = 0.016) {
    const gameWorld = document.getElementById('game-world');
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Smooth the cursor offset itself for a more polished feel
    const CURSOR_SMOOTHING_FACTOR = 0.08; // A bit faster than camera smoothing
    const cursorTau = Math.max(0.001, CURSOR_SMOOTHING_FACTOR);
    const cursorAlpha = 1 - Math.exp(-Math.max(0, deltaSeconds) / cursorTau);
    cameraState.cursorOffsetX += (cameraState.targetCursorOffsetX - cameraState.cursorOffsetX) * cursorAlpha;
    cameraState.cursorOffsetY += (cameraState.targetCursorOffsetY - cameraState.cursorOffsetY) * cursorAlpha;

    // Apply a cursor-based offset to the camera target so camera nudges toward cursor direction
    const CURSOR_CAMERA_STRENGTH = 0.25; // lower = subtler nudge
    const targetX = playerState.x + TILE_SIZE / 2 + (cameraState.cursorOffsetX * CURSOR_CAMERA_STRENGTH);
    const targetY = playerState.y + TILE_SIZE / 2 + (cameraState.cursorOffsetY * CURSOR_CAMERA_STRENGTH);

    // Use exponential smoothing to compute a framerate-independent interpolation alpha:
    // alpha = 1 - exp(-dt / tau) where CAMERA_SMOOTHING_FACTOR is treated as time-constant tau (seconds).
    const tau = Math.max(0.001, CAMERA_SMOOTHING_FACTOR);
    const alpha = 1 - Math.exp(-Math.max(0, deltaSeconds) / tau);

    // Smoothly interpolate camera position towards player+cursor position using alpha
    cameraState.x += (targetX - cameraState.x) * alpha;
    cameraState.y += (targetY - cameraState.y) * alpha;

    // --- Camera Shake ---
    let shakeX = 0;
    let shakeY = 0;
    if (cameraState.shake > 0) {
        shakeX = (Math.random() - 0.5) * cameraState.shake;
        shakeY = (Math.random() - 0.5) * cameraState.shake;
        cameraState.shake *= 0.9; // Dampen the shake
        if (cameraState.shake < 0.5) {
            cameraState.shake = 0;
        }
    }

    const translateX = -cameraState.x + shakeX;
    const translateY = -cameraState.y + shakeY;

    // Avoid reassigning identical transform string to reduce style thrash
    const transformStr = `translate(${centerX}px, ${centerY}px) scale(${ZOOM_LEVEL}) translate(${translateX}px, ${translateY}px)`;
    if (gameWorld.style.transform !== transformStr) {
        gameWorld.style.transform = transformStr;
    }
}

function updateZIndexing(playerEl, visibleObjects) {
    const allDrawableObjects = [
        { el: playerEl, y: playerState.y + PLAYER_COLLISION_BOX.offsetY + PLAYER_COLLISION_BOX.height },
        ...visibleObjects.map(obj => {
            let sortY = obj.y;
            // Use the collision box center for sorting to feel more natural for tall objects
            if (obj.collisionBox && obj.collisionBox.height > 0) {
                 sortY = obj.collisionBox.y + obj.collisionBox.height / 2;
            } else {
                // Fallback for objects without collision boxes (like items)
                 if (obj.type === 'growing_farmland') {
                    // Treat farmland as a ground decal for sorting
                    sortY = obj.y; 
                 } else {
                    sortY = obj.y + TILE_SIZE;
                 }
            }
            return { el: obj.el, y: sortY };
        })
    ];

    allDrawableObjects.sort((a, b) => a.y - b.y);

    allDrawableObjects.forEach((obj, index) => {
        if (obj.el) {
           obj.el.style.zIndex = index + 1;
        }
    });
}

export function updateCameraAndZOrder(playerEl, gameObjects, deltaSeconds = 0.016) {
    updatePlayerPosition(playerEl);
    const visibleObjects = updateVisibleObjects(gameObjects);
    updateCamera(deltaSeconds);
    updateZIndexing(playerEl, visibleObjects);
}