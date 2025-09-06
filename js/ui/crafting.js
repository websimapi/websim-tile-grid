import { uiState, inventory, gameObjects, playerState, TILE_SIZE } from '../state.js';
import { countItems, consumeItem, addItemToInventory } from '../inventory-manager.js';
import { showTooltip, positionTooltip, hideTooltip } from './tooltip.js';
import { updateInventoryGrid } from './inventory.js';
import { setDragImageForItem } from './drag-drop.js';

const OVEN_CRAFTING_RADIUS = TILE_SIZE * 3.5; // Approx 3.5 tiles

const allRecipes = [
    {
        id: 'craft-campfire',
        className: 'craft-campfire',
        itemType: 'campfire_item',
        getTooltip: (can) => `${can ? 'Campfire — Cost: 3 logs' : 'Campfire — Requires 3 logs'}\n(Scroll to show more)`,
        canCraft: () => countItems('log_item') >= 3,
        onCraft: () => consumeItem('log_item', 3),
        onCraftTooltip: 'Crafted Campfire (-3 logs)',
    },
    {
        id: 'craft-bread',
        className: 'temp-item',
        style: { backgroundImage: 'url(/BreadTexture.png)' },
        itemType: 'bread_item',
        getTooltip: (can) => `${can ? 'Bread — Cost: 3 wheat, 1 coal' : 'Bread — Requires 3 wheat, 1 coal'}\n(Requires oven nearby)`,
        canCraft: () => countItems('wheat_item') >= 3 && countItems('coal_item') >= 1,
        onCraft: () => consumeItem('wheat_item', 3) && consumeItem('coal_item', 1),
        onCraftTooltip: 'Crafted Bread (-3 wheat, -1 coal)',
        requiresProximityTo: 'oven'
    },
    {
        id: 'craft-sprinkler',
        className: 'temp-item',
        style: { backgroundImage: 'url(/CopperSprinkler.png)' },
        itemType: 'copper_sprinkler_item',
        getTooltip: (can) => `${can ? 'Copper Sprinkler — Cost: 2 stone, 2 copper' : 'Copper Sprinkler — Requires 2 stone, 2 copper'}\n(Scroll to show more)`,
        canCraft: () => countItems('stone_item') >= 2 && countItems('copper_ore_item') >= 2,
        onCraft: () => consumeItem('stone_item', 2) && consumeItem('copper_ore_item', 2),
        onCraftTooltip: 'Crafted Copper Sprinkler (-2 stone, -2 copper)',
    },
    {
        id: 'craft-oven',
        className: 'temp-item',
        style: { backgroundImage: 'url(/Oven.png)' },
        itemType: 'oven_item',
        getTooltip: (can) => `${can ? 'Oven — Cost: 8 stone' : 'Oven — Requires 8 stone'}\n(Scroll to show more)`,
        canCraft: () => countItems('stone_item') >= 8,
        onCraft: () => consumeItem('stone_item', 8),
        onCraftTooltip: 'Crafted Oven (-8 stone)',
    },
    {
        id: 'craft-log',
        className: 'temp-item',
        style: { backgroundImage: 'url(/LogTexture.png)' },
        itemType: 'log_item',
        getTooltip: (can) => `${can ? 'Log — Cost: 2 cactus pieces' : 'Log — Requires 2 cactus pieces'}\n(Scroll to show more)`,
        canCraft: () => countItems('cactus_piece') >= 2,
        onCraft: () => consumeItem('cactus_piece', 2),
        onCraftTooltip: 'Crafted Log (-2 cactus pieces)',
    },
];

const MIN_VISIBLE_CRAFTING_SLOTS = 3;
let visibleCraftingSlots = MIN_VISIBLE_CRAFTING_SLOTS;
let craftingScrollOffset = 0;
let craftSlots = [];
let availableRecipes = [];
let lastPlayerTileX = -1, lastPlayerTileY = -1;

function isPlayerNearObject(objectType, radius) {
    const playerCenterX = playerState.x + TILE_SIZE / 2;
    const playerCenterY = playerState.y + TILE_SIZE / 2;
    const radiusSq = radius * radius;

    for (const obj of gameObjects) {
        if (obj.type === objectType) {
            const objCenterX = obj.x + TILE_SIZE / 2;
            const objCenterY = obj.y + TILE_SIZE / 2;
            const dx = playerCenterX - objCenterX;
            const dy = playerCenterY - objCenterY;
            if (dx * dx + dy * dy < radiusSq) {
                return true;
            }
        }
    }
    return false;
}

function getAvailableRecipes() {
    const isNearOven = isPlayerNearObject('oven', OVEN_CRAFTING_RADIUS);
    return allRecipes.filter(recipe => {
        if (recipe.requiresProximityTo === 'oven') {
            return isNearOven;
        }
        return true; // Always available if no proximity requirement
    });
}

