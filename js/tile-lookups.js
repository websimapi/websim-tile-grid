import { getTileType } from './terrain.js';
import { pseudoRandom } from './utils.js';
import { commonTileImages, sandTileImages, borderTileImages, woodTileImages, snowTileImages, snowAssets, snowBorderTileImages, snowInnerBlend, farmlandAssets, getAssetPath, jungleTileImages, jungleBorderTileImages } from './asset-manager.js';
import { BIOME_NOISE_SCALE, SNOW_THRESHOLD, BIOME_THRESHOLD, JUNGLE_THRESHOLD, JUNGLE_END_THRESHOLD } from './state.js';
import { biomeNoise2D } from './noise.js';

/**
 * Determines the original biome of a tile based on noise, ignoring overrides.
 * @param {number} tx - The world tile X-coordinate.
 * @param {number} ty - The world tile Y-coordinate.
 * @returns {string} 'grass', 'sand', or 'snow'.
 */
function getUnderlyingBiome(tx, ty) {
    const v = biomeNoise2D(tx / BIOME_NOISE_SCALE, ty / BIOME_NOISE_SCALE);
    if (v < SNOW_THRESHOLD) return 'snow';
    if (v >= BIOME_THRESHOLD) return 'sand';
    if (v >= JUNGLE_THRESHOLD && v < JUNGLE_END_THRESHOLD) return 'jungle';
    return 'grass';
}

/**
 * Determines the biome for blending purposes. Farmland and sprinklers
 * will return their underlying biome type.
 * @param {number} tx - The world tile X-coordinate.
 * @param {number} ty - The world tile Y-coordinate.
 * @returns {string} The effective biome type for blending.
 */
function getEffectiveBiome(tx, ty) {
    const type = getTileType(tx, ty);
    if (type === 'farmland' || type === 'sprinkler' || type === 'copper_sprinkler') {
        return getUnderlyingBiome(tx, ty);
    }
    // Wood should blend like grass
    if (type === 'wood') {
        return 'grass';
    }
    return type;
}

/**
 * Determines the correct tile image URL and rotation based on neighboring tiles.
 * This function contains the logic for blending different biomes together.
 * @param {number} tx - The world tile X-coordinate.
 * @param {number} ty - The world tile Y-coordinate.
 * @returns {{url: string, rotation?: number, flipX?: boolean}} An object with the image URL and optional transformations.
 */
