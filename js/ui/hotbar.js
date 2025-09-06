import { inventory, uiState, itemSprites } from '../state.js';
import { onHotbarDrop, setDragImageForItem } from './drag-drop.js';

let hotbarContainer;

export function initHotbar() {
    hotbarContainer = document.getElementById('hotbar-container');
    if (!hotbarContainer) return;

    for (let i = 0; i < 5; i++) {
        const slotEl = document.createElement('div');
        slotEl.className = 'hotbar-slot';
        slotEl.dataset.index = i;

        const itemEl = document.createElement('div');
        itemEl.className = 'hotbar-item';
        itemEl.draggable = true;
        itemEl.addEventListener('dragstart', (e) => {
            const item = inventory.hotbar[i];
            if (!uiState.inventoryOpen || !item) { e.preventDefault(); return; }
            e.dataTransfer.setData('application/json', JSON.stringify({ from: 'hotbar', slot: i, type: item.type, count: item.count }));
            setDragImageForItem(e, item.type);
        });

        const countEl = document.createElement('div');
        countEl.className = 'item-count';

        slotEl.appendChild(itemEl);
        slotEl.appendChild(countEl);
        hotbarContainer.appendChild(slotEl);

        inventory.hotbar[i] = inventory.hotbar[i] || null;

        slotEl.addEventListener('click', () => {
            inventory.selectedHotbarIndex = i;
        });
        slotEl.addEventListener('dragover', (e) => { if (uiState.inventoryOpen) e.preventDefault(); });
        slotEl.addEventListener('drop', (e) => onHotbarDrop(e, i));
    }

    const backpackBtn = document.createElement('div');
    backpackBtn.className = 'backpack-btn';
    hotbarContainer.appendChild(backpackBtn);
    backpackBtn.addEventListener('click', () => {
        uiState.inventoryOpen = !uiState.inventoryOpen;
    });
}

export function updateHotbar() {
    if (!hotbarContainer) return;
    const slots = hotbarContainer.children;
    for (let i = 0; i < inventory.hotbar.length; i++) {
        const item = inventory.hotbar[i];
        const slotEl = slots[i];
        const itemEl = slotEl.querySelector('.hotbar-item');
        const countEl = slotEl.querySelector('.item-count');

        if (item) {
            const spriteUrl = itemSprites[item.type];
            const newBg = `url("${spriteUrl}")`;
            if (itemEl.style.backgroundImage !== newBg) {
                itemEl.style.backgroundImage = newBg;
            }
            const newCount = item.count > 1 ? item.count : '';
            if (countEl.textContent !== newCount) {
                countEl.textContent = newCount;
            }
        } else {
            if (itemEl.style.backgroundImage !== 'none') {
                itemEl.style.backgroundImage = 'none';
            }
            if (countEl.textContent !== '') {
                countEl.textContent = '';
            }
        }

        if (i === inventory.selectedHotbarIndex) {
            if (!slotEl.classList.contains('selected')) {
                slotEl.classList.add('selected');
            }
        } else {
            if (slotEl.classList.contains('selected')) {
                slotEl.classList.remove('selected');
            }
        }
    }
}