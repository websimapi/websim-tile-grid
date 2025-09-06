// ASSETS & CONSTANTS
export const TILE_SIZE = 40;
export const CHUNK_SIZE = 16;
export const RENDER_DISTANCE_CHUNKS = 3;
export const PLAYER_SPEED = 220; // Max speed in pixels per second
export const PLAYER_ACCELERATION = 900; // Pixels per second per second
export const PLAYER_FRICTION = 1200; // Pixels per second per second
export const PLAYER_HEIGHT = 40;
export const TREE_HEIGHT = 69;
export const JUNGLE_TREE_HEIGHT = 69;
export const BAMBOO_HEIGHT = 69;
export const CACTUS_HEIGHT = 48;
export const TUMBLEWEED_HEIGHT = 40;
export const TUMBLEWEED_WIDTH = 40;
export const LOG_ITEM_WIDTH = 40;
export const LOG_ITEM_HEIGHT = 25;
export const CACTUS_PIECE_WIDTH = 30;
export const CACTUS_PIECE_HEIGHT = 30;
export const STONE_ITEM_WIDTH = 30;
export const STONE_ITEM_HEIGHT = 30;
export const WHEAT_ITEM_WIDTH = 30;
export const WHEAT_ITEM_HEIGHT = 30;
export const BAMBOO_ITEM_WIDTH = 30;
export const BAMBOO_ITEM_HEIGHT = 30;
export const COAL_ITEM_WIDTH = 30;
export const COAL_ITEM_HEIGHT = 30;
export const INTERACTION_DISTANCE = 60;
export const LOG_ITEM_PICKUP_DISTANCE = 30;
export const CHOP_ANIMATION_DURATION = 400;
export const FOOTSTEP_INTERVAL = 0.3; // seconds between footsteps
export const ZOOM_LEVEL = 1.5;
export const CAMERA_SMOOTHING_FACTOR = 0.06; // time-constant (seconds) for exponential smoothing; lower -> snappier, higher -> smoother
export const FARMLAND_GROWTH_TIME = 10; // seconds per growth stage
export const HUNGER_TICK_INTERVAL = 30; // seconds to lose one hunger point
export const BREAD_HEAL_AMOUNT = 3; // hunger points restored by bread
export const POTATO_HEAL_AMOUNT = 1; // hunger points restored by potato

// World Generation Constants
export const BIOME_NOISE_SCALE = 450;
export const BIOME_THRESHOLD = 0.15; // values above this are sand
export const JUNGLE_THRESHOLD = 0.0; // values above this (and below JUNGLE_END_THRESHOLD) are jungle
export const JUNGLE_END_THRESHOLD = 0.1; // values between this and BIOME_THRESHOLD are grass again
export const SNOW_THRESHOLD = -0.15; // values below this are snow

// --- ALL IMAGE PATHS HAVE BEEN MOVED TO js/asset-manager.js ---

// Collision Box Definitions
// All collision boxes are defined relative to the object's top-left corner (x,y).
// The y-offset is calculated from the top of the sprite.
export const PLAYER_COLLISION_BOX = {
    offsetX: 8,  // Centered better
    offsetY: 32, // Lowered to feet
    width: 24,   // Wider
    height: 8    // Thinner
};
export const TREE_COLLISION_BOX = {
    offsetX: 16, // Centered on trunk
    offsetY: 60, // At the base of the trunk
    width: 16,   // Tighter to the trunk
    height: 8
};
export const JUNGLE_TREE_COLLISION_BOX = {
    offsetX: 16,
    offsetY: 60,
    width: 16,
    height: 8
};
export const BAMBOO_COLLISION_BOX = {
    offsetX: 16,
    offsetY: 60,
    width: 16,
    height: 8
};
export const CACTUS_COLLISION_BOX = {
    offsetX: 14, // Centered
    offsetY: 40, // At the base
    width: 20,   // Tighter
    height: 8
};
export const TUMBLEWEED_COLLISION_BOX = {
    // Tumbleweeds should not collide with the player.
    // Setting width/height to 0 effectively disables it.
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0
};
export const ROCK_HEIGHT = 32;
export const ROCK_COLLISION_BOX = {
    offsetX: 4,  // Adjusted for sprite
    offsetY: 20, // Adjusted for sprite
    width: 32,   // Adjusted for sprite
    height: 12
};
export const COPPER_ROCK_HEIGHT = 32;
export const COPPER_ROCK_COLLISION_BOX = {
    offsetX: 4,
    offsetY: 20,
    width: 32,
    height: 12
};
export const COAL_ROCK_HEIGHT = 32;
export const COAL_ROCK_COLLISION_BOX = {
    offsetX: 4,
    offsetY: 20,
    width: 32,
    height: 12
};
export const DESERT_COPPER_ROCK_HEIGHT = 32;
export const DESERT_COPPER_ROCK_COLLISION_BOX = {
    offsetX: 4,
    offsetY: 20,
    width: 32,
    height: 12
};
export const ICE_STRUCTURE_HEIGHT = 48;
export const ICE_STRUCTURE_COLLISION_BOX = {
    offsetX: 4,
    offsetY: 32,
    width: 32,
    height: 16
};