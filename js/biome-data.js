// Defines properties for each biome type.
export const BIOME_CATEGORIES = {
    HOT: 'hot',
    COLD: 'cold',
    WET: 'wet',
    TEMPERATE: 'temperate',
};

export const BIOME_DATA = {
    sand: {
        category: BIOME_CATEGORIES.HOT,
    },
    snow: {
        category: BIOME_CATEGORIES.COLD,
    },
    jungle: {
        category: BIOME_CATEGORIES.WET,
    },
    grass: {
        category: BIOME_CATEGORIES.TEMPERATE,
    },
    // Default for unknown types
    unknown: {
        category: BIOME_CATEGORIES.TEMPERATE,
    }
};