export function getTileUrl(tx, ty) {
    const centerType = getTileType(tx, ty);
    let baseUrl, overlayUrl, rotation;

    // --- Base Tile Determination ---
    switch (centerType) {
        case 'copper_sprinkler':
        case 'sprinkler': {
            const underlyingBiome = getUnderlyingBiome(tx, ty);
            let underlyingTileUrl;
            switch (underlyingBiome) {
                case 'snow':   underlyingTileUrl = snowTileImages[Math.floor(pseudoRandom(tx, ty) * snowTileImages.length)]; break;
                case 'sand':   underlyingTileUrl = sandTileImages[Math.floor(pseudoRandom(tx, ty) * sandTileImages.length)]; break;
                case 'jungle': underlyingTileUrl = jungleTileImages[Math.floor(pseudoRandom(tx, ty) * jungleTileImages.length)]; break;
                default:       underlyingTileUrl = commonTileImages[Math.floor(pseudoRandom(tx, ty) * commonTileImages.length)]; break;
            }
            const sprinklerUrl = centerType === 'copper_sprinkler' ? getAssetPath('copperSprinkler') : getAssetPath('sprinkler');
            return { url: `url(${sprinklerUrl}), url(${underlyingTileUrl})`, isSpecial: true };
        }
        case 'farmland': {
            const underlyingBiome = getUnderlyingBiome(tx, ty);
            let underlyingTileUrl;
            switch (underlyingBiome) {
                case 'snow':   underlyingTileUrl = snowTileImages[Math.floor(pseudoRandom(tx, ty) * snowTileImages.length)]; break;
                case 'sand':   underlyingTileUrl = sandTileImages[Math.floor(pseudoRandom(tx, ty) * sandTileImages.length)]; break;
                case 'jungle': underlyingTileUrl = jungleTileImages[Math.floor(pseudoRandom(tx, ty) * jungleTileImages.length)]; break;
                default:       underlyingTileUrl = commonTileImages[Math.floor(pseudoRandom(tx, ty) * commonTileImages.length)]; break;
            }
            const overlayUrl = getAssetPath('farmlandStage0'); // Farmland overlay on top
            return { url: `url(${overlayUrl}), url(${underlyingTileUrl})`, isSpecial: true };
        }
        case 'jungle':
            baseUrl = jungleTileImages[Math.floor(pseudoRandom(tx, ty) * jungleTileImages.length)];
            break;
        case 'wood':
            baseUrl = woodTileImages[Math.floor(pseudoRandom(tx, ty) * woodTileImages.length)];
            break;
        case 'sand':
             // Sand blending is handled below, this is for solid sand
            baseUrl = sandTileImages[Math.floor(pseudoRandom(tx, ty) * sandTileImages.length)];
            break;
        case 'snow':
             // Snow blending is handled below, this is for solid snow
            baseUrl = snowTileImages[Math.floor(pseudoRandom(tx, ty) * snowTileImages.length)];
            break;
        default: // grass
            baseUrl = commonTileImages[Math.floor(pseudoRandom(tx, ty) * commonTileImages.length)];
            break;
    }

    // --- Blending Logic ---
    const centerEffectiveBiome = getEffectiveBiome(tx, ty);
    const isSand = (x, y) => getEffectiveBiome(x, y) === 'sand';
    const isJungle = (x, y) => getEffectiveBiome(x, y) === 'jungle';

    // Check cardinal neighbors
    const topIsSand = isSand(tx, ty - 1);
    const bottomIsSand = isSand(tx, ty + 1);
    const leftIsSand = isSand(tx - 1, ty);
    const rightIsSand = isSand(tx + 1, ty);

    // Check diagonal neighbors
    const topLeftIsSand = isSand(tx - 1, ty - 1);
    const topRightIsSand = isSand(tx + 1, ty - 1);
    const bottomLeftIsSand = isSand(tx - 1, ty + 1);
    const bottomRightIsSand = isSand(tx + 1, ty + 1);
    
    // --- Jungle Overlay Logic ---
    const overlayUrls = [];
    if (centerEffectiveBiome === 'grass' || centerEffectiveBiome === 'jungle' || centerEffectiveBiome === 'sand') {
        const topIsJungle = isJungle(tx, ty - 1);
        const bottomIsJungle = isJungle(tx, ty + 1);
        const leftIsJungle = isJungle(tx - 1, ty);
        const rightIsJungle = isJungle(tx + 1, ty);

        if (centerEffectiveBiome === 'grass' || centerEffectiveBiome === 'sand') { // On a grass or sand tile, check for jungle neighbors to draw outer edge
            if (topIsJungle)    overlayUrls.push(`url(${jungleBorderTileImages.bottom.url})`);
            if (bottomIsJungle) overlayUrls.push(`url(${jungleBorderTileImages.top.url})`);
            if (leftIsJungle)   overlayUrls.push(`url(${jungleBorderTileImages.right.url})`);
            if (rightIsJungle)  overlayUrls.push(`url(${jungleBorderTileImages.left.url})`);
        } else { // On a jungle tile, check for non-jungle neighbors to draw inner edge
            if (!topIsJungle)    overlayUrls.push(`url(${jungleBorderTileImages.top.url})`);
            if (!bottomIsJungle) overlayUrls.push(`url(${jungleBorderTileImages.bottom.url})`);
            if (!leftIsJungle)   overlayUrls.push(`url(${jungleBorderTileImages.left.url})`);
            if (!rightIsJungle)  overlayUrls.push(`url(${jungleBorderTileImages.right.url})`);
        }
    }

    if (centerEffectiveBiome === 'sand') { // Current tile is effectively Sand
        // If bordering a jungle, the overlay logic handles it. Don't apply sand-grass blending.
        if (isJungle(tx, ty-1) || isJungle(tx, ty+1) || isJungle(tx-1, ty) || isJungle(tx+1, ty)) {
             // Continue to final URL construction
        } else {
            // --- OUTER BORDERS (sand with grass) ---
            if (!topIsSand || !bottomIsSand || !leftIsSand || !rightIsSand) {
                if (!topIsSand && !leftIsSand) return borderTileImages.topLeft;
                if (!topIsSand && !rightIsSand) return borderTileImages.topRight;
                if (!bottomIsSand && !leftIsSand) return borderTileImages.bottomLeft;
                if (!bottomIsSand && !rightIsSand) return borderTileImages.bottomRight;
                if (!topIsSand) return borderTileImages.top;
                if (!bottomIsSand) return borderTileImages.bottom;
                if (!leftIsSand) return borderTileImages.left;
                if (!rightIsSand) return borderTileImages.right;
            }
            // --- INNER CORNERS (sand surrounded by grass diagonally) ---
            if (topIsSand && bottomIsSand && leftIsSand && rightIsSand) {
                if (!topLeftIsSand) return borderTileImages.innerTopLeft;     // Grass is top-left
                if (!topRightIsSand) return borderTileImages.innerTopRight;    // Grass is top-right
                if (!bottomLeftIsSand) return borderTileImages.innerBottomLeft; // Grass is bottom-left
                if (!bottomRightIsSand) return borderTileImages.innerBottomRight; // Grass is bottom-right
            }
        }
    } else if (centerEffectiveBiome === 'snow') {
        const s=(x,y)=>getEffectiveBiome(x,y)==='snow'; const top=s(tx,ty-1), bottom=s(tx,ty+1), left=s(tx-1,ty), right=s(tx+1,ty);
        const tl=s(tx-1,ty-1), tr=s(tx+1,ty-1), bl=s(tx-1,ty+1), br=s(tx+1,ty+1);
        if(!top||!bottom||!left||!right){ 
            if(!top&&!left) return snowBorderTileImages.topLeft; 
            if(!top&&!right) return snowBorderTileImages.topRight; 
            if(!bottom&&!left) return snowBorderTileImages.bottomLeft; 
            if(!bottom&&!right) return snowBorderTileImages.bottomRight; 
            if(!top) return snowBorderTileImages.top; 
            if(!bottom) return snowBorderTileImages.bottom; 
            if(!left) return snowBorderTileImages.left; 
            if(!right) return snowBorderTileImages.right; 
        }
        if(top&&bottom&&left&&right){ 
            if(!tl) return {url:snowInnerBlend, rotation:270}; // Grass is top-left
            if(!tr) return {url:snowInnerBlend, rotation:0};   // Grass is top-right
            if(!bl) return {url:snowInnerBlend, rotation:180}; // Grass is bottom-left
            if(!br) return {url:snowInnerBlend, rotation:90};  // Grass is bottom-right
        }
    } else if (centerEffectiveBiome === 'grass' && overlayUrls.length === 0) { // Current tile is effectively Grass, no jungle overlay
        // --- GRASS BORDERING SAND (INNER CORNERS) ---
        // This logic adds the inner corner sprites on grass tiles next to sand corners.
        if (topIsSand && leftIsSand && !topLeftIsSand) return borderTileImages.innerBottomRight;
        if (topIsSand && rightIsSand && !topRightIsSand) return borderTileImages.innerBottomLeft;
        if (bottomIsSand && leftIsSand && !bottomLeftIsSand) return borderTileImages.innerTopRight;
        if (bottomIsSand && rightIsSand && !bottomRightIsSand) return borderTileImages.innerTopLeft;
    }

    // --- Final URL construction ---
    if (overlayUrls.length > 0) {
        const finalUrl = [...overlayUrls, `url(${baseUrl})`].join(', ');
        return { url: finalUrl, isSpecial: true };
    }

    return { url: baseUrl, rotation };
}