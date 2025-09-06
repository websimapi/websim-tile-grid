let audioContext;
const audioBuffers = new Map();
let isInitialized = false;
let whiteNoiseBuffer = null;

// List of sound effects to load
const soundPaths = {
    chop: '/chop.mp3',
    melt: '/melt.mp3',
    freeze: '/freeze.mp3',
    wheat_harvest: '/wheat_harvest.mp3',
    dirt_dig: '/dirt_dig.mp3',
};

// --- Biome Music ---
const biomeMusicPaths = {
    grass: '/Plains [use this].mp3',
    snow: '/Snow.mp3',
    sand: '/Desert.mp3',
    jungle: '/Jungle.mp3',
};
let musicAudioBuffers = new Map();
let musicNodes = {}; // Will store { source, gain } for each biome
let currentBiome = null;
const FADE_TIME = 2.0; // seconds for a smooth fade
let isMuted = false;
let globalMusicGain;

// New state for biome change smoothing
let pendingBiome = null;
let biomeConfirmCounter = 0;
const BIOME_CONFIRM_THRESHOLD = 2; // require 2 consecutive checks in new biome

function createWhiteNoise() {
    if (!audioContext || whiteNoiseBuffer) return;
    const bufferSize = audioContext.sampleRate * 0.5; // 0.5 seconds of noise is plenty
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    whiteNoiseBuffer = buffer;
}

function initAudio() {
    if (isInitialized || typeof window === 'undefined') return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            const resume = () => {
                audioContext.resume();
                document.body.removeEventListener('click', resume);
                document.body.removeEventListener('touchstart', resume);
            };
            document.body.addEventListener('click', resume);
            document.body.addEventListener('touchstart', resume);
        }
        globalMusicGain = audioContext.createGain();
        globalMusicGain.connect(audioContext.destination);
        isInitialized = true;
        console.log("AudioContext initialized.");
    } catch (e) {
        console.error("Web Audio API is not supported in this browser or initialization failed.", e);
    }
}

async function startMusicTrack(biome) {
    if (!isInitialized || !audioContext) return;

    // If there's an existing track for this biome, stop and disconnect it first.
    if (musicNodes[biome] && musicNodes[biome].source) {
        try {
            musicNodes[biome].source.stop();
            musicNodes[biome].source.disconnect();
            musicNodes[biome].gain.disconnect();
        } catch (e) {
            // It might have already been stopped, which can throw an error. Ignore it.
        }
    }

    // If music isn't loaded yet, wait for it.
    if (!musicAudioBuffers.has(biome)) {
        await loadMusicForBiome(biome); // Wait for the specific track to load
        if (!musicAudioBuffers.has(biome)) {
             console.error(`Failed to start music for ${biome}, buffer still not available after load attempt.`);
             return;
        }
    }

    const buffer = musicAudioBuffers.get(biome);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0; // Start silent

    source.connect(gainNode);
    gainNode.connect(globalMusicGain);
    source.start(0);

    musicNodes[biome] = { source, gain: gainNode };
    console.log(`Started music track for biome: ${biome}`);
}

