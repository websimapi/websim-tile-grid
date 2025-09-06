let worldSeed;

export function initSeed() {
    const urlParams = new URLSearchParams(window.location.search);
    const seedFromUrl = urlParams.get('seed');
    const saved = (() => { try { return JSON.parse(localStorage.getItem('savegame_v1') || 'null'); } catch { return null; } })();

    if (seedFromUrl && !isNaN(parseInt(seedFromUrl, 10))) {
        worldSeed = parseInt(seedFromUrl, 10);
    } else if (saved && typeof saved.seed === 'number' && !isNaN(saved.seed)) {
        worldSeed = saved.seed;
    } else {
        worldSeed = Math.floor(Math.random() * 999999999);
    }

    console.log(`%cWorld Seed: ${worldSeed}`, 'font-size: 16px; font-weight: bold; color: #2ecc71;');
    console.log(`%cTo reuse this world, add "?seed=${worldSeed}" to the URL.`, 'font-size: 12px; color: #bdc3c7;');

    // Update URL without reloading page, for user convenience
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('seed', worldSeed);
    window.history.replaceState({}, '', newUrl);

    return worldSeed;
}

export function getSeed() {
    if (typeof worldSeed === 'undefined') {
        console.warn("Seed not initialized. Call initSeed() first.");
        return initSeed();
    }
    return worldSeed;
}