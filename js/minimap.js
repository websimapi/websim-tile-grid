import { playerState, gameObjects, TILE_SIZE, BIOME_NOISE_SCALE, BIOME_THRESHOLD, SNOW_THRESHOLD, JUNGLE_THRESHOLD } from './state.js';
import { biomeNoise2D } from './noise.js';
import { getPlacedCampfires } from './save-system.js';
import { getTileType } from './terrain.js';

let ctx;
let minimapCanvas;

const MAP_SCALE = 3; // Each tile is 3x3 pixels on the map

const GRASS_COLOR = '#3a8f7d';
const SAND_COLOR = '#e0cf9b';
const TREE_COLOR = '#195e4c';
const CACTUS_COLOR = '#006400';
const TUMBLEWEED_COLOR = '#a0522d';
const PLAYER_COLOR = '#ff4141';
const ROCK_COLOR = '#888888';
const CAMPFIRE_COLOR = '#ff8a00';
const COPPER_COLOR = '#d99b66';
const COAL_COLOR = '#333333';
const FARMLAND_COLOR = '#664028';
const SPRINKLER_COLOR = '#999999';

// Soft shade palettes for prettier terrain
const GRASS_PALETTE = ['#2f7d6d', '#3a8f7d', '#48a691'];
const JUNGLE_PALETTE = ['#358a47', '#3fa354', '#49bd61'];
const SAND_PALETTE  = ['#d9c98c', '#e0cf9b', '#e8d7aa'];
const SNOW_PALETTE  = ['#ffffff', '#f4f4f4', '#eaeaea'];
const EDGE_COLOR = '#1c2b28';

function hash2(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }
function pickShade(palette, bias, x, y) {
    const base = Math.min(palette.length - 1, Math.max(0, Math.round(bias * (palette.length - 1))));
    const jitter = hash2(x, y) % 2 ? 1 : -1;
    const idx = Math.min(palette.length - 1, Math.max(0, base + jitter));
    return palette[idx];
}

export function initMinimap() {
    minimapCanvas = document.getElementById('minimap');
    if (!minimapCanvas) {
        console.error("Minimap canvas not found!");
        return;
    }
    ctx = minimapCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Ensure canvas internal size matches CSS size
    const resizeMinimap = () => {
        const w = Math.floor(minimapCanvas.clientWidth);
        const h = Math.floor(minimapCanvas.clientHeight);
        if (minimapCanvas.width !== w) minimapCanvas.width = w;
        if (minimapCanvas.height !== h) minimapCanvas.height = h;
    };
    resizeMinimap();
    window.addEventListener('resize', resizeMinimap);
}

