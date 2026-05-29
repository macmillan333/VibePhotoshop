// --- Tool Management ---
function setActiveTool(toolId) {
    toolBtns.forEach(btn => btn.classList.remove('active'));
    canvasStack.classList.remove('tool-move', 'tool-pencil', 'tool-brush', 'tool-eraser', 'tool-zoom', 'tool-rect-select', 'tool-oval-select', 'tool-polygon-select', 'tool-text', 'tool-eyedropper', 'alt-down');

    if (currentTool === toolId) {
        currentTool = null;
        return;
    }

    currentTool = toolId;
    if (toolId === 'move') {
        toolMove.classList.add('active');
        canvasStack.classList.add('tool-move');
    } else if (toolId === 'pencil') {
        toolPencil.classList.add('active');
        canvasStack.classList.add('tool-pencil');
        brushToolbar.classList.add('hidden');
        eraserToolbar.classList.add('hidden');
    } else if (toolId === 'brush') {
        toolBrush.classList.add('active');
        canvasStack.classList.add('tool-brush');
        brushToolbar.classList.remove('hidden');
        eraserToolbar.classList.add('hidden');
        canvasWrapper.style.cursor = 'none';
        updateBrushStamp();
    } else if (toolId === 'eraser') {
        toolEraser.classList.add('active');
        canvasStack.classList.add('tool-eraser');
        eraserToolbar.classList.remove('hidden');
        brushToolbar.classList.add('hidden');
        canvasWrapper.style.cursor = 'none';
        updateEraserStamp();
    } else if (toolId === 'zoom') {
        toolZoom.classList.add('active');
        canvasStack.classList.add('tool-zoom');
        brushToolbar.classList.add('hidden');
        eraserToolbar.classList.add('hidden');
    } else if (toolId === 'rect-select') {
        toolRectSelect.classList.add('active');
        canvasStack.classList.add('tool-rect-select');
    } else if (toolId === 'oval-select') {
        toolOvalSelect.classList.add('active');
        canvasStack.classList.add('tool-oval-select');
    } else if (toolId === 'polygon-select') {
        toolPolygonSelect.classList.add('active');
        canvasStack.classList.add('tool-polygon-select');
    } else if (toolId === 'text') {
        toolText.classList.add('active');
        canvasStack.classList.add('tool-text');
        canvasWrapper.style.cursor = 'text';
        brushToolbar.classList.add('hidden');
        eraserToolbar.classList.add('hidden');
        eyedropperToolbar.classList.add('hidden');
    } else if (toolId === 'eyedropper') {
        toolEyedropper.classList.add('active');
        canvasStack.classList.add('tool-eyedropper');
        canvasWrapper.style.cursor = 'crosshair';
        brushToolbar.classList.add('hidden');
        eraserToolbar.classList.add('hidden');
        eyedropperToolbar.classList.remove('hidden');
    }
    
    if (toolId !== 'brush' && toolId !== 'text' && toolId !== 'eraser' && toolId !== 'eyedropper') {
        brushToolbar.classList.add('hidden');
        eraserToolbar.classList.add('hidden');
        eyedropperToolbar.classList.add('hidden');
        canvasWrapper.style.cursor = '';
    }
    
    if (toolId !== 'brush') {
        brushCursor.classList.remove('active');
    }
    if (toolId !== 'eraser') {
        eraserCursor.classList.remove('active');
    }
}

toolMove.addEventListener('click', () => setActiveTool('move'));
toolPencil.addEventListener('click', () => setActiveTool('pencil'));
toolBrush.addEventListener('click', () => setActiveTool('brush'));
toolZoom.addEventListener('click', () => setActiveTool('zoom'));
toolRectSelect.addEventListener('click', () => setActiveTool('rect-select'));
toolOvalSelect.addEventListener('click', () => setActiveTool('oval-select'));
toolPolygonSelect.addEventListener('click', () => setActiveTool('polygon-select'));
toolText.addEventListener('click', () => setActiveTool('text'));
toolEraser.addEventListener('click', () => setActiveTool('eraser'));
toolEyedropper.addEventListener('click', () => setActiveTool('eyedropper'));

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