export function updateBiomeMusic(newBiome) {
    if (!isInitialized || !audioContext) return;
    
    // Normalize biome types that should share music
    if (newBiome === 'wood') {
        newBiome = 'grass';
    }

    if (!biomeMusicPaths[newBiome]) {
        console.warn(`No music path for biome: ${newBiome}`);
        return; // invalid biome
    }

    // --- Hysteresis Logic ---
    if (newBiome !== currentBiome) {
        if (newBiome !== pendingBiome) {
            // New potential biome, reset counter
            pendingBiome = newBiome;
            biomeConfirmCounter = 1;
        } else {
            // Same potential biome, increment counter
            biomeConfirmCounter++;
        }
    } else {
        // We are in the current biome, so no pending change
        pendingBiome = null;
        biomeConfirmCounter = 0;
    }

    if (pendingBiome === null || biomeConfirmCounter < BIOME_CONFIRM_THRESHOLD) {
        return; // Not confirmed yet, or no pending change.
    }
    
    // If we've reached here, the change is confirmed. `pendingBiome` is the new biome.
    // Check if it's actually a new biome to transition to.
    if (pendingBiome === currentBiome) return;

    console.log(`Biome changed from ${currentBiome} to ${pendingBiome}`);
    currentBiome = pendingBiome;
    // Reset pending state after committing the change
    pendingBiome = null;
    biomeConfirmCounter = 0;

    const now = audioContext.currentTime;

    for (const biome in biomeMusicPaths) {
        const isActiveBiome = (biome === currentBiome); // Use currentBiome which we just set
        let nodes = musicNodes[biome];

        if (isActiveBiome) {
            // If the track for the new biome isn't playing yet, or needs to be restarted for a fade-in, start it.
            // This now handles re-entry by creating a new source.
            startMusicTrack(biome);
            nodes = musicNodes[biome];
        }
        
        if (nodes) {
            const targetVolume = isActiveBiome ? 0.1 : 0; // Target volume 10%
            nodes.gain.gain.cancelScheduledValues(now);
            nodes.gain.gain.linearRampToValueAtTime(targetVolume, now + FADE_TIME);
        }
    }
}

async function loadMusicForBiome(biome) {
    if (!isInitialized || !biomeMusicPaths[biome] || musicAudioBuffers.has(biome)) return;
    const url = biomeMusicPaths[biome];
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        musicAudioBuffers.set(biome, audioBuffer);
        console.log(`Loaded music for ${biome}`);
    } catch (e) {
        console.error(`Failed to load music for ${biome}:`, e);
    }
}

async function initBiomeMusic() {
    if (!isInitialized) return;
    console.log("Loading biome music...");
    const promises = [];
    for (const biome of Object.keys(biomeMusicPaths)) {
        promises.push(loadMusicForBiome(biome));
    }
    await Promise.all(promises);
    console.log("All biome music loaded.");
}

async function loadSound(name, url) {
    if (!audioContext) {
        console.warn("AudioContext not ready, cannot load sound.");
        return;
    }
    if (audioBuffers.has(name)) {
        return audioBuffers.get(name);
    }
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.set(name, audioBuffer);
        return audioBuffer;
    } catch (e) {
        console.error(`Failed to load sound: ${name} from ${url}`, e);
    }
}

export function preloadSounds() {
    // This function doesn't load immediately, but ensures that when the audio context
    // is ready, the sounds will be loaded. It's called on game start.
    ensureAudioInitialized(); // ensure it's called
    
    const onReady = () => {
        console.log("Preloading all sounds...");
        const promises = [];
        for (const [name, url] of Object.entries(soundPaths)) {
            promises.push(loadSound(name, url));
        }
        Promise.all(promises).then(() => console.log("All sounds preloaded."));
        document.removeEventListener('AUDIO_INITIALIZED', onReady);
    };

    if (isInitialized) {
        onReady();
    } else {
        document.addEventListener('AUDIO_INITIALIZED', onReady);
    }
}

