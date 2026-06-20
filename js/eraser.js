// --- Eraser Tool Logic ---

// Eraser Toolbar Events
eraserRadiusInput.addEventListener('input', (e) => {
    eraserRadius = parseInt(e.target.value, 10);
    updateEraserStamp();
});
eraserHardnessSlider.addEventListener('input', (e) => {
    eraserHardness = parseInt(e.target.value, 10);
    eraserHardnessInput.value = eraserHardness;
    updateEraserStamp();
});
eraserHardnessInput.addEventListener('input', (e) => {
    eraserHardness = parseInt(e.target.value, 10);
    eraserHardnessSlider.value = eraserHardness;
    updateEraserStamp();
});
eraserStrengthSlider.addEventListener('input', (e) => {
    eraserStrength = parseInt(e.target.value, 10);
    eraserStrengthInput.value = eraserStrength;
    updateEraserStamp();
});
eraserStrengthInput.addEventListener('input', (e) => {
    eraserStrength = parseInt(e.target.value, 10);
    eraserStrengthSlider.value = eraserStrength;
    updateEraserStamp();
});
eraserShapeSelect.addEventListener('change', (e) => {
    eraserShape = e.target.value;
    if (eraserShape === 'square') {
        eraserCursor.classList.add('square');
    } else {
        eraserCursor.classList.remove('square');
    }
    updateEraserStamp();
});

function updateEraserStamp() {
    const size = eraserRadius * 2;
    eraserStampCanvas.width = size;
    eraserStampCanvas.height = size;
    
    updateEraserCursorSize();
    
    const ctx = eraserStampCanvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    if (eraserShape === 'square') {
        const hardDist = eraserRadius * (eraserHardness / 100);
        const softDist = eraserRadius - hardDist;
        const imgData = ctx.createImageData(size, size);
        for(let y=0; y<size; y++){
            for(let x=0; x<size; x++){
                let distToEdge = Math.min(x, size-1-x, y, size-1-y);
                let alpha = 255;
                if(distToEdge < softDist && softDist > 0) {
                    let t = 1 - (distToEdge / softDist);
                    let ease = Math.pow(1 - t, 1.5);
                    alpha = Math.floor(ease * 255);
                }
                const i = (y*size + x)*4;
                imgData.data[i] = 255;
                imgData.data[i+1] = 255;
                imgData.data[i+2] = 255;
                imgData.data[i+3] = alpha;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    } else {
        generateCircleStamp(ctx, eraserRadius, eraserHardness, 255, 255, 255);
    }
}

function drawEraserLine(x0, y0, x1, y1) {
    const step = 1; 
    
    eraserDistSinceLastStamp = drawStampLine(
        x0, y0, x1, y1,
        step, eraserRadius,
        eraserStampCanvas, eraserStrokeCtx,
        eraserDistSinceLastStamp,
        (minX, minY, maxX, maxY) => {
            const activeObj = getActiveLayerObj();
            compositeStrokeBoundingBox(activeObj, eraserOriginalLayerCanvas, eraserStrokeCanvas, eraserStrength, 'destination-out', minX, minY, maxX, maxY);
        }
    );
}

// Pointer Event Handlers for Eraser
function handleEraserPointerDown(e, coords) {
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;

    isDrawing = true;
    lastX = coords.x;
    lastY = coords.y;
    
    eraserStrokeCanvas.width = documentWidth;
    eraserStrokeCanvas.height = documentHeight;
    eraserStrokeCtx.globalCompositeOperation = 'source-over';
    
    eraserOriginalLayerCanvas = document.createElement('canvas');
    eraserOriginalLayerCanvas.width = documentWidth;
    eraserOriginalLayerCanvas.height = documentHeight;
    eraserOriginalLayerCanvas.getContext('2d').drawImage(activeObj.canvas, 0, 0);
    
    eraserDistSinceLastStamp = 0;
    eraserStrokeCtx.drawImage(eraserStampCanvas, Math.round(lastX) - eraserRadius, Math.round(lastY) - eraserRadius);
    
    const pad = eraserRadius + 2;
    compositeStrokeBoundingBox(activeObj, eraserOriginalLayerCanvas, eraserStrokeCanvas, eraserStrength, 'destination-out', lastX - pad, lastY - pad, lastX + pad, lastY + pad);
    
    canvasWrapper.setPointerCapture(e.pointerId);
}

function handleEraserPointerMove(e, coords) {
    if (!isDrawing) return;
    drawEraserLine(lastX, lastY, coords.x, coords.y);
    lastX = coords.x;
    lastY = coords.y;
}