// --- Drawing Engine (Bresenham) ---
function getCanvasCoords(e) {
    const rect = canvasStack.getBoundingClientRect();
    const scaleX = documentWidth / rect.width;
    const scaleY = documentHeight / rect.height;
    return {
        x: Math.floor((e.clientX - rect.left) * scaleX),
        y: Math.floor((e.clientY - rect.top) * scaleY)
    };
}

function drawPixelBresenham(x0, y0, x1, y1) {
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;
    const _ctx = activeObj.ctx;

    _ctx.fillStyle = fgColor;
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
        _ctx.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        let e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

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

canvasWrapper.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

function compositeEraserBoundingBox(minX, minY, maxX, maxY) {
    const activeObj = getActiveLayerObj();
    compositeStrokeBoundingBox(activeObj, eraserOriginalLayerCanvas, eraserStrokeCanvas, eraserStrength, 'destination-out', minX, minY, maxX, maxY);
}

function drawEraserLine(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    
    if (dist === 0) return;
    
    const step = 1; 
    let traveled = 0;
    let stamped = false;
    
    const pad = eraserRadius + 2;
    let minX = documentWidth;
    let minY = documentHeight;
    let maxX = 0;
    let maxY = 0;

    while (traveled <= dist) {
        const t = traveled / dist;
        const stampX = x0 + dx * t;
        const stampY = y0 + dy * t;
        
        eraserStrokeCtx.drawImage(eraserStampCanvas, Math.round(stampX) - eraserRadius, Math.round(stampY) - eraserRadius);
        
        minX = Math.min(minX, stampX - pad);
        minY = Math.min(minY, stampY - pad);
        maxX = Math.max(maxX, stampX + pad);
        maxY = Math.max(maxY, stampY + pad);
        
        traveled += step;
        stamped = true;
    }
    
    if (stamped) {
        compositeEraserBoundingBox(minX, minY, maxX, maxY);
    }
}

function pickColor(x, y, isRightClick) {
    const sampleSize = parseInt(eyedropperSampleSizeSelect.value, 10) || 1;
    const half = Math.floor(sampleSize / 2);
    
    const startX = Math.max(0, Math.floor(x) - half);
    const startY = Math.max(0, Math.floor(y) - half);
    const endX = Math.min(documentWidth - 1, Math.floor(x) + half);
    const endY = Math.min(documentHeight - 1, Math.floor(y) + half);
    
    const w = endX - startX + 1;
    const h = endY - startY + 1;
    
    if (w <= 0 || h <= 0) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext('2d');
    
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (layer.visible) {
            ctx.drawImage(layer.canvas, startX, startY, w, h, 0, 0, w, h);
        }
    }
    
    const imgData = ctx.getImageData(0, 0, w, h).data;
    let r = 0, g = 0, b = 0;
    let count = 0;
    
    for (let i = 0; i < imgData.length; i += 4) {
        const alpha = imgData[i+3];
        if (alpha > 0) {
            r += imgData[i];
            g += imgData[i+1];
            b += imgData[i+2];
            count++;
        }
    }
    
    let hex = '#ffffff';
    if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    if (isRightClick) {
        bgColor = hex;
        bgColorInput.value = hex;
    } else {
        fgColor = hex;
        fgColorInput.value = hex;
        if (typeof updateBrushStamp === 'function') updateBrushStamp();
    }
}

function commitPolygonSelection() {
    if (polygonPoints.length < 3) {
        polygonPoints = [];
        selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);
        isSelecting = false;
        return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = documentWidth;
    tempCanvas.height = documentHeight;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.beginPath();
    tempCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
        tempCtx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    tempCtx.closePath();
    tempCtx.fillStyle = 'black';
    tempCtx.fill();

    const imgData = tempCtx.getImageData(0, 0, documentWidth, documentHeight);

    if (polygonMode === 'replace') {
        selectionMask.fill(0);
    }

    for (let i = 0; i < selectionMask.length; i++) {
        if (imgData.data[i * 4 + 3] > 128) {
            if (polygonMode === 'subtract') {
                selectionMask[i] = 0;
            } else {
                selectionMask[i] = 255;
            }
        }
    }

    polygonPoints = [];
    isSelecting = false;
    selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);
    renderSelectionVisual();
    saveState();
}

