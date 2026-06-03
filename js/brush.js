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

function compositeBrushBoundingBox(minX, minY, maxX, maxY) {
    const activeObj = getActiveLayerObj();
    compositeStrokeBoundingBox(activeObj, brushOriginalLayerCanvas, brushStrokeCanvas, brushStrength, 'source-over', minX, minY, maxX, maxY);
}

function drawBrushLine(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    
    if (dist === 0) return;
    
    // Spacing is based on diameter (radius * 2)
    const step = Math.max(1, brushRadius * 2 * (brushSpacing / 100)); 
    
    let traveled = 0;
    let stamped = false;
    
    const pad = brushRadius + 2;
    let minX = documentWidth;
    let minY = documentHeight;
    let maxX = 0;
    let maxY = 0;

    while (brushDistSinceLastStamp + dist - traveled >= step) {
        const remainingToNextStamp = step - brushDistSinceLastStamp;
        traveled += remainingToNextStamp;
        
        const t = traveled / dist;
        const stampX = x0 + dx * t;
        const stampY = y0 + dy * t;
        
        brushStrokeCtx.drawImage(brushStampCanvas, Math.round(stampX) - brushRadius, Math.round(stampY) - brushRadius);
        
        minX = Math.min(minX, stampX - pad);
        minY = Math.min(minY, stampY - pad);
        maxX = Math.max(maxX, stampX + pad);
        maxY = Math.max(maxY, stampY + pad);
        
        brushDistSinceLastStamp = 0;
        stamped = true;
    }
    
    brushDistSinceLastStamp += (dist - traveled);
    
    if (stamped) {
        compositeBrushBoundingBox(minX, minY, maxX, maxY);
    }
}

// Pointer Event Handlers for Brush
function handleBrushPointerDown(e, coords) {
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;

    isDrawing = true;
    lastX = coords.x;
    lastY = coords.y;

    brushStrokeCanvas.width = documentWidth;
    brushStrokeCanvas.height = documentHeight;
    brushStrokeCtx.globalCompositeOperation = 'source-over';

    brushOriginalLayerCanvas = document.createElement('canvas');
    brushOriginalLayerCanvas.width = documentWidth;
    brushOriginalLayerCanvas.height = documentHeight;
    brushOriginalLayerCanvas.getContext('2d').drawImage(activeObj.canvas, 0, 0);

    brushDistSinceLastStamp = 0;
    brushStrokeCtx.drawImage(brushStampCanvas, Math.round(lastX) - brushRadius, Math.round(lastY) - brushRadius);

    const pad = brushRadius + 2;
    compositeBrushBoundingBox(lastX - pad, lastY - pad, lastX + pad, lastY + pad);

    canvasWrapper.setPointerCapture(e.pointerId);
}

function handleBrushPointerMove(e, coords) {
    if (!isDrawing) return;
    drawBrushLine(lastX, lastY, coords.x, coords.y);
    lastX = coords.x;
    lastY = coords.y;
}
