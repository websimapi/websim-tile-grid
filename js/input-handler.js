import { keysPressed, cameraState, mouseState, joystickState, mobileMove, inventory, TILE_SIZE, ZOOM_LEVEL, playerState, BREAD_HEAL_AMOUNT, POTATO_HEAL_AMOUNT } from './state.js';
import { handleInteraction, plantSeeds } from './interaction.js';
import { placeBlock } from './building.js';
import { toggleDebugMode } from './debug.js';
import { getHoveredTile } from './world.js';
import { forceGridRebuild } from './renderer.js';
import { renderVisibleTiles } from './renderer.js';
import { ensureAudioInitialized } from './audio-manager.js';
import { uiState } from './state.js';
import { suppressChunkUnload } from './state.js';
import { handleCraftingScroll } from './ui/crafting.js';
import { consumeSelectedItem } from './inventory-manager.js';

let hoveredTile = null;
let touchControls;
let joystickBase, joystickKnob;

export function initInputHandler(tileHighlighter) {
    const handleFirstInteraction = () => {
        ensureAudioInitialized();
        window.removeEventListener('keydown', handleFirstInteraction);
        window.removeEventListener('mousedown', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    window.addEventListener('mousedown', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });

    touchControls = document.getElementById('touch-controls');
    joystickBase = document.getElementById('touch-joystick-base');
    joystickKnob = document.getElementById('touch-joystick-knob');

    window.addEventListener('keydown', (e) => {
        if (e.key in keysPressed) keysPressed[e.key] = true;
        
        if (e.key >= '1' && e.key <= '5') {
            inventory.selectedHotbarIndex = parseInt(e.key, 10) - 1;
        }

        if (e.key === 'Escape') {
            uiState.inventoryOpen = !uiState.inventoryOpen;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.key in keysPressed) keysPressed[e.key] = false;
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        suppressChunkUnload(1500); // prevent unloading while viewport/UI is adjusting
        resizeTimeout = setTimeout(() => {
            renderVisibleTiles(true); // just re-render without rebuilding the grid
        }, 100);
    });

    window.addEventListener('wheel', (e) => {
        const craftingPanel = document.getElementById('inventory-left-panel');
        if (uiState.inventoryOpen && craftingPanel && craftingPanel.contains(e.target)) {
            handleCraftingScroll(e);
            e.preventDefault();
        } else if (!uiState.inventoryOpen) {
            if (e.deltaY > 0) { // Scroll down
                inventory.selectedHotbarIndex = (inventory.selectedHotbarIndex + 1) % 5;
            } else { // Scroll up
                inventory.selectedHotbarIndex = (inventory.selectedHotbarIndex - 1 + 5) % 5;
            }
        }
    });

    const nonGameUIElements = [
        document.getElementById('hotbar-container'),
        document.getElementById('spawn-tumbleweed-btn')
    ].filter(Boolean);

    window.addEventListener('mousemove', (e) => {
        mouseState.x = e.clientX;
        mouseState.y = e.clientY;

        hoveredTile = getHoveredTile(e, tileHighlighter);

        let isOverNonGameUI = false;
        for (const el of nonGameUIElements) {
            const rect = el.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                isOverNonGameUI = true;
                break;
            }
        }

        if (isOverNonGameUI) {
            cameraState.targetCursorOffsetX = 0;
            cameraState.targetCursorOffsetY = 0;
            tileHighlighter.style.display = 'none';
            hoveredTile = null;
        } else {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            cameraState.targetCursorOffsetX = Math.max(-200, Math.min(200, e.clientX - centerX));
            cameraState.targetCursorOffsetY = Math.max(-150, Math.min(150, e.clientY - centerY));
        }
    });

    window.addEventListener('mouseleave', () => {
        tileHighlighter.style.display = 'none';
        hoveredTile = null;
        cameraState.targetCursorOffsetX = 0;
        cameraState.targetCursorOffsetY = 0;
    });

    window.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (hoveredTile) handleInteraction(hoveredTile);
    });

    window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (hoveredTile) {
            const selectedItem = inventory.hotbar[inventory.selectedHotbarIndex];
            if (selectedItem && (selectedItem.type === 'wheat_seeds_item' || selectedItem.type === 'potato_seeds_item')) {
                if (plantSeeds(hoveredTile, selectedItem.type)) {
                    renderVisibleTiles(true);
                }
            } else if (selectedItem && selectedItem.type === 'bread_item') {
                if (playerState.currentHunger < playerState.maxHunger) {
                    if (consumeSelectedItem(1)) {
                        playerState.currentHunger = Math.min(playerState.maxHunger, playerState.currentHunger + BREAD_HEAL_AMOUNT);
                        // Future: play eating sound
                    }
                }
            } else if (selectedItem && selectedItem.type === 'potato_item') {
                if (playerState.currentHunger < playerState.maxHunger) {
                    if (consumeSelectedItem(1)) {
                        playerState.currentHunger = Math.min(playerState.maxHunger, playerState.currentHunger + POTATO_HEAL_AMOUNT);
                        // Future: play eating sound
                    }
                }
            } else {
                if (placeBlock(hoveredTile.x, hoveredTile.y)) {
                    renderVisibleTiles(true); // force immediate update, no delay
                }
            }
        }
    });

    // --- Touch Controls (Floating Joystick) ---
    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (touchControls && isTouchDevice()) {
        touchControls.style.display = 'block';

        touchControls.addEventListener('touchstart', (e) => {
            if (joystickState.active) return; // a joystick is already active
            
            const touch = e.changedTouches[0];

            // Prevent joystick if touch is on UI elements
            if (touch.target.closest('#hotbar-container, #minimap, #reset-progress-btn')) {
                return;
            }
            
            joystickState.active = true;
            joystickState.touchId = touch.identifier;
            joystickState.baseX = touch.clientX;
            joystickState.baseY = touch.clientY;
            
            joystickBase.style.left = `${touch.clientX}px`;
            joystickBase.style.top = `${touch.clientY}px`;
            joystickKnob.style.transform = `translate(0px, 0px)`;
            joystickBase.style.display = 'block';

        }, { passive: true });

        touchControls.addEventListener('touchmove', (e) => {
            if (!joystickState.active) return;
            let touch = null;
            for(let t of e.changedTouches) {
                if (t.identifier === joystickState.touchId) {
                    touch = t;
                    break;
                }
            }
            if (!touch) return;
            
            const MAX_DIST = 50;
            let dx = touch.clientX - joystickState.baseX;
            let dy = touch.clientY - joystickState.baseY;
            const dist = Math.hypot(dx, dy);
            
            let knobX, knobY;
            if (dist > MAX_DIST) {
                joystickState.x = dx / dist;
                joystickState.y = dy / dist;
                knobX = joystickState.x * MAX_DIST;
                knobY = joystickState.y * MAX_DIST;
            } else {
                joystickState.x = dx / MAX_DIST;
                joystickState.y = dy / MAX_DIST;
                knobX = dx;
                knobY = dy;
            }
            joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

        }, { passive: true });
        
        const endTouch = (e) => {
            if (!joystickState.active) return;
             for(let t of e.changedTouches) {
                if (t.identifier === joystickState.touchId) {
                    joystickState.active = false;
                    joystickState.touchId = null;
                    joystickState.x = 0;
                    joystickState.y = 0;
                    joystickBase.style.display = 'none';
                    break;
                }
            }
        };

        touchControls.addEventListener('touchend', endTouch);
        touchControls.addEventListener('touchcancel', endTouch);
    }

    window.addEventListener('touchstart', (e) => {
        ensureAudioInitialized();
        // This is now primarily for tap-to-interact, not movement.
        const touch = e.touches[0];
        // Prevent interaction if touch is on UI elements that are not the joystick itself
        if (touch.target.closest('#hotbar-container, #minimap, #touch-joystick-base')) {
            return;
        }

        // Compute hovered tile at touch position
        const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
        const touchedTile = getHoveredTile(fakeEvent, tileHighlighter);

        // Try interaction. We no longer set tap-to-move target here.
        handleInteraction(touchedTile);

    }, { passive: true });
}