canvasWrapper.addEventListener('pointerdown', (e) => {
    if (!documentCreated) return;

    if (e.target === textEditor || textEditor.contains(e.target) || e.target === textToolbar || textToolbar.contains(e.target) || e.target === brushToolbar || brushToolbar.contains(e.target)) {
        return;
    }

    if (e.button === 1 || (e.button === 0 && e.altKey && currentTool !== 'zoom' && currentTool !== 'pencil' && currentTool !== 'brush' && currentTool !== 'rect-select' && currentTool !== 'oval-select' && currentTool !== 'polygon-select' && currentTool !== 'text')) {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvasStack.classList.add('is-panning');
        canvasWrapper.setPointerCapture(e.pointerId);
        return;
    }

    if (currentTool === 'zoom') {
        isZoomDragging = false;
        zoomStartX = e.clientX;
        zoomStartY = e.clientY;
        zoomStartLevel = zoomLevel;
        canvasWrapper.setPointerCapture(e.pointerId);
    } else if (currentTool === 'move') {
        const activeObj = getActiveLayerObj();
        if (!activeObj || !activeObj.visible) return;

        isMoving = true;
        const coords = getCanvasCoords(e);
        moveStartX = coords.x;
        moveStartY = coords.y;

        const bounds = getSelectionBounds();
        moveHasSelection = bounds.hasSelection;

        if (!bounds.hasSelection) {
            moveOriginalLayerCanvas = document.createElement('canvas');
            moveOriginalLayerCanvas.width = documentWidth;
            moveOriginalLayerCanvas.height = documentHeight;
            moveOriginalLayerCanvas.getContext('2d', { willReadFrequently: true }).drawImage(activeObj.canvas, 0, 0);
        } else {
            const res = extractSelectionRegion(activeObj.ctx, bounds.hasSelection, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
            moveFloatingCanvas = res.floatingCanvas;
            moveErasedLayerCanvas = res.erasedCanvas;
            moveSelectionMinX = bounds.minX;
            moveSelectionMinY = bounds.minY;
            moveOriginalSelectionMask = new Uint8Array(selectionMask);
        }
        canvasWrapper.setPointerCapture(e.pointerId);
    } else if (currentTool === 'rect-select' || currentTool === 'oval-select') {
        isSelecting = true;
        if (e.altKey && !e.shiftKey) {
            selectionMode = 'subtract';
        } else if (e.shiftKey && !e.altKey) {
            selectionMode = 'add';
        } else {
            selectionMode = 'replace';
        }
        const coords = getCanvasCoords(e);
        selectStartX = coords.x;
        selectStartY = coords.y;
        canvasWrapper.setPointerCapture(e.pointerId);
    } else if (currentTool === 'polygon-select') {
        const coords = getCanvasCoords(e);
        const now = Date.now();

        if (polygonPoints.length > 0) {
            const lastPoint = polygonPoints[polygonPoints.length - 1];
            const dist = Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y);
            if (lastPolygonClickTime && (now - lastPolygonClickTime < 300) && dist < 10) {
                commitPolygonSelection();
                lastPolygonClickTime = 0;
                return;
            }
        }

        if (polygonPoints.length === 0) {
            isSelecting = true;
            if (e.altKey && !e.shiftKey) polygonMode = 'subtract';
            else if (e.shiftKey && !e.altKey) polygonMode = 'add';
            else polygonMode = 'replace';
            polygonPoints.push({ x: coords.x, y: coords.y });
            renderSelectionVisual();
        } else {
            polygonPoints.push({ x: coords.x, y: coords.y });
            renderSelectionVisual();
        }
        lastPolygonClickTime = now;
    } else if (currentTool === 'text') {
        if (isTypingText) {
            commitTextLayer();
            return;
        }

        isTypingText = true;
        const coords = getCanvasCoords(e);
        const activeObj = getActiveLayerObj();
        let clickedExistingText = false;

        if (activeObj && activeObj.type === 'text') {
            // Check a padded region around the click for any non-transparent pixels
            const hitPad = 20;
            const sampleX = Math.max(0, Math.round(coords.x) - hitPad);
            const sampleY = Math.max(0, Math.round(coords.y) - hitPad);
            const sampleW = Math.min(documentWidth - sampleX, hitPad * 2 + 1);
            const sampleH = Math.min(documentHeight - sampleY, hitPad * 2 + 1);
            let hit = false;
            if (sampleW > 0 && sampleH > 0) {
                const pxData = activeObj.ctx.getImageData(sampleX, sampleY, sampleW, sampleH).data;
                for (let i = 3; i < pxData.length; i += 4) {
                    if (pxData[i] > 0) { hit = true; break; }
                }
            }
            const nearStart = Math.abs(coords.x - activeObj.textX) < 20 && Math.abs(coords.y - activeObj.textY) < 20;

            if (hit || nearStart) {
                textLayerId = activeObj.id;
                textX = activeObj.textX || coords.x;
                textY = activeObj.textY || coords.y;
                textEditor.innerHTML = activeObj.htmlContent || activeObj.textContent || "";
                clickedExistingText = true;
                activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
            }
        }

        if (!clickedExistingText) {
            textX = coords.x;
            textY = coords.y;
            textEditor.innerHTML = "";
            textLayerId = createLayer("Text Layer", "text").id;
            const newObj = getActiveLayerObj();
            newObj.textX = textX;
            newObj.textY = textY;
        }

        textEditor.style.left = `${textX}px`;
        textEditor.style.top = `${textY}px`;
        textEditor.style.color = fgColor;
        textEditor.classList.remove('hidden');
        textToolbar.classList.remove('hidden');

        // Ensure the editor uses span tags for styling
        setTimeout(() => {
            textEditor.focus();
            document.execCommand('styleWithCSS', false, true);
        }, 0);
    } else if (currentTool === 'pencil') {
        const activeObj = getActiveLayerObj();
        if (!activeObj || !activeObj.visible) return;

        isDrawing = true;
        const coords = getCanvasCoords(e);
        lastX = coords.x;
        lastY = coords.y;
        drawPixelBresenham(lastX, lastY, coords.x, coords.y);
        canvasWrapper.setPointerCapture(e.pointerId);
    } else if (currentTool === 'brush') {
        const activeObj = getActiveLayerObj();
        if (!activeObj || !activeObj.visible) return;

        isDrawing = true;
        const coords = getCanvasCoords(e);
        lastX = coords.x;
        lastY = coords.y;
        
        // Initialize brush stroke tracking
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
    } else if (currentTool === 'eraser') {
        const activeObj = getActiveLayerObj();
        if (!activeObj || !activeObj.visible) return;

        isDrawing = true;
        const coords = getCanvasCoords(e);
        lastX = coords.x;
        lastY = coords.y;
        
        eraserStrokeCanvas.width = documentWidth;
        eraserStrokeCanvas.height = documentHeight;
        eraserStrokeCtx.globalCompositeOperation = 'source-over';
        
        eraserOriginalLayerCanvas = document.createElement('canvas');
        eraserOriginalLayerCanvas.width = documentWidth;
        eraserOriginalLayerCanvas.height = documentHeight;
        eraserOriginalLayerCanvas.getContext('2d').drawImage(activeObj.canvas, 0, 0);
        
        eraserStrokeCtx.drawImage(eraserStampCanvas, Math.round(lastX) - eraserRadius, Math.round(lastY) - eraserRadius);
        
        const pad = eraserRadius + 2;
        compositeEraserBoundingBox(lastX - pad, lastY - pad, lastX + pad, lastY + pad);
        
        canvasWrapper.setPointerCapture(e.pointerId);
    } else if (currentTool === 'eyedropper') {
        isDrawing = true;
        const coords = getCanvasCoords(e);
        pickColor(coords.x, coords.y, e.button === 2);
        canvasWrapper.setPointerCapture(e.pointerId);
    }
});

