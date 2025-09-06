// A central place to define all asset paths.
const assetPaths = {
    // Player sprites
    playerIdle: '/IdleHuman.gif',
    playerWalking: '/WalkingHuman.gif',
    playerChopping: '/HumanAxe.gif',
    playerRockBreak: '/aaaaaaaa.gif',

    // World objects
    tree: '/Tree (1).png',
    jungleTree: '/JungleTree.png',
    bamboo: '/bamboo.png',
    cactus: '/Cactus.png',
    cactusVariant1: '/CactusVariant1.png',
    cactusVariant2: '/CactusVariant2.png',
    cactusVariant3: '/CactusVariant3.png',
    cactusVariant4: '/CactusVariant4.png',
    tumbleweed: '/TumbWeed.png',
    snowTree: '/SnowTree.png',
    jungleTreeOnFire: '/JungleTreeOnFire.png',
    jungleTreeOnFire1: '/JungleTreeOnFire1.png',
    oven: '/Oven.png',

    // Items
    log: '/LogTexture.png',
    cactusPiece: '/cactusPiece.png',
    bamboo_item: '/bamboo.png',
    rocky: '/Rocky.png',
    copperOre: '/CopperRocky.png',
    coal_item: '/CoalTexture1.png',
    iceStructure: '/IceStructure.png',
    iceStructureLoot: '/IceStructureThingInside.png',
    iceChunk: '/IceChunk.png',
    iceMedalion: '/IceMedalion.png',
    sprinkler: '/Sprinkler.png',
    copperSprinkler: '/CopperSprinkler.png',
    wheat: '/Wheat.png',
    bread: '/Bread.png',
    breadTexture: '/BreadTexture.png',
    potato: '/Potato - Copy.png',
    potatoSeeds: '/PotatoSeeds.png',

    // UI and HUD
    hotbarSlot: '/Hotbar (1).png',
    interactionPrompt: '/E.png',
    highlight1: '/Highlight.png',
    highlight2: '/Highlight1.png',
    highlight3: '/Highlight2.png',

    // Tiles - Grass/Forest
    grass1: '/GrassTileForest.png',
    grass2: '/GrassTileForest1.png',
    grass3: '/GrassTileForest2.png',
    grass4: '/GrassTileForest3.png',

    // Tiles - Jungle
    jungleGrass1: '/JungleGrass.png',
    jungleGrass2: '/JungleGrass1.png',
    jungleGrass3: '/JungleGrass2.png',
    jungleGrass4: '/JungleGrass3.png',
    jungleGrass5: '/JungleGrass4.png',

    // Tiles - Jungle Border Overlays
    jungleBlendTop: '/JungleBlendTopInner.png',
    jungleBlendBottom: '/JungleBlendBottomInner.png',
    jungleBlendLeft: '/JungleBlendLeftInner.png',
    jungleBlendRight: '/JungleBlendInnerRight.png',
    jungleBlendTopLeft: '/JungleBlendTopLeft.png',
    jungleBlendTopRight: '/JungleBlendTopRight.png',
    jungleBlendBottomLeft: '/JungleBlendBottomLeft.png',
    jungleBlendBottomRight: '/JungleBlendBottomRight.png',

    // Tiles - Sand
    sand1: '/SandTile.png',
    sand2: '/SandTile1.png',
    sand3: '/SandTile2.png',
    sand4: '/Sandtile3.png',
    sand5: '/SandTile4.png',

    // Tiles - Border
    sandTop: '/TopInnerSand.png',
    sandBottom: '/BottomInnerSand.png',
    sandLeft: '/InnerLeftSand.png',
    sandRight: '/CenterInnerRightSand.png',
    sandTopLeft: '/TopLeftCornerSand.png',
    sandTopRight: '/UpRightCornerSand.png',
    sandBottomLeft: '/BottomleftSandcorner.png',
    sandBottomRight: '/BottomRightCornerSand.png',
    sandInnerCorner: '/CornerInterlopeSand.png',
    rockGrass: '/Rock.png',
    rockDesert: '/DesertRock.png',
    copperRock: '/CopperRock.png',
    desertCopper: '/DesertCopper.png',
    coalRock: '/CoalRock.png',
    coalRockDesert: '/CoalRockDesert.png',

    // Tiles - Wood
    wood1: '/WoodTexture1.png',
    wood2: '/WoodTexture2.png',
    wood3: '/WoodTexture3.png',
    woodGrassUp: '/GrassWoodBlendUp.png',
    woodGrassDown: '/WoodBlendBottom.png',
    woodGrassLeft: '/WoodGrassBlendLeft.png',
    woodGrassRight: '/WoodBlendRight.png',

    // Tiles - Farmland
    farmlandGrass: '/FarmlandTile.png',
    farmlandSand: '/SandFarmland.png',
    farmlandSnow: '/SnowFarmland.png',

    // Tiles - Snow
    snow1: '/SnowTile.png',
    snow2: '/SnowTile1.png',
    snow3: '/SnowTile2.png',
    snow4: '/SnowTile3.png',
    // Snow biome edges
    snowTop: '/SnowbiomeBlendTop.png',
    snowBottom: '/SnowBiomeBlendBottom.png',
    snowLeft: '/SnowBiomeBlendLeft.png',
    snowRight: '/SnowBiomeblendRight.png',
    snowTopLeftCorner: '/SnowBiomeBlendTopLeftCorner.png',
    snowTopRightCorner: '/SnowBiomeBlendTopRightCorner.png',
    snowBottomLeftCorner: '/SnowBiomeBlendBottomLeftCorner.png',
    snowBottomRightCorner: '/SnowbiomeBlendBottomRightCorner.png',
    innerSnowBlend: '/InnerSnowBlend.png',

    // Farmland growth stages
    farmlandStage0: '/FarmlandOverlayOnTopyes.png',
    farmlandStage1: '/FarmlandOnTopVariant1.png',
    farmlandStage2: '/FarmLandOnTopvariant2.png',
    farmlandStage3: '/FarmlandOnTopVariant3.png',
    potatoStage1: '/FarmtilePotato.png',
    potatoStage2: '/FarmlandPotato.png',
    potatoStage3: '/FarmlandPotato3.png',
};

