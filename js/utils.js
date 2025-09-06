import { getSeed } from './seed.js';

/**
 * Generates a pseudo-random number between 0 and 1 based on coordinates and the world seed.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @returns {number} A deterministic random number.
 */
export function pseudoRandom(x, y) {
    const seed = getSeed();
    // Combine seed with coordinates for a deterministic but unique value per location
    const preSin = seed + x * 12.9898 + y * 78.233;
    const sin = Math.sin(preSin) * 43758.5453;
    return sin - Math.floor(sin);
}