canvasWrapper.addEventListener('pointermove', (e) => {
    if (!documentCreated) return;

    if (currentTool === 'brush') {
        brushCursor.classList.add('active');
        brushCursor.style.left = e.clientX + 'px';
        brushCursor.style.top = e.clientY + 'px';
    } else if (currentTool === 'eraser') {
        eraserCursor.classList.add('active');
        eraserCursor.style.left = e.clientX + 'px';
        eraserCursor.style.top = e.clientY + 'px';
    }

    if (isPanning) {
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        panX += dx;
        panY += dy;
        applyViewport();
        panStartX = e.clientX;
        panStartY = e.clientY;
        return;
    }

    if (currentTool === 'zoom' && e.buttons === 1) {
        const dx = e.clientX - zoomStartX;
        if (Math.abs(dx) > 2) {
            isZoomDragging = true;
            const newZoom = zoomStartLevel * Math.pow(1.01, dx);
            zoomAtPoint(zoomStartX, zoomStartY, newZoom);
        }
    } else if (currentTool === 'move' && isMoving) {
        const coords = getCanvasCoords(e);
        // Snap offset mechanically dynamically
        const dx = Math.floor(coords.x - moveStartX);
        const dy = Math.floor(coords.y - moveStartY);

        const activeObj = getActiveLayerObj();
        if (!activeObj) return;

        activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);

        if (!moveHasSelection) {
            activeObj.ctx.drawImage(moveOriginalLayerCanvas, dx, dy);
        } else {
            activeObj.ctx.drawImage(moveErasedLayerCanvas, 0, 0);
            activeObj.ctx.drawImage(moveFloatingCanvas, moveSelectionMinX + dx, moveSelectionMinY + dy);

            // Hardware projected overlay tracking visually
            selectionOverlay.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    } else if (currentTool === 'rect-select' && isSelecting) {
        const coords = getCanvasCoords(e);
        const x0 = Math.min(selectStartX, coords.x);
        const y0 = Math.min(selectStartY, coords.y);
        const x1 = Math.max(selectStartX, coords.x);
        const y1 = Math.max(selectStartY, coords.y);

        selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);
        selectionDragCtx.fillStyle = selectionMode === 'subtract'
            ? 'rgba(255, 50, 50, 0.4)'
            : 'rgba(92, 107, 255, 0.4)';
        selectionDragCtx.fillRect(x0, y0, x1 - x0, y1 - y0);

        selectionDragCtx.setLineDash([5, 5]);
        selectionDragCtx.lineDashOffset = 0;
        selectionDragCtx.lineWidth = 1;

        selectionDragCtx.strokeStyle = '#ffffff';
        selectionDragCtx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, y1 - y0);

        selectionDragCtx.lineDashOffset = 5;
        selectionDragCtx.strokeStyle = '#222222';
        selectionDragCtx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, y1 - y0);
        selectionDragCtx.setLineDash([]);
        selectionDragCtx.lineDashOffset = 0;

    } else if (currentTool === 'oval-select' && isSelecting) {
        const coords = getCanvasCoords(e);
        const x0 = Math.min(selectStartX, coords.x);
        const y0 = Math.min(selectStartY, coords.y);
        const x1 = Math.max(selectStartX, coords.x);
        const y1 = Math.max(selectStartY, coords.y);
        const w = x1 - x0;
        const h = y1 - y0;
        const cx = x0 + w / 2;
        const cy = y0 + h / 2;
        const rx = w / 2;
        const ry = h / 2;

        selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);

        selectionDragCtx.fillStyle = selectionMode === 'subtract'
            ? 'rgba(255, 50, 50, 0.4)'
            : 'rgba(92, 107, 255, 0.4)';

        selectionDragCtx.beginPath();
        selectionDragCtx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        selectionDragCtx.fill();

        selectionDragCtx.setLineDash([5, 5]);
        selectionDragCtx.lineWidth = 1;
        selectionDragCtx.strokeStyle = '#ffffff';
        selectionDragCtx.stroke();

        selectionDragCtx.lineDashOffset = 5;
        selectionDragCtx.strokeStyle = '#222222';
        selectionDragCtx.stroke();
        selectionDragCtx.setLineDash([]);

    } else if (currentTool === 'polygon-select' && polygonPoints.length > 0) {
        const coords = getCanvasCoords(e);
        selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);

        selectionDragCtx.setLineDash([5, 5]);
        selectionDragCtx.lineWidth = 1;

        selectionDragCtx.beginPath();
        selectionDragCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
        for (let i = 1; i < polygonPoints.length; i++) {
            selectionDragCtx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
        }
        selectionDragCtx.lineTo(coords.x, coords.y);

        selectionDragCtx.strokeStyle = '#ffffff';
        selectionDragCtx.stroke();

        selectionDragCtx.lineDashOffset = 5;
        selectionDragCtx.strokeStyle = '#222222';
        selectionDragCtx.stroke();
        selectionDragCtx.setLineDash([]);

    } else if (currentTool === 'pencil' && isDrawing) {
        const coords = getCanvasCoords(e);
        drawPixelBresenham(lastX, lastY, coords.x, coords.y);
        lastX = coords.x;
        lastY = coords.y;
    } else if (currentTool === 'brush' && isDrawing) {
        const coords = getCanvasCoords(e);
        drawBrushLine(lastX, lastY, coords.x, coords.y);
        lastX = coords.x;
        lastY = coords.y;
    } else if (currentTool === 'eraser' && isDrawing) {
        const coords = getCanvasCoords(e);
        drawEraserLine(lastX, lastY, coords.x, coords.y);
        lastX = coords.x;
        lastY = coords.y;
    } else if (currentTool === 'eyedropper' && isDrawing) {
        const coords = getCanvasCoords(e);
        pickColor(coords.x, coords.y, e.buttons === 2);
    }
});

