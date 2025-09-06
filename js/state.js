import * as C from './constants.js';
import { playerSprites, itemSprites, snowAssets } from './asset-manager.js';

// --- SHARED GAME STATE ---

// Maps chunk coordinates "x,y" to { tiles: [], objects: [] }
export const chunks = new Map(); 

// Holds all dynamic objects (like trees) from all loaded chunks for easy access
export let gameObjects = []; 

// Debug Mode State
export let isInDebugMode = false;
export function setDebugMode(value) {
    isInDebugMode = value;
}

// Player's state
export const playerState = {
    x: 0, // Position in world coordinates
    y: 0,
    vx: 0, // Velocity in world coordinates per second
    vy: 0,
    collisionBox: C.PLAYER_COLLISION_BOX, // Add collision box to state for easy access
    currentAnimation: 'idle',
    facingDirection: 'right', // 'left' or 'right',
    isChopping: false,
    footstepTimer: 0,
    maxHunger: 9,
    currentHunger: 9,
    hungerDepletionTimer: 0,
};

// Camera's state for smooth movement
export const cameraState = {
    x: 0,
    y: 0,
    cursorOffsetX: 0, // pixels: current smoothed offset based on cursor position
    cursorOffsetY: 0,
    targetCursorOffsetX: 0, // pixels: desired offset based on cursor position
    targetCursorOffsetY: 0,
    shake: 0 // New property for camera shake intensity
};

// Player inventory
export const inventory = {
    hotbar: [null, null, null, null, null], // 5 slots, null if empty
    selectedHotbarIndex: 0,
    slots: new Array(15).fill(null), // inventory grid slots
    equipment: new Array(4).fill(null) // 4 equipment slots
};
// Example item: { type: 'log', count: 5 }

// Input state
export const keysPressed = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

export const joystickState = {
    active: false,
    x: 0,
    y: 0,
    baseX: 0, // for touch joystick
    baseY: 0, // for touch joystick
    touchId: null // track specific touch
};

export const mouseState = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
};

// Mobile tap-to-move target
export const mobileMove = {
    active: false,
    tx: 0,
    ty: 0
};

// UI state
export const uiState = { inventoryOpen: false };

// Suppress chunk unload until a certain time
export let suppressChunkUnloadUntil = 0;
export function suppressChunkUnload(ms = 1200) {
    suppressChunkUnloadUntil = performance.now() + ms;
}

// Global farmland growth state
export const farmlandState = new Map(); // key: "tx,ty", value: { stage: 0, growthTimer: 0 }

// --- CONSTANTS RE-EXPORTED FOR CONVENIENCE ---
// This avoids having to import from constants.js in every file.
export * from './constants.js';
export { playerSprites, itemSprites, snowAssets };