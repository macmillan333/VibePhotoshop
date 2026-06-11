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
    if (typeof drawRulers === 'function') drawRulers();
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

function drawRulers() {
    if (!showRulers || !documentCreated) return;

    const workspaceRect = document.getElementById('workspace').getBoundingClientRect();
    const canvasRect = canvasStack.getBoundingClientRect();

    rulerTopCanvas.width = workspaceRect.width;
    rulerTopCanvas.height = 20;
    rulerLeftCanvas.width = 20;
    rulerLeftCanvas.height = workspaceRect.height - 64;

    const ctxTop = rulerTopCanvas.getContext('2d');
    const ctxLeft = rulerLeftCanvas.getContext('2d');

    ctxTop.clearRect(0, 0, rulerTopCanvas.width, rulerTopCanvas.height);
    ctxLeft.clearRect(0, 0, rulerLeftCanvas.width, rulerLeftCanvas.height);

    ctxTop.fillStyle = '#bbb';
    ctxTop.font = '10px Inter, sans-serif';
    ctxTop.textAlign = 'center';
    ctxTop.textBaseline = 'top';

    ctxLeft.fillStyle = '#bbb';
    ctxLeft.font = '10px Inter, sans-serif';
    ctxLeft.textAlign = 'right';
    ctxLeft.textBaseline = 'middle';

    const startX = canvasRect.left - workspaceRect.left;
    const startY = canvasRect.top - (workspaceRect.top + 64);

    const targetStep = 15 / zoomLevel;
    let docStep = 5000;
    const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    for (const s of steps) {
        if (targetStep <= s) {
            docStep = s;
            break;
        }
    }

    const screenStep = docStep * zoomLevel;
    const majorStep = docStep * 5;

    // Draw Top Ruler
    ctxTop.beginPath();
    ctxTop.strokeStyle = '#888';
    let docX = Math.floor(-startX / screenStep) * docStep;
    let screenX = startX + docX * zoomLevel;
    
    while (screenX < rulerTopCanvas.width) {
        if (screenX >= 0) {
            ctxTop.moveTo(screenX, 20);
            if (docX % majorStep === 0) {
                ctxTop.lineTo(screenX, 0);
                ctxTop.fillText(docX.toString(), screenX, 2);
            } else {
                ctxTop.lineTo(screenX, 15);
            }
        }
        docX += docStep;
        screenX += screenStep;
    }
    ctxTop.stroke();

    // Draw Left Ruler
    ctxLeft.beginPath();
    ctxLeft.strokeStyle = '#888';
    let docY = Math.floor(-startY / screenStep) * docStep;
    let screenY = startY + docY * zoomLevel;

    while (screenY < rulerLeftCanvas.height) {
        if (screenY >= 0) {
            ctxLeft.moveTo(20, screenY);
            if (docY % majorStep === 0) {
                ctxLeft.lineTo(0, screenY);
                ctxLeft.save();
                ctxLeft.translate(10, screenY);
                ctxLeft.rotate(-Math.PI / 2);
                ctxLeft.fillText(docY.toString(), 0, -4);
                ctxLeft.restore();
            } else {
                ctxLeft.lineTo(15, screenY);
            }
        }
        docY += docStep;
        screenY += screenStep;
    }
    ctxLeft.stroke();
}
