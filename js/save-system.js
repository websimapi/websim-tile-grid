const saveKey = 'savegame_v1';

import { inventory, playerState, CHUNK_SIZE, TILE_SIZE, chunks, farmlandState, gameObjects } from './state.js';
import { getSeed } from './seed.js';

let removedObjectIds = new Set();
let placedCampfires = new Set();
let placedOvens = new Set();
let tileOverrides = new Map(); // key: "tx,ty" -> type
let treeFireState = new Map(); // key: `tree_id` -> { isOnFire: true }
let saveTimer = null;
let autoSaveIntervalId = null;
let isResetting = false;

function cloneInvSlots(arr, len) {
    const out = new Array(len).fill(null);
    for (let i = 0; i < len && i < arr.length; i++) {
        const s = arr[i];
        out[i] = s ? { type: s.type, count: s.count } : null;
    }
    return out;
}

export function loadSavedState() {
    try {
        const raw = localStorage.getItem(saveKey);
        if (!raw) return null;
        const data = JSON.parse(raw);
        removedObjectIds = new Set(data.removedObjectIds || []);
        placedCampfires = new Set((data.placedCampfires || []).map(c => `${c.tx},${c.ty}`));
        placedOvens = new Set((data.placedOvens || []).map(o => `${o.tx},${o.ty}`));
        tileOverrides = new Map((data.tileOverrides || []).map(o => [`${o.tx},${o.ty}`, o.type]));
        treeFireState = new Map((data.treeFireState || []).map(t => [t.id, { isOnFire: t.isOnFire }]));
        if (data.farmlandState) {
            for (const item of data.farmlandState) {
                farmlandState.set(item.key, item.data);
            }
        }
        return data;
    } catch {
        return null;
    }
}

export function applySavedState(data) {
    if (!data) return;
    if (data.player) {
        playerState.x = data.player.x || 0;
        playerState.y = data.player.y || 0;
        if (data.player.facingDirection) playerState.facingDirection = data.player.facingDirection;
        if (typeof data.player.currentHunger === 'number') playerState.currentHunger = data.player.currentHunger;
    }
    if (data.inventory) {
        inventory.selectedHotbarIndex = data.inventory.selectedHotbarIndex || 0;
        inventory.hotbar = cloneInvSlots(data.inventory.hotbar || [], 5);
        inventory.slots = cloneInvSlots(data.inventory.slots || [], 15);
        inventory.equipment = cloneInvSlots(data.inventory.equipment || [], 4);
    }
}

export function saveGame() {
    if (isResetting) return;

    // Update the global farmlandState from gameObjects before saving
    for (const obj of gameObjects) {
        if (obj.type === 'growing_farmland') {
            const tx = Math.floor(obj.x / TILE_SIZE);
            const ty = Math.floor(obj.y / TILE_SIZE);
            farmlandState.set(`${tx},${ty}`, {
                stage: obj.stage,
                growthTimer: obj.growthTimer,
                crop: obj.crop || 'wheat' // save crop type, default to wheat for old saves
            });
        }
    }

    const currentTreeFireState = [];
    for (const obj of gameObjects) {
        if (obj.type === 'tree' && obj.isOnFire) {
            currentTreeFireState.push({ id: obj.id, isOnFire: true });
        }
    }

    const data = {
        version: 1,
        seed: getSeed(),
        player: {
            x: playerState.x,
            y: playerState.y,
            facingDirection: playerState.facingDirection,
            currentHunger: playerState.currentHunger
        },
        inventory: {
            selectedHotbarIndex: inventory.selectedHotbarIndex,
            hotbar: cloneInvSlots(inventory.hotbar, 5),
            slots: cloneInvSlots(inventory.slots, 15),
            equipment: cloneInvSlots(inventory.equipment, 4)
        },
        removedObjectIds: Array.from(removedObjectIds),
        placedCampfires: Array.from(placedCampfires).map(k => {
            const [tx, ty] = k.split(',').map(Number);
            return { tx, ty };
        }),
        placedOvens: Array.from(placedOvens).map(k => {
            const [tx, ty] = k.split(',').map(Number);
            return { tx, ty };
        }),
        tileOverrides: Array.from(tileOverrides.entries()).map(([k, type]) => {
            const [tx, ty] = k.split(',').map(Number);
            return { tx, ty, type };
        }),
        farmlandState: Array.from(farmlandState.entries()).map(([key, data]) => ({ key, data })),
        treeFireState: currentTreeFireState
    };
    try {
        localStorage.setItem(saveKey, JSON.stringify(data));
    } catch (e) {
        console.warn('Save failed:', e);
    }
}

