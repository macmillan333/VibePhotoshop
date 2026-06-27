// --- Brush Tool Logic ---

// Brush Toolbar Events
brushRadiusInput.addEventListener('input', (e) => {
    brushRadius = parseInt(e.target.value, 10);
    updateBrushStamp();
});
brushHardnessSlider.addEventListener('input', (e) => {
    brushHardness = parseInt(e.target.value, 10);
    brushHardnessInput.value = brushHardness;
    updateBrushStamp();
});
brushHardnessInput.addEventListener('input', (e) => {
    brushHardness = parseInt(e.target.value, 10);
    brushHardnessSlider.value = brushHardness;
    updateBrushStamp();
});
brushStrengthSlider.addEventListener('input', (e) => {
    brushStrength = parseInt(e.target.value, 10);
    brushStrengthInput.value = brushStrength;
    updateBrushStamp();
});
brushStrengthInput.addEventListener('input', (e) => {
    brushStrength = parseInt(e.target.value, 10);
    brushStrengthSlider.value = brushStrength;
    updateBrushStamp();
});
brushSpacingSlider.addEventListener('input', (e) => {
    brushSpacing = parseInt(e.target.value, 10);
    brushSpacingInput.value = brushSpacing;
});
brushSpacingInput.addEventListener('input', (e) => {
    brushSpacing = parseInt(e.target.value, 10);
    brushSpacingSlider.value = brushSpacing;
});

function updateBrushStamp() {
    const size = brushRadius * 2;
    brushStampCanvas.width = size;
    brushStampCanvas.height = size;
    
    // Update custom cursor size based on zoom
    updateBrushCursorSize();
    
    const ctx = brushStampCanvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    // Extract r, g, b from hex fgColor
    let r = parseInt(fgColor.slice(1, 3), 16);
    let g = parseInt(fgColor.slice(3, 5), 16);
    let b = parseInt(fgColor.slice(5, 7), 16);

    generateCircleStamp(ctx, brushRadius, brushHardness, r, g, b);
}

function drawBrushLine(x0, y0, p0, x1, y1, p1) {
    const step = Math.max(1, brushRadius * 2 * (brushSpacing / 100));
    
    brushDistSinceLastStamp = drawStampLine(
        x0, y0, p0, x1, y1, p1,
        step, brushRadius,
        brushStampCanvas, brushStrokeCtx,
        brushDistSinceLastStamp,
        (minX, minY, maxX, maxY) => {
            const activeObj = getActiveLayerObj();
            compositeStrokeBoundingBox(activeObj, brushOriginalLayerCanvas, brushStrokeCanvas, brushStrength, 'source-over', minX, minY, maxX, maxY);
        }
    );
}

// Pointer Event Handlers for Brush
function handleBrushPointerDown(e, coords) {
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;

    isDrawing = true;
    lastX = coords.x;
    lastY = coords.y;
    lastPressure = (e.pointerType === 'pen' && e.pressure !== undefined) ? e.pressure : 1.0;

    brushStrokeCanvas.width = documentWidth;
    brushStrokeCanvas.height = documentHeight;
    brushStrokeCtx.globalCompositeOperation = 'source-over';

    brushOriginalLayerCanvas = document.createElement('canvas');
    brushOriginalLayerCanvas.width = documentWidth;
    brushOriginalLayerCanvas.height = documentHeight;
    brushOriginalLayerCanvas.getContext('2d').drawImage(activeObj.canvas, 0, 0);

    brushDistSinceLastStamp = 0;
    
    const scaledRadius = Math.max(1, brushRadius * lastPressure);
    const stampSize = scaledRadius * 2;
    brushStrokeCtx.drawImage(
        brushStampCanvas, 
        0, 0, brushStampCanvas.width, brushStampCanvas.height,
        Math.round(lastX) - scaledRadius, Math.round(lastY) - scaledRadius, 
        stampSize, stampSize
    );

    const pad = brushRadius + 2;
    compositeStrokeBoundingBox(activeObj, brushOriginalLayerCanvas, brushStrokeCanvas, brushStrength, 'source-over', lastX - pad, lastY - pad, lastX + pad, lastY + pad);

    canvasWrapper.setPointerCapture(e.pointerId);
}

function handleBrushPointerMove(e, coords) {
    if (!isDrawing) return;
    const currentPressure = (e.pointerType === 'pen' && e.pressure !== undefined) ? e.pressure : 1.0;
    drawBrushLine(lastX, lastY, lastPressure, coords.x, coords.y, currentPressure);
    lastX = coords.x;
    lastY = coords.y;
    lastPressure = currentPressure;
}