canvasWrapper.addEventListener('pointerup', (e) => {
    if (!documentCreated) return;

    try { canvasWrapper.releasePointerCapture(e.pointerId); } catch (err) { }

    if (isPanning) {
        isPanning = false;
        canvasStack.classList.remove('is-panning');
        return;
    }

    if (currentTool === 'zoom') {
        if (!isZoomDragging) {
            const direction = e.altKey ? -1 : 1;
            const step = direction * 0.4;
            let newZoom = zoomLevel * (1 + step);
            zoomAtPoint(e.clientX, e.clientY, newZoom);
        }
        isZoomDragging = false;

    } else if (currentTool === 'move' && isMoving) {
        isMoving = false;
        const coords = getCanvasCoords(e);
        const dx = Math.floor(coords.x - moveStartX);
        const dy = Math.floor(coords.y - moveStartY);

        const activeObj = getActiveLayerObj();
        if (activeObj) {
            if (!moveHasSelection) {
                activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
                activeObj.ctx.drawImage(moveOriginalLayerCanvas, dx, dy);
            } else {
                activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
                activeObj.ctx.drawImage(moveErasedLayerCanvas, 0, 0);
                activeObj.ctx.drawImage(moveFloatingCanvas, moveSelectionMinX + dx, moveSelectionMinY + dy);

                selectionOverlay.style.transform = `none`;
                shiftSelectionMask(dx, dy);
                renderSelectionVisual();
            }
            updateLayerThumbnail(activeObj.id);
            saveState();
        }

        moveOriginalLayerCanvas = null;
        moveFloatingCanvas = null;
        moveErasedLayerCanvas = null;
        moveOriginalSelectionMask = null;

    } else if (currentTool === 'rect-select' && isSelecting) {
        isSelecting = false;
        selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);

        const coords = getCanvasCoords(e);

        const xMinRaw = Math.min(selectStartX, coords.x);
        const yMinRaw = Math.min(selectStartY, coords.y);
        const xMaxRaw = Math.max(selectStartX, coords.x);
        const yMaxRaw = Math.max(selectStartY, coords.y);

        const x0 = Math.max(0, Math.min(documentWidth, xMinRaw));
        const y0 = Math.max(0, Math.min(documentHeight, yMinRaw));
        const x1 = Math.max(0, Math.min(documentWidth, xMaxRaw));
        const y1 = Math.max(0, Math.min(documentHeight, yMaxRaw));

        if (selectionMode === 'replace') {
            selectionMask.fill(0);
        }

        if (x1 > x0 && y1 > y0) {
            for (let y = y0; y < y1; y++) {
                const rowOffset = y * documentWidth;
                if (selectionMode === 'subtract') {
                    selectionMask.fill(0, rowOffset + x0, rowOffset + x1);
                } else {
                    selectionMask.fill(255, rowOffset + x0, rowOffset + x1);
                }
            }
        }

        renderSelectionVisual();
        saveState();

    } else if (currentTool === 'oval-select' && isSelecting) {
        isSelecting = false;
        selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);

        const coords = getCanvasCoords(e);
        const xMinRaw = Math.min(selectStartX, coords.x);
        const yMinRaw = Math.min(selectStartY, coords.y);
        const xMaxRaw = Math.max(selectStartX, coords.x);
        const yMaxRaw = Math.max(selectStartY, coords.y);

        const x0 = Math.max(0, Math.min(documentWidth, xMinRaw));
        const y0 = Math.max(0, Math.min(documentHeight, yMinRaw));
        const x1 = Math.max(0, Math.min(documentWidth, xMaxRaw));
        const y1 = Math.max(0, Math.min(documentHeight, yMaxRaw));

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = documentWidth;
        tempCanvas.height = documentHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (x1 > x0 && y1 > y0) {
            const w = x1 - x0;
            const h = y1 - y0;
            tempCtx.fillStyle = 'black';
            tempCtx.beginPath();
            tempCtx.ellipse(x0 + w / 2, y0 + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
            tempCtx.fill();
        }

        const imgData = tempCtx.getImageData(0, 0, documentWidth, documentHeight);

        if (selectionMode === 'replace') {
            selectionMask.fill(0);
        }

        for (let i = 0; i < selectionMask.length; i++) {
            if (imgData.data[i * 4 + 3] > 128) {
                if (selectionMode === 'subtract') {
                    selectionMask[i] = 0;
                } else {
                    selectionMask[i] = 255;
                }
            }
        }

        renderSelectionVisual();
        saveState();

    } else if ((currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser' || currentTool === 'eyedropper') && isDrawing) {
        isDrawing = false;
        if (currentTool === 'brush') {
            brushOriginalLayerCanvas = null;
        } else if (currentTool === 'eraser') {
            eraserOriginalLayerCanvas = null;
        }
        if (activeLayerId) updateLayerThumbnail(activeLayerId);
        saveState();
    }
});