export function playGeneratedSound(type, options = {}) {
    if (!isInitialized || !audioContext) return;
    const now = audioContext.currentTime;

    if (type === 'tree_break') {
        // --- Pitch Drop Part (the "crack") ---
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(80, now); // Deeper start pitch
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.2); // Deeper end, slightly longer fall

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25); // Fade out over a slightly longer time

        osc.start(now);
        osc.stop(now + 0.25);

        // --- Noise Part (the "snap") ---
        if (whiteNoiseBuffer) {
            const noiseSource = audioContext.createBufferSource();
            noiseSource.buffer = whiteNoiseBuffer;
            const noiseGain = audioContext.createGain();

            noiseSource.connect(noiseGain);
            noiseGain.connect(audioContext.destination);

            noiseGain.gain.setValueAtTime(0.1, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // slightly longer noise tail

            noiseSource.start(now);
            noiseSource.stop(now + 0.15);
        }
    } else if (type === 'rock_break') {
        // A crunchy, low-pitched sound for breaking rocks.
        if (whiteNoiseBuffer) {
            // Noise part for the "crack" and crumble
            const noiseSource = audioContext.createBufferSource();
            noiseSource.buffer = whiteNoiseBuffer;

            const bandpassFilter = audioContext.createBiquadFilter();
            bandpassFilter.type = 'bandpass';
            bandpassFilter.frequency.setValueAtTime(1000, now); // Mid-range for crunch
            bandpassFilter.Q.value = 0.8;

            const noiseGain = audioContext.createGain();
            noiseGain.gain.setValueAtTime(0.35, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            noiseSource.connect(bandpassFilter);
            bandpassFilter.connect(noiseGain);
            // Connect SFX directly to destination, bypassing global music gain
            noiseGain.connect(audioContext.destination);

            noiseSource.start(now);
            noiseSource.stop(now + 0.25);

            // A low thud sound
            const osc = audioContext.createOscillator();
            const oscGain = audioContext.createGain();
            osc.connect(oscGain);
            oscGain.connect(audioContext.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

            oscGain.gain.setValueAtTime(0.4, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.start(now);
            osc.stop(now + 0.2);
        }
    } else if (type === 'footstep') {
        const { material = 'grass' } = options;

        if (whiteNoiseBuffer) {
            const noiseSource = audioContext.createBufferSource();
            noiseSource.buffer = whiteNoiseBuffer;
            
            const bandpassFilter = audioContext.createBiquadFilter();
            bandpassFilter.type = 'bandpass';

            const noiseGain = audioContext.createGain();

            noiseSource.connect(bandpassFilter);
            bandpassFilter.connect(noiseGain);
            // Connect SFX directly to destination, bypassing global music gain
            noiseGain.connect(audioContext.destination);

            let gain, decay, frequency, q;
            if (material === 'snow') {
                // Make snow footsteps crunchier with layered noise bursts, chiptune squeak, and slight stereo pan
                noiseGain.gain.setValueAtTime(0.0001, now); noiseSource.start(now); noiseSource.stop(now + 0.0001);
                const pan = audioContext.createStereoPanner ? audioContext.createStereoPanner() : null; if (pan) pan.pan.setValueAtTime((Math.random()*0.6)-0.3, now);
                const burst=(f,qv,g,d,t=0)=>{const s=audioContext.createBufferSource(),bp=audioContext.createBiquadFilter(),gn=audioContext.createGain();s.buffer=whiteNoiseBuffer;bp.type='bandpass';bp.frequency.setValueAtTime(f,now+t);bp.Q.value=qv;gn.gain.setValueAtTime(g,now+t);gn.gain.exponentialRampToValueAtTime(0.0001,now+t+d);s.connect(bp);bp.connect(gn);(pan?gn.connect(pan):gn.connect(audioContext.destination));s.start(now+t);s.stop(now+t+d);};
                const r=Math.random(); burst(4200+r*800,2.6,0.06,0.12,0); burst(1100+r*200,1.2,0.045,0.16,0.015);
                const osc=audioContext.createOscillator(), og=audioContext.createGain(); osc.type='square'; const f0=900+Math.random()*200; osc.frequency.setValueAtTime(f0,now); osc.frequency.exponentialRampToValueAtTime(450,now+0.07); og.gain.setValueAtTime(0.02,now); og.gain.exponentialRampToValueAtTime(0.0001,now+0.09); osc.connect(og); if(pan){og.connect(pan); pan.connect(audioContext.destination);} else {og.connect(audioContext.destination);} osc.start(now); osc.stop(now+0.09);
                return;
            } else if (material === 'wood') {
                const pan=audioContext.createStereoPanner?audioContext.createStereoPanner():null; if(pan){pan.pan.setValueAtTime((Math.random()*0.5)-0.25,now); pan.connect(audioContext.destination);}
                const blip=(f1,f2,d,g,t=0)=>{const o=audioContext.createOscillator(),gn=audioContext.createGain();o.type='square';o.frequency.setValueAtTime(f1,now+t);o.frequency.exponentialRampToValueAtTime(f2,now+t+d);gn.gain.setValueAtTime(g,now+t);gn.gain.exponentialRampToValueAtTime(0.0001,now+t+d);o.connect(gn);(pan?gn.connect(pan):gn.connect(audioContext.destination));o.start(now+t);o.stop(now+t+d);};
                blip(1200,700,0.05,0.03,0); blip(900,500,0.06,0.025,0.045);
                const s=audioContext.createBufferSource(),bp=audioContext.createBiquadFilter(),gn=audioContext.createGain(); s.buffer=whiteNoiseBuffer; bp.type='bandpass'; bp.frequency.setValueAtTime(2500,now); bp.Q.value=2.2; gn.gain.setValueAtTime(0.015,now); gn.gain.exponentialRampToValueAtTime(0.0001,now+0.05); s.connect(bp); bp.connect(gn); (pan?gn.connect(pan):gn.connect(audioContext.destination)); s.start(now); s.stop(now+0.05);
                return;
            } else if (material === 'sand') {
                gain = 0.04; decay = 0.08; frequency = 3000; q = 1.5;
            } else {
                gain = 0.06; decay = 0.05; frequency = 1500; q = 1;
            }

            bandpassFilter.frequency.value = frequency;
            bandpassFilter.Q.value = q;
            noiseGain.gain.setValueAtTime(gain, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

            noiseSource.start(now);
            noiseSource.stop(now + decay);
        }
    }
}

export function playSound(name) {
    if (!isInitialized) return;
    if (!audioContext) return;

    const buffer = audioBuffers.get(name);
    if (buffer) {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    } else {
        console.warn(`Sound not loaded yet: ${name}. It will play on next attempt if loaded.`);
    }
}

export function ensureAudioInitialized() {
    if (!isInitialized) {
        initAudio();
        if (isInitialized) {
            // Dispatch a custom event to notify other parts of the app (like preloadSounds)
            document.dispatchEvent(new CustomEvent('AUDIO_INITIALIZED'));
            createWhiteNoise(); // Create our reusable noise buffer
            initBiomeMusic(); // Preload and prepare biome music tracks
        }
    }
}

export function toggleMute() {
    if (!isInitialized || !globalMusicGain) return;
    isMuted = !isMuted;
    const now = audioContext.currentTime;
    const targetVolume = isMuted ? 0 : 1;
    globalMusicGain.gain.cancelScheduledValues(now);
    globalMusicGain.gain.linearRampToValueAtTime(targetVolume, now + 0.5); // 0.5s fade to mute/unmute
    return isMuted;
}

export async function forceInitialMusicPlay() {
    // This function is called once after the game world and player position are loaded.
    if (!isInitialized) {
        console.warn("Cannot force initial music play, audio not initialized.");
        return;
    }
    
    // Temporarily reset current biome to ensure the music check runs
    const previouslyPlaying = currentBiome;
    currentBiome = null;
    
    // Run the update logic with the biome the player is currently in
    const { playerState, TILE_SIZE } = await import('./state.js');
    const { getTileType } = await import('./terrain.js');

    const playerTileX = Math.floor(playerState.x / TILE_SIZE);
    const playerTileY = Math.floor(playerState.y / TILE_SIZE);
    const biome = getTileType(playerTileX, playerTileY + 1);
    
    // Call updateBiomeMusic twice to pass the hysteresis check
    updateBiomeMusic(biome);
    updateBiomeMusic(biome);
}