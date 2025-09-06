import { preloadAssets } from './asset-manager.js';
import { preloadSounds, toggleMute, ensureAudioInitialized, updateBiomeMusic, forceInitialMusicPlay } from './audio-manager.js';
import { initDebug } from './debug.js';
import { initUI } from './ui.js';
import { initMinimap } from './minimap.js';
import { initInputHandler } from './input-handler.js';
import { startGameLoop } from './game-loop.js';
import { playerState, cameraState, TILE_SIZE, playerSprites } from './state.js';
import { manageObjects } from './world.js';
import { updateCameraAndZOrder, initScreenSpaceRenderer, renderVisibleTiles } from './renderer.js';
import { initSeed } from './seed.js';
import { loadSavedState, applySavedState, setupAutoSave, saveGame, resetProgress } from './save-system.js';
import { getTileType } from './terrain.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Initialize World Seed First ---
    initSeed();

    const loadingScreen = document.getElementById('loading-screen');
    const loadingText = loadingScreen.querySelector('.loading-text');

    if (loadingText) loadingText.textContent = 'Loading Assets...';

    // --- Asset Preloading ---
    try {
        console.log('Preloading assets...');
        await preloadAssets();
        console.log('Assets preloaded successfully.');
    } catch (error) {
        console.error("Asset preloading failed:", error);
        if (loadingScreen) {
            if (loadingText) loadingText.textContent = 'Error loading assets. Please refresh.';
        }
        return;
    }

    // --- Start the game ---
    await main();

    // Hide the loading screen
    if (loadingScreen) {
        loadingScreen.classList.remove('visible');
    }
});

async function main() {
    // This function is now called after the user clicks "start"

    // --- DOM Element Setup ---
    const playerEl = document.getElementById('player');
    const tileHighlighter = document.getElementById('tile-highlighter');
    const fpsCounterEl = document.getElementById('fps-counter');
    const hotbarContainer = document.getElementById('hotbar-container');
    const resetBtn = document.getElementById('reset-progress-btn');
    
    if (!playerEl || !tileHighlighter || !fpsCounterEl || !hotbarContainer) {
        console.error('Error: Critical elements not found.');
        return;
    }
    
    // Ensure player is visible on first frame
    playerEl.style.backgroundImage = `url(${playerSprites.idle})`;

    // --- Module Initializations ---
    ensureAudioInitialized(); // Initialize audio context immediately
    preloadSounds(); // This will now prepare sound loading for when audio is initialized
    initDebug(playerEl);
    initUI();
    initMinimap();
    initInputHandler(tileHighlighter);
    initScreenSpaceRenderer();

    // --- Load & Apply Save ---
    const saved = loadSavedState();
    if (saved) applySavedState(saved);

    // --- Initial Game State Setup ---
    cameraState.x = playerState.x + TILE_SIZE / 2;
    cameraState.y = playerState.y + TILE_SIZE / 2;
    
    // --- Initial Render ---
    manageObjects(); // Initial object load
    renderVisibleTiles();

    // --- Start the Game ---
    console.log("Starting game loop...");
    setupAutoSave();
    if (!saved) saveGame();
    if (resetBtn) resetBtn.addEventListener('click', () => {
        if (confirm('Reset all progress? This will clear your saved world, inventory, and seed.')) resetProgress();
    });

    // --- Force initial music play after everything is loaded ---
    await forceInitialMusicPlay();

    startGameLoop({ playerEl, fpsCounterEl, tileHighlighter, hotbarContainer });
}