canvasWrapper.addEventListener('pointercancel', (e) => {
    isPanning = false;
    canvasStack.classList.remove('is-panning');
    isZoomDragging = false;

    if (isMoving) {
        isMoving = false;
        const activeObj = getActiveLayerObj();
        if (activeObj) {
            if (moveOriginalLayerCanvas) {
                activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
                activeObj.ctx.drawImage(moveOriginalLayerCanvas, 0, 0);
            } else if (moveHasSelection) {
                activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
                activeObj.ctx.drawImage(moveErasedLayerCanvas, 0, 0);
                activeObj.ctx.drawImage(moveFloatingCanvas, moveSelectionMinX, moveSelectionMinY);
                selectionOverlay.style.transform = `none`;
            }
        }
    }

    if (isSelecting) {
        isSelecting = false;
        polygonPoints = [];
        selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);
        renderSelectionVisual();
    }

    if (isDrawing) {
        isDrawing = false;
        if (currentTool === 'brush') {
            brushOriginalLayerCanvas = null;
        } else if (currentTool === 'eraser') {
            eraserOriginalLayerCanvas = null;
        }
        if (activeLayerId) updateLayerThumbnail(activeLayerId);
        saveState();
    }
});

canvasWrapper.addEventListener('pointerleave', (e) => {
    if (currentTool === 'brush') {
        brushCursor.classList.remove('active');
    } else if (currentTool === 'eraser') {
        eraserCursor.classList.remove('active');
    }
});

