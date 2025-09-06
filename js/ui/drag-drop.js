import { inventory, itemSprites } from '../state.js';
import { updateInventoryGrid, updateEquipmentGrid } from './inventory.js';
import { updateHotbar } from './hotbar.js';

export function setDragImageForItem(e, itemType) {
    const url = itemSprites[itemType];
    const ghost = document.createElement('div');
    ghost.style.width = '50px';
    ghost.style.height = '50px';
    ghost.style.backgroundImage = `url(${url})`;
    ghost.style.backgroundSize = 'contain';
    ghost.style.backgroundRepeat = 'no-repeat';
    ghost.style.backgroundPosition = 'center';
    ghost.style.position = 'fixed';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 25, 25);
    setTimeout(() => ghost.remove(), 0);
}

function handleSwapOrStack(fromArray, fromIndex, toArray, toIndex) {
    const itemA = fromArray[fromIndex];
    const itemB = toArray[toIndex];
    
    if (!itemA) return;

    if (itemB && itemB.type === itemA.type) {
        // Stack
        itemB.count += itemA.count;
        fromArray[fromIndex] = null;
    } else {
        // Swap
        fromArray[fromIndex] = itemB || null;
        toArray[toIndex] = itemA;
    }
}


export function onInventoryDrop(e) {
    e.preventDefault();
    const toIndex = parseInt(e.currentTarget.dataset.index, 10);
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    const payload = JSON.parse(dataStr);

    let fromArray;
    if (payload.from === 'inv') fromArray = inventory.slots;
    else if (payload.from === 'hotbar') fromArray = inventory.hotbar;
    else if (payload.from === 'equip') fromArray = inventory.equipment;
    else if (payload.from === 'craft') {
        const existing = inventory.slots[toIndex];
        if (existing && existing.type === payload.type) {
            existing.count += payload.count;
        } else if (!existing) {
            inventory.slots[toIndex] = { type: payload.type, count: payload.count };
        }
        updateInventoryGrid();
        return;
    } else return;
    
    if(fromArray === inventory.slots && payload.slot === toIndex) return;

    handleSwapOrStack(fromArray, payload.slot, inventory.slots, toIndex);
    
    updateInventoryGrid();
    updateHotbar();
    updateEquipmentGrid();
}

export function onEquipmentDrop(e, toIndex) {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    const payload = JSON.parse(dataStr);

    let fromArray;
    if (payload.from === 'inv') fromArray = inventory.slots;
    else if (payload.from === 'hotbar') fromArray = inventory.hotbar;
    else if (payload.from === 'equip') fromArray = inventory.equipment;
    else return;

    if (fromArray === inventory.equipment && payload.slot === toIndex) return;

    const itemToEquip = fromArray[payload.slot];
    if (itemToEquip && itemToEquip.type !== 'ice_medalion') {
        return; // Only ice medalions can be equipped
    }

    handleSwapOrStack(fromArray, payload.slot, inventory.equipment, toIndex);

    updateInventoryGrid();
    updateEquipmentGrid();
    updateHotbar();
}

export function onHotbarDrop(e, toIndex) {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;
    const payload = JSON.parse(dataStr);

    let fromArray;
    if (payload.from === 'inv') fromArray = inventory.slots;
    else if (payload.from === 'hotbar') fromArray = inventory.hotbar;
    else if (payload.from === 'equip') fromArray = inventory.equipment;
    else if (payload.from === 'craft') {
        const existing = inventory.hotbar[toIndex];
        if (existing && existing.type === payload.type) {
            existing.count += payload.count;
        } else if (!existing) {
            inventory.hotbar[toIndex] = { type: payload.type, count: payload.count };
        }
        updateHotbar();
        return;
    } else return;
    
    if(fromArray === inventory.hotbar && payload.slot === toIndex) return;
    
    handleSwapOrStack(fromArray, payload.slot, inventory.hotbar, toIndex);

    updateInventoryGrid();
    updateHotbar();
    updateEquipmentGrid();
}