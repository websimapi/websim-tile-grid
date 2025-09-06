import { inventory, itemSprites } from '../state.js';
import { onInventoryDrop, onEquipmentDrop, setDragImageForItem } from './drag-drop.js';

let inventoryGridEl;
let equipmentSlotsEl;

export function initInventory() {
    inventoryGridEl = document.getElementById('inventory-grid');
    if (!inventoryGridEl) return;

    if (inventoryGridEl.children.length === 0) {
        for (let i = 0; i < 15; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.index = i;
            slot.addEventListener('dragover', (e) => e.preventDefault());
            slot.addEventListener('drop', onInventoryDrop);
            inventoryGridEl.appendChild(slot);
        }
    }
}

export function initEquipment() {
    equipmentSlotsEl = document.getElementById('equipment-slots');
    if (!equipmentSlotsEl) return;
    
    if (equipmentSlotsEl.children.length === 0) {
        for (let i = 0; i < 4; i++) { // Create 4 equipment slots
            const slot = document.createElement('div');
            slot.className = 'equipment-slot';
            slot.dataset.index = i;
            slot.addEventListener('dragover', (e) => e.preventDefault());
            slot.addEventListener('drop', (e) => onEquipmentDrop(e, i));
            equipmentSlotsEl.appendChild(slot);
        }
    }
}


export function updateInventoryGrid() {
    if (!inventoryGridEl) return;
    for (let i = 0; i < inventoryGridEl.children.length; i++) {
        const slotEl = inventoryGridEl.children[i];
        let itemWrapper = slotEl.querySelector('.hotbar-item');
        let countEl = slotEl.querySelector('.item-count');
        const item = inventory.slots[i];

        if (item) {
            if (!itemWrapper) {
                itemWrapper = document.createElement('div');
                itemWrapper.className = 'hotbar-item';
                itemWrapper.draggable = true;
                itemWrapper.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ from: 'inv', slot: i, type: item.type, count: item.count }));
                    setDragImageForItem(e, item.type);
                });
                slotEl.appendChild(itemWrapper);
            }
            if (!countEl) {
                countEl = document.createElement('div');
                countEl.className = 'item-count';
                slotEl.appendChild(countEl);
            }
            const bg = `url(${itemSprites[item.type]})`;
            if (itemWrapper.style.backgroundImage !== bg) itemWrapper.style.backgroundImage = bg;
            const txt = item.count > 1 ? String(item.count) : '';
            if (countEl.textContent !== txt) countEl.textContent = txt;
        } else {
            if (itemWrapper) itemWrapper.remove();
            if (countEl) countEl.textContent = '';
        }
    }
}


export function updateEquipmentGrid() {
    if (!equipmentSlotsEl) return;
    for (let i = 0; i < equipmentSlotsEl.children.length; i++) {
        const slotEl = equipmentSlotsEl.children[i];
        let itemWrapper = slotEl.querySelector('.hotbar-item');
        let countEl = slotEl.querySelector('.item-count');
        const item = inventory.equipment[i];

        if (item) {
            if (!itemWrapper) {
                itemWrapper = document.createElement('div');
                itemWrapper.className = 'hotbar-item';
                itemWrapper.draggable = true;
                itemWrapper.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ from: 'equip', slot: i, type: item.type, count: item.count }));
                    setDragImageForItem(e, item.type);
                });
                slotEl.appendChild(itemWrapper);
            }
            if (!countEl) {
                countEl = document.createElement('div');
                countEl.className = 'item-count';
                slotEl.appendChild(countEl);
            }
            const bg = `url(${itemSprites[item.type]})`;
            if (itemWrapper.style.backgroundImage !== bg) itemWrapper.style.backgroundImage = bg;
            const txt = item.count > 1 ? String(item.count) : '';
            if (countEl.textContent !== txt) countEl.textContent = txt;
        } else {
            if (itemWrapper) itemWrapper.remove();
            if (countEl) countEl.textContent = '';
        }
    }
}