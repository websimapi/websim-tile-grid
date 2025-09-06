import { playerState, cameraState, gameObjects, chunks, TILE_SIZE, setDebugMode, isInDebugMode, TREE_HEIGHT, TREE_COLLISION_BOX, CACTUS_COLLISION_BOX } from './state.js';
import { commonTileImages, sandTileImages, borderTileImages, playerSprites, cactusVariants } from './asset-manager.js';
import { initScreenSpaceRenderer } from './renderer.js';

let playerEl;
let spawnTumbleweedBtn;
let spawnedTumbleweedCounter = 0;

function spawnDebugTumbleweed() {
    if (!isInDebugMode) return;
    spawnedTumbleweedCounter++;
    const twPos = { x: playerState.x, y: playerState.y };
    const tumbleweedObject = {
        el: null,
        id: `debug_spawned_tumbleweed_${spawnedTumbleweedCounter}`,
        className: 'tumbleweed',
        type: 'tumbleweed',
        x: twPos.x,
        y: twPos.y,
        z: 0,
        vz: 0,
        dx: 0,
        dy: 0,
        state: 'idle',
        stateTimer: 9999, // Make it stationary
        collisionBox: null,
        rotation: 0
    };
    gameObjects.push(tumbleweedObject);
}

export function initDebug(pEl) {
    playerEl = pEl;
    spawnTumbleweedBtn = document.getElementById('spawn-tumbleweed-btn');
    if (spawnTumbleweedBtn) {
        spawnTumbleweedBtn.addEventListener('click', spawnDebugTumbleweed);
    }
}

function clearWorld() {
    // Clear all game objects from the DOM and the central array
    for (const obj of gameObjects) {
        if (obj.el && obj.el.parentElement) {
            obj.el.remove();
        }
    }
    gameObjects.length = 0;

    // Clear all chunk data
    chunks.clear();

    // Reset the screen-space grid renderer
    initScreenSpaceRenderer();
}

