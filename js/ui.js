import { inventory, itemSprites, uiState, playerState } from './state.js';
import { initHotbar, updateHotbar } from './ui/hotbar.js';
import { initInventory, initEquipment, updateInventoryGrid, updateEquipmentGrid } from './ui/inventory.js';
import { initCrafting, updateCraftingPanel } from './ui/crafting.js';
import { initTooltip } from './ui/tooltip.js';

let heldItemEl;
let inventoryOverlayEl;
let itemToastEl, lastHeldType = null, toastTimer = null;
let hungerBarEl;

export function initUI() {
    inventoryOverlayEl = document.getElementById('inventory-overlay');
    heldItemEl = document.getElementById('held-item');
    itemToastEl = document.getElementById('item-toast');
    
    initHotbar();
    initInventory();
    initEquipment();
    initCrafting();
    initTooltip();
    initHungerBar();
    
    window.addEventListener('resize', () => {
        if (inventoryOverlayEl && uiState.inventoryOpen) positionInventoryElements();
    });
}

export function updateUI() {
    updateHotbar();
    updateHeldItemVisual();
    updateHungerBar();
    if (inventoryOverlayEl) {
        const want = uiState.inventoryOpen ? 'flex' : 'none';
        if (inventoryOverlayEl.style.display !== want) {
            inventoryOverlayEl.style.display = want;
            if (uiState.inventoryOpen) {
                positionInventoryElements();
                updateCraftingPanel(); // Re-check recipes when opening
            }
        }
        if (uiState.inventoryOpen) {
            updateCraftingPanel();
        }
    }
    updateInventoryGrid();
    updateEquipmentGrid();
    const cur = inventory.hotbar[inventory.selectedHotbarIndex]?.type || null;
    if (cur !== lastHeldType) { lastHeldType = cur; if (cur) showItemToast(getItemName(cur)); }
    // In the future, other UI updates can go here.
}

function initHungerBar() {
    hungerBarEl = document.getElementById('hunger-bar');
    if (!hungerBarEl) return;
    for (let i = 0; i < playerState.maxHunger; i++) {
        const hungerIcon = document.createElement('div');
        hungerIcon.className = 'hunger-icon';
        hungerBarEl.appendChild(hungerIcon);
    }
}

function updateHeldItemVisual() {
    if (!heldItemEl) return;

    const selectedItem = inventory.hotbar[inventory.selectedHotbarIndex];

    if (selectedItem && itemSprites[selectedItem.type]) {
        const newBg = `url(${itemSprites[selectedItem.type]})`;
        if (heldItemEl.style.backgroundImage !== newBg) {
            heldItemEl.style.backgroundImage = newBg;
        }
        if (heldItemEl.style.display !== 'block') {
            heldItemEl.style.display = 'block';
        }
    } else {
        if (heldItemEl.style.display !== 'none') {
            heldItemEl.style.display = 'none';
        }
    }
}

function positionInventoryElements() {
    if (!uiState.inventoryOpen) return;
    const hotbar = document.getElementById('hotbar-container');
    const inventoryGridEl = document.getElementById('inventory-grid');
    const equipmentSlotsEl = document.getElementById('equipment-slots');

    if (!hotbar || !inventoryGridEl || !equipmentSlotsEl) return;
    const hotbarRect = hotbar.getBoundingClientRect();

    // Position inventory grid
    inventoryGridEl.style.left = `${hotbarRect.left}px`;
    inventoryGridEl.style.top = `${hotbarRect.bottom + 8}px`;

    // Position equipment slots under backpack
    const backpackBtn = hotbar.querySelector('.backpack-btn');
    if (backpackBtn) {
        const backpackRect = backpackBtn.getBoundingClientRect();
        equipmentSlotsEl.style.left = `${backpackRect.left}px`;
        equipmentSlotsEl.style.top = `${backpackRect.bottom + 8}px`;
    }
}

function updateHungerBar() {
    if (!hungerBarEl) return;
    const icons = hungerBarEl.children;
    for (let i = 0; i < icons.length; i++) {
        // Show icon if its index is less than the current hunger level
        if (i < playerState.currentHunger) {
            if (icons[i].style.opacity !== '1') icons[i].style.opacity = '1';
        } else {
            if (icons[i].style.opacity !== '0.3') icons[i].style.opacity = '0.3';
        }
    }
}

function getItemName(t){const m={log_item:"Log",cactus_piece:"Cactus Piece",stone_item:"Stone",copper_ore_item:"Copper Ore",campfire_item:"Campfire",oven_item:"Oven",ice_chunk:"Ice Chunk",ice_medalion:"Ice Medallion",sprinkler_item:"Sprinkler",copper_sprinkler_item:"Copper Sprinkler",wheat_item:"Wheat",bamboo_item:"Bamboo",bread_item:"Bread",wheat_seeds_item:"Wheat Seeds",potato_item:"Potato",potato_seeds_item:"Potato Seeds",coal_item:"Coal"};return m[t]||(t||"").replace(/_/g," ").replace(/\b\w/g,s=>s.toUpperCase());}
function showItemToast(name){ if(!itemToastEl) return; itemToastEl.textContent=name; itemToastEl.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>itemToastEl.classList.remove('visible'),1200); }