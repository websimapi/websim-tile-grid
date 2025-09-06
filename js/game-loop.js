import { handlePlayerMovement, updatePlayerAnimation } from './player.js';
import { updateCameraAndZOrder, renderVisibleTiles } from './renderer.js';
import { updateMinimap } from './minimap.js';
import { manageObjects } from './world.js';
import { updateEntities } from './entities.js';
import { updateUI } from './ui.js';
import { gameObjects, isInDebugMode, keysPressed, playerState, cameraState, CHUNK_SIZE, TILE_SIZE, RENDER_DISTANCE_CHUNKS, inventory, HUNGER_TICK_INTERVAL } from './state.js';
import { updateBiomeMusic } from './audio-manager.js';
import { getBiomeInfo } from './terrain.js';
import { updateFires } from './environment.js';

let lastTime = 0;
let frameCount = 0;
let fpsLastUpdate = 0;
let minimapUpdateCounter = 0;
const MINIMAP_UPDATE_INTERVAL = 4; // Update minimap every 4 frames
let musicUpdateCounter = 0;
const MUSIC_UPDATE_INTERVAL = 15; // Check biome for music change every 15 frames
let fireUpdateCounter = 0;
const FIRE_UPDATE_INTERVAL = 15; // Check for fire spreading every 15 frames

function gameLoop(currentTime, { playerEl, fpsCounterEl, tileHighlighter, hotbarContainer, interactionPrompt }) {
    // --- Delta Time (in seconds) ---
    if (!lastTime) lastTime = currentTime;
    const deltaMs = currentTime - lastTime;
    const deltaSeconds = Math.min(deltaMs / 1000, 0.05); // clamp to avoid large jumps after tab-switch
    lastTime = currentTime;

    // --- FPS Counter (updated once per second) ---
    frameCount++;
    if (currentTime - fpsLastUpdate >= 1000) {
        const fps = frameCount;
        fpsCounterEl.textContent = `FPS: ${fps}`;
        frameCount = 0;
        fpsLastUpdate = currentTime;
    }
    
    // --- Player Logic ---
    const isMoving = handlePlayerMovement(deltaSeconds);
    updatePlayerAnimation(isMoving, playerEl, deltaSeconds);

    // --- Hunger Depletion ---
    playerState.hungerDepletionTimer += deltaSeconds;
    if (playerState.hungerDepletionTimer >= HUNGER_TICK_INTERVAL) {
        playerState.hungerDepletionTimer -= HUNGER_TICK_INTERVAL;
        if (playerState.currentHunger > 0) {
            playerState.currentHunger--;
        }
    }

    // --- Environment Logic ---
    fireUpdateCounter++;
    if (fireUpdateCounter >= FIRE_UPDATE_INTERVAL) {
        updateFires(deltaSeconds * FIRE_UPDATE_INTERVAL); // Pass total elapsed time
        fireUpdateCounter = 0;
    }

    // --- Entity & Item Logic ---
    updateEntities(deltaSeconds);

    // --- Audio ---
    musicUpdateCounter++;
    if (musicUpdateCounter >= MUSIC_UPDATE_INTERVAL) {
        // Determine biome based on the center of the player's collision box (feet)
        const playerFeetX = playerState.x + playerState.collisionBox.offsetX + (playerState.collisionBox.width / 2);
        const playerFeetY = playerState.y + playerState.collisionBox.offsetY + (playerState.collisionBox.height / 2);
        const playerTileX = Math.floor(playerFeetX / TILE_SIZE);
        const playerTileY = Math.floor(playerFeetY / TILE_SIZE);
        
        const biomeInfo = getBiomeInfo(playerTileX, playerTileY);
        updateBiomeMusic(biomeInfo.type);
        musicUpdateCounter = 0;
    }

    // --- UI Updates ---
    minimapUpdateCounter++;
    if (minimapUpdateCounter >= MINIMAP_UPDATE_INTERVAL) {
        updateMinimap();
        minimapUpdateCounter = 0;
    }
    updateUI();

    // --- World and Object Management ---
    // In debug mode, objects are static, so we don't need to manage chunks.
    if (!isInDebugMode) {
        manageObjects();
    }

    // --- Rendering ---
    updateCameraAndZOrder(playerEl, gameObjects, deltaSeconds);
    renderVisibleTiles();

    // --- Loop ---
    requestAnimationFrame((time) => gameLoop(time, { playerEl, fpsCounterEl, tileHighlighter, hotbarContainer, interactionPrompt }));
}


export function startGameLoop(elements) {
    requestAnimationFrame((time) => gameLoop(time, elements));
}