function generateDebugMap() {
    clearWorld();

    const debugObjects = [];
    const debugTiles = new Map(); // Using a Map to store tile data: "x,y" => tileUrl

    // --- Create Tile Layout ---
    const mapSize = { width: 25, height: 15 };
    const sandStart = { x: 8, y: 4 };
    const sandEnd = { x: 18, y: 10 };

    for (let y = 0; y < mapSize.height; y++) {
        for (let x = 0; x < mapSize.width; x++) {
            const coord = `${x},${y}`;
            let tile = null;
            const isSand = x >= sandStart.x && x <= sandEnd.x && y >= sandStart.y && y <= sandEnd.y;

            if (isSand) {
                // --- Sand Tiles ---
                if (x === sandStart.x && y === sandStart.y) tile = borderTileImages.topLeft;
                else if (x === sandEnd.x && y === sandStart.y) tile = borderTileImages.topRight;
                else if (x === sandStart.x && y === sandEnd.y) tile = borderTileImages.bottomLeft;
                else if (x === sandEnd.x && y === sandEnd.y) tile = borderTileImages.bottomRight;
                else if (y === sandStart.y) tile = borderTileImages.top;
                else if (y === sandEnd.y) tile = borderTileImages.bottom;
                else if (x === sandStart.x) tile = borderTileImages.left;
                else if (x === sandEnd.x) tile = borderTileImages.right;
                else {
                    const rand = (x * 13 + y * 37) % sandTileImages.length;
                    tile = { url: sandTileImages[rand] };
                }
            } else {
                // --- Grass Tiles ---
                const isAdjacentToSand = (x >= sandStart.x - 1 && x <= sandEnd.x + 1 && y >= sandStart.y - 1 && y <= sandEnd.y + 1);
                if (isAdjacentToSand) {
                    // Inner corners on grass side
                    if (x === sandStart.x - 1 && y === sandStart.y - 1) tile = borderTileImages.innerTopLeft;
                    else if (x === sandEnd.x + 1 && y === sandStart.y - 1) tile = borderTileImages.innerTopRight;
                    else if (x === sandStart.x - 1 && y === sandEnd.y + 1) tile = borderTileImages.innerBottomLeft;
                    else if (x === sandEnd.x + 1 && y === sandEnd.y + 1) tile = borderTileImages.innerBottomRight;
                    else tile = { url: commonTileImages[2] }; // Solid grass for edges
                } else {
                    const rand = (x * 13 + y * 37) % commonTileImages.length;
                    tile = { url: commonTileImages[rand] };
                }
            }
            if (tile && tile.url) debugTiles.set(coord, tile);
        }
    }

    // --- Create Game Objects ---
    const lineY = 2;
    let lineX = 2;

    // Place a tree
    const treePos = { x: lineX * TILE_SIZE, y: lineY * TILE_SIZE };
    debugObjects.push({
        el: null, id: 'debug_tree_1', className: 'tree', type: 'tree',
        x: treePos.x, y: treePos.y,
        collisionBox: { ...TREE_COLLISION_BOX, x: treePos.x + TREE_COLLISION_BOX.offsetX, y: treePos.y + TREE_COLLISION_BOX.offsetY }
    });
    lineX += 2;
    
    // Place a cactus
    const cactusPos = { x: lineX * TILE_SIZE, y: lineY * TILE_SIZE };
    debugObjects.push({
        el: null, id: 'debug_cactus_1', className: 'cactus', type: 'cactus',
        x: cactusPos.x, y: cactusPos.y,
        variant: cactusVariants[0], // Use the first variant for debug
        collisionBox: { ...CACTUS_COLLISION_BOX, x: cactusPos.x + CACTUS_COLLISION_BOX.offsetX, y: cactusPos.y + CACTUS_COLLISION_BOX.offsetY }
    });
    lineX += 2;
    
    // Place a tumbleweed
    const twPos = { x: lineX * TILE_SIZE, y: lineY * TILE_SIZE };
    debugObjects.push({
        el: null, id: 'debug_tumbleweed_1', className: 'tumbleweed', type: 'tumbleweed',
        x: twPos.x, y: twPos.y,
        z: 0, vz: 0, dx: 0, dy: 0, state: 'idle', stateTimer: 999, // Make it stationary
        collisionBox: null,
        rotation: 0
    });
    lineX += 3; // Extra space

    // Place static dummies to display player animations
    Object.entries(playerSprites).forEach(([name, sprite]) => {
        const dPos = { x: lineX * TILE_SIZE, y: lineY * TILE_SIZE };
        debugObjects.push({
            el: null, id: `debug_dummy_${name}`, className: 'dummy', type: 'dummy',
            x: dPos.x, y: dPos.y, collisionBox: null,
            customStyle: { backgroundImage: `url(${sprite})`, width: '40px', height: '40px' }
        });
        lineX += 2;
    });

    // Store all debug data in a special, single chunk for easy access
    chunks.set('debug,0,0', {
        tileOverrides: debugTiles,
        objects: [], // Objects are managed globally for simplicity in debug mode
        isGenerating: false,
    });
    
    gameObjects.push(...debugObjects);
}

function respawnPlayer() {
    playerState.x = 0;
    playerState.y = 0;
    cameraState.x = playerState.x + TILE_SIZE / 2;
    cameraState.y = playerState.y + TILE_SIZE / 2;
    if (playerEl) {
        playerEl.style.left = `${playerState.x}px`;
        playerEl.style.top = `${playerState.y}px`;
    }
}

export function toggleDebugMode() {
    const newDebugState = !isInDebugMode;
    setDebugMode(newDebugState);

    if (spawnTumbleweedBtn) {
        spawnTumbleweedBtn.style.display = newDebugState ? 'block' : 'none';
    }

    if (newDebugState) {
        console.log("Entering debug mode. Press 'M' to exit.");
        generateDebugMap();
        respawnPlayer();
    } else {
        console.log("Exiting debug mode.");
        clearWorld();
        respawnPlayer();
        // The normal world generation will kick in automatically on the next game loop frames.
    }
}