canvasWrapper.addEventListener('pointerenter', (e) => {
    if (currentTool === 'brush') {
        brushCursor.classList.add('active');
        brushCursor.style.left = e.clientX + 'px';
        brushCursor.style.top = e.clientY + 'px';
    } else if (currentTool === 'eraser') {
        eraserCursor.classList.add('active');
        eraserCursor.style.left = e.clientX + 'px';
        eraserCursor.style.top = e.clientY + 'px';
    }
});

canvasWrapper.addEventListener('wheel', (e) => {
    if (currentTool === 'zoom' || e.ctrlKey || e.altKey) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && polygonPoints.length > 0) {
        polygonPoints = [];
        isSelecting = false;
        selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);
    }
});


// --- Scale and Resize Functions ---
function resizeDocument(newW, newH, scaleImages, anchorStr = 'center') {
    if (!documentCreated) return;
    if (newW <= 0 || newH <= 0 || (newW === documentWidth && newH === documentHeight)) return;

    const oldW = documentWidth;
    const oldH = documentHeight;

    let dx = 0; let dy = 0;
    if (!scaleImages) {
        if (anchorStr.includes('left')) dx = 0;
        else if (anchorStr.includes('right')) dx = newW - oldW;
        else dx = Math.floor((newW - oldW) / 2);

        if (anchorStr.includes('top')) dy = 0;
        else if (anchorStr.includes('bottom')) dy = newH - oldH;
        else dy = Math.floor((newH - oldH) / 2);
    }

    layers.forEach(layer => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newW;
        tempCanvas.height = newH;
        const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        if (scaleImages) {
            tCtx.drawImage(layer.canvas, 0, 0, oldW, oldH, 0, 0, newW, newH);
        } else {
            tCtx.drawImage(layer.canvas, dx, dy);
        }

        layer.canvas.width = newW;
        layer.canvas.height = newH;
        layer.ctx.drawImage(tempCanvas, 0, 0);
    });

    if (selectionMask && selectionMask.length > 0) {
        const newMask = new Uint8Array(newW * newH);

        if (scaleImages) {
            const sTemp = document.createElement('canvas');
            sTemp.width = oldW;
            sTemp.height = oldH;
            const sCtx = sTemp.getContext('2d', { willReadFrequently: true });
            const sImgData = sCtx.createImageData(oldW, oldH);
            for (let i = 0; i < oldW * oldH; i++) {
                sImgData.data[i * 4 + 3] = selectionMask[i];
            }
            sCtx.putImageData(sImgData, 0, 0);

            const destCanvas = document.createElement('canvas');
            destCanvas.width = newW;
            destCanvas.height = newH;
            const destCtx = destCanvas.getContext('2d', { willReadFrequently: true });
            destCtx.drawImage(sTemp, 0, 0, oldW, oldH, 0, 0, newW, newH);

            const destData = destCtx.getImageData(0, 0, newW, newH);
            for (let i = 0; i < newW * newH; i++) {
                newMask[i] = destData.data[i * 4 + 3];
            }
        } else {
            for (let y = 0; y < newH; y++) {
                for (let x = 0; x < newW; x++) {
                    const srcX = x - dx;
                    const srcY = y - dy;
                    if (srcX >= 0 && srcX < oldW && srcY >= 0 && srcY < oldH) {
                        newMask[y * newW + x] = selectionMask[srcY * oldW + srcX];
                    }
                }
            }
        }
        selectionMask = newMask;
    }

    documentWidth = newW;
    documentHeight = newH;

    canvasStack.style.width = `${newW}px`;
    canvasStack.style.height = `${newH}px`;

    selectionOverlay.width = newW;
    selectionOverlay.height = newH;
    selectionDragOverlay.width = newW;
    selectionDragOverlay.height = newH;

    panX = 0; panY = 0; zoomLevel = 1.0;
    applyViewport();
    renderSelectionVisual();
    layers.forEach(l => updateLayerThumbnail(l.id));
    saveState();
}

