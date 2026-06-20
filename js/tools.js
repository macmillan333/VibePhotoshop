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

function restoreToolCursor() {
    if (currentTool === 'brush' || currentTool === 'eraser') canvasWrapper.style.cursor = 'none';
    else if (currentTool === 'text') canvasWrapper.style.cursor = 'text';
    else if (currentTool === 'eyedropper') canvasWrapper.style.cursor = 'crosshair';
    else canvasWrapper.style.cursor = '';
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

// --- Drawing Engine (Bresenham) ---

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





canvasWrapper.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});



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

    const tempCanvas = getMergedVisibleCanvas(startX, startY, w, h);
    const ctx = tempCanvas.getContext('2d');
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

function pickColorForRange(x, y) {
    const startX = Math.max(0, Math.floor(x) - 1);
    const startY = Math.max(0, Math.floor(y) - 1);
    const endX = Math.min(documentWidth - 1, Math.floor(x) + 1);
    const endY = Math.min(documentHeight - 1, Math.floor(y) + 1);
    
    const w = endX - startX + 1;
    const h = endY - startY + 1;
    
    if (w <= 0 || h <= 0) return;

    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;
    
    const imgData = activeObj.ctx.getImageData(startX, startY, w, h).data;
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
    
    if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        colorRangeSampledColor = { r, g, b };
        updateColorRangePreview();
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

    // Guide dragging — check before tool handling
    if (e.button === 0 && !e.altKey && documentGuides && currentTool === 'move') {
        const coords = getExactCanvasCoords(e, false);
        const hitThreshold = 10 / zoomLevel; // 10 screen pixels
        let bestDist = hitThreshold;
        let bestType = null;
        let bestIndex = -1;

        for (let i = 0; i < documentGuides.horizontal.length; i++) {
            const dist = Math.abs(coords.y - documentGuides.horizontal[i]);
            if (dist < bestDist) {
                bestDist = dist;
                bestType = 'horizontal';
                bestIndex = i;
            }
        }
        for (let i = 0; i < documentGuides.vertical.length; i++) {
            const dist = Math.abs(coords.x - documentGuides.vertical[i]);
            if (dist < bestDist) {
                bestDist = dist;
                bestType = 'vertical';
                bestIndex = i;
            }
        }

        if (bestType !== null) {
            isDraggingGuide = true;
            dragGuideType = bestType;
            dragGuideIndex = bestIndex;
            canvasWrapper.setPointerCapture(e.pointerId);
            canvasWrapper.style.cursor = bestType === 'horizontal' ? 'ns-resize' : 'ew-resize';
            e.preventDefault();
            return;
        }
    }

    if (e.button === 1 || (e.button === 0 && e.altKey && currentTool !== 'zoom' && currentTool !== 'pencil' && currentTool !== 'brush' && currentTool !== 'rect-select' && currentTool !== 'oval-select' && currentTool !== 'polygon-select' && currentTool !== 'text')) {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvasStack.classList.add('is-panning');
        canvasWrapper.setPointerCapture(e.pointerId);
        return;
    }

    if (isColorRangeActive) {
        isDrawing = true;
        const coords = getCanvasCoords(e);
        pickColorForRange(coords.x, coords.y);
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
        handleBrushPointerDown(e, getCanvasCoords(e));
    } else if (currentTool === 'eraser') {
        handleEraserPointerDown(e, getCanvasCoords(e));
    } else if (currentTool === 'eyedropper') {
        isDrawing = true;
        const coords = getCanvasCoords(e);
        pickColor(coords.x, coords.y, e.button === 2);
        canvasWrapper.setPointerCapture(e.pointerId);
    }
});

canvasWrapper.addEventListener('pointermove', (e) => {
    if (!documentCreated) return;

    if (currentTool === 'brush' || currentTool === 'eraser') {
        const cursorCanvasCoords = getExactCanvasCoords(e, true);
        const rect = canvasStack.getBoundingClientRect();
        const scaleX = documentWidth / rect.width;
        const scaleY = documentHeight / rect.height;
        const snappedClientX = rect.left + cursorCanvasCoords.x / scaleX;
        const snappedClientY = rect.top + cursorCanvasCoords.y / scaleY;

        if (currentTool === 'brush') {
            brushCursor.classList.add('active');
            brushCursor.style.left = snappedClientX + 'px';
            brushCursor.style.top = snappedClientY + 'px';
        } else {
            eraserCursor.classList.add('active');
            eraserCursor.style.left = snappedClientX + 'px';
            eraserCursor.style.top = snappedClientY + 'px';
        }
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

    if (isDraggingGuide) {
        const coords = getExactCanvasCoords(e, false);
        if (dragGuideType === 'horizontal') {
            documentGuides.horizontal[dragGuideIndex] = Math.round(coords.y);
        } else {
            documentGuides.vertical[dragGuideIndex] = Math.round(coords.x);
        }
        drawGuides();
        return;
    }

    // Guide hover detection
    if (currentTool === 'move' && !isPanning && !isDrawing && !isMoving && !isSelecting && !isZoomDragging && documentGuides && (documentGuides.horizontal.length > 0 || documentGuides.vertical.length > 0)) {
        const coords = getExactCanvasCoords(e, false);
        const hitThreshold = 10 / zoomLevel;
        let hoveredCursor = null;

        for (let y of documentGuides.horizontal) {
            if (Math.abs(coords.y - y) < hitThreshold) { hoveredCursor = 'ns-resize'; break; }
        }
        if (!hoveredCursor) {
            for (let x of documentGuides.vertical) {
                if (Math.abs(coords.x - x) < hitThreshold) { hoveredCursor = 'ew-resize'; break; }
            }
        }

        if (hoveredCursor) {
            canvasWrapper.style.cursor = hoveredCursor;
        } else {
            restoreToolCursor();
        }
    }

    if (isColorRangeActive && isDrawing) {
        const coords = getCanvasCoords(e);
        pickColorForRange(coords.x, coords.y);
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
        handleBrushPointerMove(e, coords);
    } else if (currentTool === 'eraser' && isDrawing) {
        const coords = getCanvasCoords(e);
        handleEraserPointerMove(e, coords);
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

    if (isDraggingGuide) {
        // Check if the guide was dragged outside the canvas-stack viewport bounds
        const rect = canvasStack.getBoundingClientRect();
        const outside = e.clientX < rect.left || e.clientX > rect.right ||
                        e.clientY < rect.top || e.clientY > rect.bottom;
        if (outside) {
            documentGuides[dragGuideType].splice(dragGuideIndex, 1);
        } else {
            const coords = getExactCanvasCoords(e, false);
            if (dragGuideType === 'horizontal') {
                documentGuides.horizontal[dragGuideIndex] = Math.round(coords.y);
            } else {
                documentGuides.vertical[dragGuideIndex] = Math.round(coords.x);
            }
        }
        isDraggingGuide = false;
        dragGuideType = null;
        dragGuideIndex = -1;
        restoreToolCursor();
        drawGuides();
        return;
    }

    if (isColorRangeActive) {
        isDrawing = false;
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