export function updateMinimap() {
    if (!ctx) return;

    const canvasW = minimapCanvas.width;
    const canvasH = minimapCanvas.height;
    const canvasSize = Math.min(canvasW, canvasH);
    ctx.clearRect(0, 0, canvasW, canvasH);

    const playerTileX = Math.floor(playerState.x / TILE_SIZE);
    const playerTileY = Math.floor(playerState.y / TILE_SIZE);

    const tilesToShow = Math.ceil(canvasSize / MAP_SCALE);
    const halfTiles = Math.ceil(tilesToShow / 2);

    // Render Terrain
    for (let y = -halfTiles; y <= halfTiles; y++) {
        for (let x = -halfTiles; x <= halfTiles; x++) {
            const worldTileX = playerTileX + x;
            const worldTileY = playerTileY + y;

            const tileType = getTileType(worldTileX, worldTileY);
            const biomeValue = biomeNoise2D(worldTileX / BIOME_NOISE_SCALE, worldTileY / BIOME_NOISE_SCALE);

            let palette;
            let bias;

            switch (tileType) {
                case 'sand':
                    palette = SAND_PALETTE;
                    bias = (biomeValue - BIOME_THRESHOLD) / (1 - BIOME_THRESHOLD);
                    break;
                case 'jungle':
                    palette = JUNGLE_PALETTE;
                    bias = (biomeValue - JUNGLE_THRESHOLD) / (BIOME_THRESHOLD - JUNGLE_THRESHOLD);
                    break;
                case 'snow':
                    palette = SNOW_PALETTE;
                    bias = (Math.min(0, biomeValue) - SNOW_THRESHOLD) / (0 - SNOW_THRESHOLD);
                    break;
                case 'farmland':
                    ctx.fillStyle = FARMLAND_COLOR;
                    break;
                case 'sprinkler':
                    ctx.fillStyle = SPRINKLER_COLOR;
                    break;
                case 'grass':
                case 'wood':
                default:
                    palette = GRASS_PALETTE;
                    bias = (BIOME_THRESHOLD - biomeValue) / BIOME_THRESHOLD;
                    break;
            }

            if (palette) {
                ctx.fillStyle = pickShade(palette, bias, worldTileX, worldTileY);
            }
            
            const mapX = (canvasW / 2) + (x * MAP_SCALE);
            const mapY = (canvasH / 2) + (y * MAP_SCALE);
            
            ctx.fillRect(mapX, mapY, MAP_SCALE, MAP_SCALE);
            
            // Draw subtle edge where biomes meet
            const nType = getTileType(worldTileX, worldTileY - 1);
            const sType = getTileType(worldTileX, worldTileY + 1);
            const wType = getTileType(worldTileX - 1, worldTileY);
            const eType = getTileType(worldTileX + 1, worldTileY);

            if (tileType !== nType || tileType !== sType || tileType !== wType || tileType !== eType) {
                ctx.save();
                ctx.strokeStyle = ctx.fillStyle;
                ctx.globalAlpha = 0.35;
                ctx.lineWidth = 1;
                ctx.strokeRect(mapX + 0.5, mapY + 0.5, MAP_SCALE - 1, MAP_SCALE - 1);
                ctx.restore();
            }
        }
    }
    
    // Render Objects (Trees and Cacti)
    gameObjects.forEach(obj => {
        let color, size = MAP_SCALE;
        if (obj.type === 'tree') { color = TREE_COLOR; size = MAP_SCALE + 1; }
        else if (obj.type === 'cactus') { color = CACTUS_COLOR; size = MAP_SCALE - 1; }
        else if (obj.type === 'tumbleweed') { color = TUMBLEWEED_COLOR; size = MAP_SCALE - 1; }
        else if (obj.type === 'rock') { color = ROCK_COLOR; size = MAP_SCALE - 1; }
        else if (obj.type === 'coal_rock') { color = COAL_COLOR; size = MAP_SCALE - 1; }
        else if (obj.type === 'copper_rock' || obj.type === 'desert_copper_rock') { color = COPPER_COLOR; size = MAP_SCALE - 1; }
        else if (obj.type === 'ice') { color = '#99ccff'; size = MAP_SCALE - 1; }
        else { return; }
        
        ctx.fillStyle = color;
        const objTileX = Math.floor(obj.x / TILE_SIZE);
        const objTileY = Math.floor(obj.y / TILE_SIZE);
        
        const dx = objTileX - playerTileX;
        const dy = objTileY - playerTileY;

        if (Math.abs(dx) <= halfTiles && Math.abs(dy) <= halfTiles) {
            const mapX = (canvasW / 2) + (dx * MAP_SCALE) + Math.floor((MAP_SCALE - size) / 2);
            const mapY = (canvasH / 2) + (dy * MAP_SCALE) + Math.floor((MAP_SCALE - size) / 2);
            ctx.fillRect(mapX, mapY, size, size);
            if (obj.type === 'rock' || obj.type === 'copper_rock' || obj.type === 'desert_copper_rock' || obj.type === 'coal_rock') { ctx.strokeStyle = '#555'; ctx.strokeRect(mapX + 0.5, mapY + 0.5, size - 1, size - 1); }
        }
    });

    // Campfire waypoints
    {const c=getPlacedCampfires();ctx.fillStyle=CAMPFIRE_COLOR;for(const {tx,ty} of c){const dx=tx-playerTileX,dy=ty-playerTileY;if(Math.abs(dx)<=halfTiles&&Math.abs(dy)<=halfTiles){const mx=(canvasW/2)+dx*MAP_SCALE,my=(canvasH/2)+dy*MAP_SCALE;ctx.fillRect(mx,my,MAP_SCALE,MAP_SCALE);}else{const a=Math.atan2(dy,dx),r=(Math.min(canvasW,canvasH)/2)-4,ex=(canvasW/2)+Math.cos(a)*r,ey=(canvasH/2)+Math.sin(a)*r;ctx.beginPath();ctx.arc(ex,ey,3,0,Math.PI*2);ctx.fill();}}}

    // Render Player as a focused red dot at the center
    ctx.fillStyle = PLAYER_COLOR;
    const cx = Math.floor(canvasW / 2);
    const cy = Math.floor(canvasH / 2);
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    // subtle focus ring
    ctx.strokeStyle = 'rgba(255,65,65,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.stroke();
}