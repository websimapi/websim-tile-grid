let tooltipEl;

export function initTooltip() {
    tooltipEl = document.getElementById('tooltip');
}

export function showTooltip(text, evt) {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = text.replace(/\n/g, '<br>'); // Allow multiline tooltips
    tooltipEl.style.display = 'block';
    positionTooltip(evt);
}

export function positionTooltip(evt) {
    if (!tooltipEl || !evt || tooltipEl.style.display === 'none') return;
    const x = evt.clientX, y = evt.clientY;
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
}

export function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.style.display = 'none';
}