const preloadedAssets = {};

/**
 * Preloads all assets defined in assetPaths.
 * @returns {Promise<void>} A promise that resolves when all assets are loaded.
 */
export function preloadAssets() {
    const promises = Object.entries(assetPaths).map(([key, url]) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                preloadedAssets[key] = img;
                resolve();
            };
            img.onerror = () => reject(`Failed to load image: ${url}`);
            img.src = url;
        });
    });
    return Promise.all(promises);
}

// --- ASSET COLLECTIONS (for convenience) ---

export const commonTileImages = [
    assetPaths.grass1,
    assetPaths.grass2,
    assetPaths.grass3,
    assetPaths.grass4
];

export const sandTileImages = [
    assetPaths.sand1,
    assetPaths.sand2,
    assetPaths.sand3,
    assetPaths.sand4,
    assetPaths.sand5
];

export const snowTileImages = [
    assetPaths.snow1,
    assetPaths.snow2,
    assetPaths.snow3,
    assetPaths.snow4
];

export const borderTileImages = {
    // Edges
    top: { url: assetPaths.sandTop },
    bottom: { url: assetPaths.sandBottom },
    left: { url: assetPaths.sandLeft },
    right: { url: assetPaths.sandRight },
    // Outer Corners
    topLeft: { url: assetPaths.sandTopLeft },
    topRight: { url: assetPaths.sandTopRight },
    bottomLeft: { url: assetPaths.sandBottomLeft },
    bottomRight: { url: assetPaths.sandBottomRight },
    // Inner Corners
    innerTopLeft: { url: assetPaths.sandInnerCorner, rotation: 90 },
    innerTopRight: { url: assetPaths.sandInnerCorner, rotation: 180 },
    innerBottomRight: { url: assetPaths.sandInnerCorner, rotation: 270 },
    innerBottomLeft: { url: assetPaths.sandInnerCorner } // rotation 0 is default
};

