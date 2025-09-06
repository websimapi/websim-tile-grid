import NoiseModule from 'noisejs';
import { getSeed } from './seed.js';

// --- World Generation using Noise ---
const NoiseCtor = (NoiseModule && NoiseModule.Noise) ? NoiseModule.Noise : NoiseModule;
const perlinNoise = new NoiseCtor(getSeed());

function createFractalNoise(noise2DFn, octaves, persistence, lacunarity) {
    return function(x, y) {
        let total = 0, frequency = 1, amplitude = 1, maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            total += noise2DFn(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        return total / maxValue;
    }
}

export const biomeNoise2D = createFractalNoise((x, y) => perlinNoise.perlin2(x, y), 6, 0.5, 2.0);
export const treeNoise2D = createFractalNoise((x, y) => perlinNoise.perlin2(x - 1000, y - 1000), 4, 0.5, 2.0);
export const forestNoise2D = createFractalNoise((x, y) => perlinNoise.perlin2(x + 500, y + 500), 5, 0.6, 2.0);
export const bambooNoise2D = createFractalNoise((x, y) => perlinNoise.perlin2(x + 2000, y + 2000), 4, 0.4, 2.2);