function renderCraftingPanel() {
    const panel = document.getElementById('inventory-left-panel');
    if (!panel) return;

    availableRecipes = getAvailableRecipes();
    // Reset scroll if it's out of bounds after recipes changed
    const maxScroll = Math.max(0, availableRecipes.length - visibleCraftingSlots);
    if (craftingScrollOffset > maxScroll) {
        craftingScrollOffset = maxScroll;
    }

    // Dynamically adjust the number of slot elements in the DOM
    while (panel.children.length < visibleCraftingSlots) {
        panel.appendChild(document.createElement('div'));
    }
    while (panel.children.length > visibleCraftingSlots) {
        panel.removeChild(panel.lastChild);
    }
    craftSlots = Array.from(panel.children);
    
    for (let i = 0; i < visibleCraftingSlots; i++) {
        const slotEl = craftSlots[i];
        slotEl.innerHTML = '';
        slotEl.className = 'temp-slot';

        const recipeIndex = craftingScrollOffset + i;
        if (recipeIndex < availableRecipes.length) {
            const recipe = availableRecipes[recipeIndex];
            const itemEl = document.createElement('div');
            itemEl.id = recipe.id;
            itemEl.className = recipe.className;
            itemEl.draggable = true;

            if (recipe.style) {
                for (const [key, value] of Object.entries(recipe.style)) {
                    itemEl.style[key] = value;
                }
            }
            
            // Re-bind all events
            itemEl.addEventListener('mouseenter', (e) => {
                itemEl.title = ''; // suppress native tooltip
                showTooltip(recipe.getTooltip(recipe.canCraft()), e);
            });
            itemEl.addEventListener('mousemove', positionTooltip);
            itemEl.addEventListener('mouseleave', hideTooltip);
            itemEl.addEventListener('click', (e) => {
                if (!uiState.inventoryOpen || !recipe.canCraft()) {
                    hideTooltip(); return;
                }
                if (recipe.onCraft()) {
                    addItemToInventory(recipe.itemType, 1);
                    updateInventoryGrid();
                    itemEl.title = '';
                    showTooltip(recipe.onCraftTooltip, e);
                    // After crafting, re-check recipes in case player can't craft more
                    renderCraftingPanel();
                }
            });
            itemEl.addEventListener('dragstart', (e) => {
                if (!recipe.canCraft()) {
                    e.preventDefault(); return;
                }
                if (recipe.onCraft()) {
                    e.dataTransfer.setData('application/json', JSON.stringify({ from: 'craft', type: recipe.itemType, count: 1 }));
                    setDragImageForItem(e, recipe.itemType);
                    // After crafting, re-check recipes in case player can't craft more
                    renderCraftingPanel();
                } else {
                    e.preventDefault();
                }
            });

            slotEl.appendChild(itemEl);
        }
    }

    // Update scroll indicator visibility
    const upArrow = document.getElementById('crafting-scroll-up');
    const downArrow = document.getElementById('crafting-scroll-down');
    if (upArrow) upArrow.style.visibility = craftingScrollOffset > 0 ? 'visible' : 'hidden';
    if (downArrow) downArrow.style.visibility = craftingScrollOffset < availableRecipes.length - visibleCraftingSlots ? 'visible' : 'hidden';
}


export function handleCraftingScroll(e) {
    const scrollAmount = Math.sign(e.deltaY);

    const maxScroll = Math.max(0, availableRecipes.length - visibleCraftingSlots);
    craftingScrollOffset += scrollAmount;
    if (craftingScrollOffset < 0) craftingScrollOffset = 0;
    if (craftingScrollOffset > maxScroll) craftingScrollOffset = maxScroll;

    renderCraftingPanel();
}


export function initCrafting() {
    const scrollIndicator = document.getElementById('crafting-scroll-indicator');
    if (scrollIndicator) {
        const upArrow = document.getElementById('crafting-scroll-up');
        const downArrow = document.getElementById('crafting-scroll-down');

        upArrow.addEventListener('click', () => handleCraftingScroll({ deltaY: -1 }));
        downArrow.addEventListener('click', () => handleCraftingScroll({ deltaY: 1 }));

        upArrow.style.cursor = 'pointer';
        downArrow.style.cursor = 'pointer';
        scrollIndicator.style.pointerEvents = 'auto';
    }
    updateCraftingPanel();
}

export function updateCraftingPanel() {
    // Only re-render if player has moved to a new tile to save performance
    const playerTileX = Math.floor(playerState.x / TILE_SIZE);
    const playerTileY = Math.floor(playerState.y / TILE_SIZE);
    if (playerTileX !== lastPlayerTileX || playerTileY !== lastPlayerTileY) {
        lastPlayerTileX = playerTileX;
        lastPlayerTileY = playerTileY;
        renderCraftingPanel();
    }
}