export const jungleBorderTileImages = {
    // Edges
    top: { url: assetPaths.jungleBlendTop },
    bottom: { url: assetPaths.jungleBlendBottom },
    left: { url: assetPaths.jungleBlendLeft },
    right: { url: assetPaths.jungleBlendRight },
    // Corners are no longer used for generation, but kept here for now
    topLeft: { url: assetPaths.jungleBlendTopLeft },
    topRight: { url: assetPaths.jungleBlendTopRight },
    bottomLeft: { url: assetPaths.jungleBlendBottomLeft },
    bottomRight: { url: assetPaths.jungleBlendBottomRight },
    // Inner corners are not used in the new system
    innerTopLeft: { url: assetPaths.jungleBlendTopLeft },
    innerTopRight: { url: assetPaths.jungleBlendTopRight },
    innerBottomLeft: { url: assetPaths.jungleBlendBottomLeft },
    innerBottomRight: { url: assetPaths.jungleBlendBottomRight },
};

export const cactusVariants = [
    assetPaths.cactus,
    assetPaths.cactusVariant1,
    assetPaths.cactusVariant2,
    assetPaths.cactusVariant3,
    assetPaths.cactusVariant4
];

export const playerSprites = {
    idle: assetPaths.playerIdle,
    walking: assetPaths.playerWalking,
    chopping: assetPaths.playerChopping,
    rockBreaking: assetPaths.playerRockBreak,
};

export const itemSprites = {
    log_item: assetPaths.log,
    cactus_piece: assetPaths.cactusPiece,
    bamboo_item: assetPaths.bamboo_item,
    stone_item: assetPaths.rocky,
    copper_ore_item: assetPaths.copperOre,
    campfire_item: '/Campfire.png',
    oven_item: assetPaths.oven,
    ice_chunk: assetPaths.iceChunk,
    ice_medalion: assetPaths.iceMedalion,
    sprinkler_item: assetPaths.sprinkler,
    copper_sprinkler_item: assetPaths.copperSprinkler,
    wheat_item: assetPaths.wheat,
    wheat_seeds_item: '/WheatSeedsTexture.png',
    bread_item: assetPaths.breadTexture,
    potato_item: assetPaths.potato,
    potato_seeds_item: assetPaths.potatoSeeds,
    coal_item: assetPaths.coal_item
};

export const getAssetPath = (key) => assetPaths[key];
export const rockAssets = {
    grass: assetPaths.rockGrass,
    desert: assetPaths.rockDesert
};

export const coalAssets = {
    grass: assetPaths.coalRock,
    desert: assetPaths.coalRockDesert
};

export const woodTileImages = [
    assetPaths.wood1,
    assetPaths.wood3,
    assetPaths.wood2,
];

export const woodBorderTileImages = {
    top: { url: assetPaths.woodGrassUp }, // grass is on top
    bottom: { url: assetPaths.woodGrassDown }, // grass is on bottom
    left: { url: assetPaths.woodGrassLeft }, // grass is on left
    right: { url: assetPaths.woodGrassRight }, // grass is on right
};

export const farmlandAssets = {
    grass: assetPaths.farmlandGrass,
    sand: assetPaths.farmlandSand,
    snow: assetPaths.farmlandSnow,
};

export const snowAssets = {
    tree: assetPaths.snowTree
};

export const snowBorderTileImages = {
    top: { url: assetPaths.snowTop },
    bottom: { url: assetPaths.snowBottom },
    left: { url: assetPaths.snowLeft },
    right: { url: assetPaths.snowRight },
    topLeft: { url: assetPaths.snowTopLeftCorner },
    topRight: { url: assetPaths.snowTopRightCorner },
    bottomLeft: { url: assetPaths.snowBottomLeftCorner },
    bottomRight: { url: assetPaths.snowBottomRightCorner },
};

export const snowInnerBlend = assetPaths.innerSnowBlend;

export const farmlandGrowthStages = [
    assetPaths.farmlandStage0,
    assetPaths.farmlandStage1,
    assetPaths.farmlandStage2,
    assetPaths.farmlandStage3,
];

export const potatoGrowthStages = [
    assetPaths.farmlandStage0, // empty tilled dirt
    assetPaths.potatoStage1,
    assetPaths.potatoStage2,
    assetPaths.potatoStage3,
];

export const jungleTileImages = [
    assetPaths.jungleGrass1,
    assetPaths.jungleGrass2,
    assetPaths.jungleGrass3,
    assetPaths.jungleGrass4,
    assetPaths.jungleGrass5,
];