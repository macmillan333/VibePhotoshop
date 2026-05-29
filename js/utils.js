// --- Utility Functions ---

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    void toast.offsetWidth; // trigger reflow
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}

// --- Selection Helpers ---

/**
 * Returns true if any pixel in the selectionMask is selected (> 0).
 */
function hasSelection() {
    if (!selectionMask) return false;
    for (let i = 0; i < selectionMask.length; i++) {
        if (selectionMask[i] > 0) return true;
    }
    return false;
}

/**
 * Scans the selectionMask and returns the bounding box of all selected pixels.
 * Returns { hasSelection, minX, minY, maxX, maxY }.
 * If nothing is selected, hasSelection is false and bounds are undefined.
 */
function getSelectionBounds() {
    let minX = documentWidth, minY = documentHeight, maxX = 0, maxY = 0;
    let hasSel = false;

    for (let y = 0; y < documentHeight; y++) {
        for (let x = 0; x < documentWidth; x++) {
            if (selectionMask[y * documentWidth + x] > 0) {
                hasSel = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    return { hasSelection: hasSel, minX, minY, maxX, maxY };
}

/**
 * Extracts pixels under the current selection (or all pixels if no selection)
 * from a source canvas into a floating canvas, and produces an erased canvas
 * with those pixels removed.
 *
 * @param {CanvasRenderingContext2D} srcCtx - The source layer context.
 * @param {boolean} hasSel - Whether a selection exists.
 * @param {number} minX - Left bound of selection (or 0 if no selection).
 * @param {number} minY - Top bound of selection (or 0 if no selection).
 * @param {number} maxX - Right bound of selection (or documentWidth-1).
 * @param {number} maxY - Bottom bound of selection (or documentHeight-1).
 * @returns {{ floatingCanvas, erasedCanvas, cropW, cropH }}
 */
function extractSelectionRegion(srcCtx, hasSel, minX, minY, maxX, maxY) {
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    const floatingCanvas = document.createElement('canvas');
    floatingCanvas.width = cropW;
    floatingCanvas.height = cropH;
    const flCtx = floatingCanvas.getContext('2d', { willReadFrequently: true });
    const destData = flCtx.createImageData(cropW, cropH);

    const erasedCanvas = document.createElement('canvas');
    erasedCanvas.width = documentWidth;
    erasedCanvas.height = documentHeight;
    const erCtx = erasedCanvas.getContext('2d', { willReadFrequently: true });
    const erData = erCtx.createImageData(documentWidth, documentHeight);

    const srcData = srcCtx.getImageData(0, 0, documentWidth, documentHeight);

    for (let y = 0; y < documentHeight; y++) {
        for (let x = 0; x < documentWidth; x++) {
            const i = y * documentWidth + x;
            const px = i * 4;
            const selVal = hasSel ? selectionMask[i] : 255;

            if (selVal > 0 && x >= minX && x <= maxX && y >= minY && y <= maxY) {
                const destIdx = ((y - minY) * cropW + (x - minX)) * 4;
                destData.data[destIdx] = srcData.data[px];
                destData.data[destIdx + 1] = srcData.data[px + 1];
                destData.data[destIdx + 2] = srcData.data[px + 2];
                const factor = selVal / 255;
                destData.data[destIdx + 3] = Math.floor(srcData.data[px + 3] * factor);

                erData.data[px] = srcData.data[px];
                erData.data[px + 1] = srcData.data[px + 1];
                erData.data[px + 2] = srcData.data[px + 2];
                erData.data[px + 3] = Math.max(0, srcData.data[px + 3] - destData.data[destIdx + 3]);
            } else {
                erData.data[px] = srcData.data[px];
                erData.data[px + 1] = srcData.data[px + 1];
                erData.data[px + 2] = srcData.data[px + 2];
                erData.data[px + 3] = srcData.data[px + 3];
            }
        }
    }
    flCtx.putImageData(destData, 0, 0);
    erCtx.putImageData(erData, 0, 0);

    return { floatingCanvas, erasedCanvas, cropW, cropH };
}

/**
 * Shifts the selectionMask by (dx, dy) pixels in place.
 */
function shiftSelectionMask(dx, dy) {
    const oldMask = new Uint8Array(selectionMask);
    selectionMask.fill(0);
    for (let y = 0; y < documentHeight; y++) {
        for (let x = 0; x < documentWidth; x++) {
            const srcX = x - dx;
            const srcY = y - dy;
            if (srcX >= 0 && srcX < documentWidth && srcY >= 0 && srcY < documentHeight) {
                selectionMask[y * documentWidth + x] = oldMask[srcY * documentWidth + srcX];
            }
        }
    }
}

// --- Drawing Helpers ---

/**
 * Generates a radial gradient circle stamp on the given canvas context.
 */
function generateCircleStamp(ctx, radius, hardness, r, g, b) {
    if (hardness >= 100) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        const hardStop = hardness / 100;
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
        if (hardStop > 0) {
            gradient.addColorStop(hardStop, `rgba(${r}, ${g}, ${b}, 1)`);
        }
        
        const numStops = 10;
        for (let i = 1; i <= numStops; i++) {
            const t = i / numStops;
            const pos = hardStop + (1 - hardStop) * t;
            const ease = Math.pow(1 - t, 1.5); 
            gradient.addColorStop(pos, `rgba(${r}, ${g}, ${b}, ${ease})`);
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Composites a stroke bounding box onto the active layer.
 */
function compositeStrokeBoundingBox(activeObj, originalLayerCanvas, strokeCanvas, strength, compositeOp, minX, minY, maxX, maxY) {
    if (!activeObj || !activeObj.visible) return;
    const _ctx = activeObj.ctx;

    minX = Math.max(0, Math.floor(minX));
    minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(documentWidth, Math.ceil(maxX));
    maxY = Math.min(documentHeight, Math.ceil(maxY));
    const bw = maxX - minX;
    const bh = maxY - minY;
    
    if (bw <= 0 || bh <= 0) return;
    
    _ctx.clearRect(minX, minY, bw, bh);
    _ctx.drawImage(originalLayerCanvas, minX, minY, bw, bh, minX, minY, bw, bh);
    
    _ctx.save();
    if (compositeOp) {
        _ctx.globalCompositeOperation = compositeOp;
    }
    _ctx.globalAlpha = strength / 100;
    _ctx.drawImage(strokeCanvas, minX, minY, bw, bh, minX, minY, bw, bh);
    _ctx.restore();
}
