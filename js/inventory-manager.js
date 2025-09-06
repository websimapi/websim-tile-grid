import { inventory } from './state.js';

/**
 * Adds an item to the player's inventory, stacking if possible.
 * Prefers hotbar -> inventory.
 * @param {string} itemType The type of item to add (e.g., 'log_item').
 * @param {number} count The number of items to add.
 */
export function addItemToInventory(itemType, count) {
    // 1) If inventory already has this item, stack there
    const invStackIdx = inventory.slots.findIndex(s => s && s.type === itemType);
    if (invStackIdx !== -1) { inventory.slots[invStackIdx].count += count; return; }

    // 2) Otherwise prefer hotbar first (stack or empty)
    const hotbarStackIdx = inventory.hotbar.findIndex(s => s && s.type === itemType);
    if (hotbarStackIdx !== -1) { inventory.hotbar[hotbarStackIdx].count += count; return; }
    const emptyHotbarIdx = inventory.hotbar.findIndex(s => s === null);
    if (emptyHotbarIdx !== -1) { inventory.hotbar[emptyHotbarIdx] = { type: itemType, count }; return; }

    // 3) Fallback to empty inventory slot
    const emptyInvIdx = inventory.slots.findIndex(s => s === null);
    if (emptyInvIdx !== -1) { inventory.slots[emptyInvIdx] = { type: itemType, count }; return; }
}

/**
 * Consumes a specified amount of an item from anywhere in the inventory.
 * @param {string} itemType The type of item to consume.
 * @param {number} count The amount to consume.
 * @returns {boolean} True if the items were successfully consumed, false otherwise.
 */
export function consumeItem(itemType, count) {
    // --- FIX START: Add pre-check to prevent over-crafting ---
    if (countItems(itemType) < count) {
        return false;
    }
    // --- FIX END ---

    let remaining = count;
    // Consume from hotbar first
    for (let i = 0; i < inventory.hotbar.length && remaining > 0; i++) {
        const s = inventory.hotbar[i];
        if (s && s.type === itemType) {
            const used = Math.min(s.count, remaining);
            s.count -= used;
            remaining -= used;
            if (s.count === 0) inventory.hotbar[i] = null;
        }
    }
    // Then inventory
    for (let i = 0; i < inventory.slots.length && remaining > 0; i++) {
        const s = inventory.slots[i];
        if (s && s.type === itemType) {
            const used = Math.min(s.count, remaining);
            s.count -= used;
            remaining -= used;
            if (s.count === 0) inventory.slots[i] = null;
        }
    }
    return remaining === 0;
}

/**
 * Counts the total number of a specific item across the entire inventory.
 * @param {string} itemType The type of item to count.
 * @returns {number} The total count of the item.
 */
export function countItems(itemType) {
    let total = 0;
    for (const s of inventory.hotbar) if (s && s.type === itemType) total += s.count;
    for (const s of inventory.slots) if (s && s.type === itemType) total += s.count;
    return total;
}

/**
 * Consumes a specified amount from the currently selected hotbar slot.
 * @param {number} amount The number of items to consume.
 * @returns {boolean} True if consumption was successful.
 */
export function consumeSelectedItem(amount) {
    const selectedSlot = inventory.hotbar[inventory.selectedHotbarIndex];
    if (selectedSlot && selectedSlot.count >= amount) {
        selectedSlot.count -= amount;
        if (selectedSlot.count === 0) {
            inventory.hotbar[inventory.selectedHotbarIndex] = null;
        }
        return true;
    }
    return false;
}