function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveGame, 300);
}

export function setupAutoSave() {
    if (autoSaveIntervalId) return;
    autoSaveIntervalId = setInterval(saveGame, 10000);
    window.addEventListener('beforeunload', saveGame);
}

export function resetProgress() {
    isResetting = true;
    if (autoSaveIntervalId) { clearInterval(autoSaveIntervalId); autoSaveIntervalId = null; }
    window.removeEventListener('beforeunload', saveGame);
    localStorage.removeItem(saveKey);
    try { const url = new URL(window.location.href); url.searchParams.delete('seed'); window.history.replaceState({}, '', url); } catch {}
    location.reload();
}

export function markObjectRemoved(id) {
    if (!id) return;
    removedObjectIds.add(id);
    scheduleSave();
}

export function isObjectRemoved(id) {
    return removedObjectIds.has(id);
}

export function registerCampfirePlaced(tileX, tileY) {
    placedCampfires.add(`${tileX},${tileY}`);
    scheduleSave();
}

export function registerCampfireRemoved(tileX, tileY) {
    placedCampfires.delete(`${tileX},${tileY}`);
    scheduleSave();
}

export function isCampfirePlaced(tileX, tileY) {
    return placedCampfires.has(`${tileX},${tileY}`);
}

export function registerOvenPlaced(tileX, tileY) {
    placedOvens.add(`${tileX},${tileY}`);
    scheduleSave();
}

export function registerOvenRemoved(tileX, tileY) {
    placedOvens.delete(`${tileX},${tileY}`);
    scheduleSave();
}

export function isOvenPlaced(tileX, tileY) {
    return placedOvens.has(`${tileX},${tileY}`);
}

export function removeTileOverride(tileX, tileY) {
    const key = `${tileX},${tileY}`;
    if (tileOverrides.has(key)) {
        tileOverrides.delete(key);

        // Also update the live chunk data
        const chunkX = Math.floor(tileX / CHUNK_SIZE);
        const chunkY = Math.floor(tileY / CHUNK_SIZE);
        const chunk = chunks.get(`${chunkX},${chunkY}`);
        if (chunk && chunk.tileOverrides) {
            const localX = tileX - chunkX * CHUNK_SIZE;
            const localY = tileY - chunkY * CHUNK_SIZE;
            chunk.tileOverrides.delete(`${localX},${localY}`);
        }

        scheduleSave();
        return true;
    }
    return false;
}

export function registerTileOverride(tileX, tileY, type) {
    tileOverrides.set(`${tileX},${tileY}`, type);

    // Also update the live chunk data so the renderer sees it immediately
    const chunkX = Math.floor(tileX / CHUNK_SIZE);
    const chunkY = Math.floor(tileY / CHUNK_SIZE);
    const chunk = chunks.get(`${chunkX},${chunkY}`);

    if (chunk) {
        if (!chunk.tileOverrides) {
            chunk.tileOverrides = new Map();
        }
        const localX = tileX - chunkX * CHUNK_SIZE;
        const localY = tileY - chunkY * CHUNK_SIZE;
        chunk.tileOverrides.set(`${localX},${localY}`, { type });
    }
    
    scheduleSave();
}

export function getTileOverridesForChunk(chunkX, chunkY) {
    const res = [];
    for (const [k, type] of tileOverrides.entries()) {
        const [tx, ty] = k.split(',').map(Number);
        if (tx >= chunkX*CHUNK_SIZE && tx < (chunkX+1)*CHUNK_SIZE && ty >= chunkY*CHUNK_SIZE && ty < (chunkY+1)*CHUNK_SIZE) {
            res.push({ tx, ty, type });
        }
    }
    return res;
}

export function getPlacedCampfires() {
    return Array.from(placedCampfires).map(k => {
        const [tx, ty] = k.split(',').map(Number);
        return { tx, ty };
    });
}

export function getPlacedOvens() {
    return Array.from(placedOvens).map(k => {
        const [tx, ty] = k.split(',').map(Number);
        return { tx, ty };
    });
}

export function getTreeFireState(id) {
    return treeFireState.get(id);
}