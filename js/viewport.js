// --- Viewport Management ---

function updateBrushCursorSize() {
    if (brushCursor) {
        const visualSize = brushRadius * 2 * zoomLevel;
        brushCursor.style.width = visualSize + 'px';
        brushCursor.style.height = visualSize + 'px';
    }
}

function updateEraserCursorSize() {
    if (eraserCursor) {
        const visualSize = eraserRadius * 2 * zoomLevel;
        eraserCursor.style.width = visualSize + 'px';
        eraserCursor.style.height = visualSize + 'px';
    }
}

function applyViewport() {
    canvasStack.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    updateBrushCursorSize();
    updateEraserCursorSize();
}

function zoomAtPoint(clientX, clientY, newZoom) {
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    if (newZoom === zoomLevel) return;

    const rect = canvasStack.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    const unscaledX = offsetX / zoomLevel;
    const unscaledY = offsetY / zoomLevel;

    panX -= unscaledX * (newZoom - zoomLevel);
    panY -= unscaledY * (newZoom - zoomLevel);

    zoomLevel = newZoom;
    applyViewport();
}

// --- Coordinate Translation ---
function getCanvasCoords(e) {
    const rect = canvasStack.getBoundingClientRect();
    const scaleX = documentWidth / rect.width;
    const scaleY = documentHeight / rect.height;
    return {
        x: Math.floor((e.clientX - rect.left) * scaleX),
        y: Math.floor((e.clientY - rect.top) * scaleY)
    };
}
