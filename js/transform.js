// --- Free Transform Engine ---
function updateTransformUI() {
    transformBox.style.left = `${transformBaseX}px`;
    transformBox.style.top = `${transformBaseY}px`;
    transformBox.style.width = `${transformW}px`;
    transformBox.style.height = `${transformH}px`;
    transformBox.style.transform = `rotate(${transformAngle}rad)`;
}

function startTransform() {
    if (isTransforming) return;
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;

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

    transformHasSelection = hasSel;

    if (!hasSel) {
        minX = 0; minY = 0; maxX = documentWidth - 1; maxY = documentHeight - 1;
    }

    if (maxX < minX || maxY < minY) return;

    transformW = maxX - minX + 1;
    transformH = maxY - minY + 1;
    transformBaseX = minX;
    transformBaseY = minY;
    transformAngle = 0;

    transformContentCanvas.width = transformW;
    transformContentCanvas.height = transformH;
    const flCtx = transformContentCanvas.getContext('2d', { willReadFrequently: true });

    const srcData = activeObj.ctx.getImageData(0, 0, documentWidth, documentHeight);
    const destData = flCtx.createImageData(transformW, transformH);

    transformErasedLayerCanvas = document.createElement('canvas');
    transformErasedLayerCanvas.width = documentWidth;
    transformErasedLayerCanvas.height = documentHeight;
    const erCtx = transformErasedLayerCanvas.getContext('2d', { willReadFrequently: true });
    const erData = erCtx.createImageData(documentWidth, documentHeight);

    for (let y = 0; y < documentHeight; y++) {
        for (let x = 0; x < documentWidth; x++) {
            const i = y * documentWidth + x;
            const px = i * 4;
            const selVal = hasSel ? selectionMask[i] : 255;

            if (selVal > 0 && x >= minX && x <= maxX && y >= minY && y <= maxY) {
                const destIdx = ((y - minY) * transformW + (x - minX)) * 4;
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

    transformSelectionMaskClone = new Uint8Array(selectionMask);
    transformOriginalLayerCanvas = document.createElement('canvas');
    transformOriginalLayerCanvas.width = documentWidth;
    transformOriginalLayerCanvas.height = documentHeight;
    transformOriginalLayerCanvas.getContext('2d').drawImage(activeObj.canvas, 0, 0);

    selectionOverlay.style.display = 'none';

    activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
    activeObj.ctx.drawImage(transformErasedLayerCanvas, 0, 0);

    isTransforming = true;
    updateTransformUI();
    transformBox.classList.remove('hidden');
}

function cancelTransform() {
    if (!isTransforming) return;
    isTransforming = false;
    transformBox.classList.add('hidden');
    selectionOverlay.style.display = '';

    const activeObj = getActiveLayerObj();
    activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
    activeObj.ctx.drawImage(transformOriginalLayerCanvas, 0, 0);
}

function applyTransform() {
    if (!isTransforming) return;
    isTransforming = false;
    transformBox.classList.add('hidden');
    selectionOverlay.style.display = '';

    const activeObj = getActiveLayerObj();
    activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
    activeObj.ctx.drawImage(transformErasedLayerCanvas, 0, 0);

    const cx = transformBaseX + transformW / 2;
    const cy = transformBaseY + transformH / 2;

    activeObj.ctx.save();
    activeObj.ctx.translate(cx, cy);
    activeObj.ctx.rotate(transformAngle);
    activeObj.ctx.drawImage(transformContentCanvas, -transformW / 2, -transformH / 2, transformW, transformH);
    activeObj.ctx.restore();

    if (transformHasSelection) {
        selectionMask.fill(0);
    }

    renderSelectionVisual();
    updateLayerThumbnail(activeObj.id);
    saveState();
}

function interactTransformStart(e) {
    if (!isTransforming) return;
    e.stopPropagation();
    e.preventDefault();

    const target = e.target;
    if (target.classList.contains('handle')) {
        transformOp = target.dataset.handle;
    } else if (target.classList.contains('rotation-zone')) {
        transformOp = 'rotate';
    } else if (target.classList.contains('move-zone') || target.id === 'transform-box') {
        transformOp = 'move';
    } else {
        transformOp = 'move';
    }

    transformPointerStartX = e.clientX;
    transformPointerStartY = e.clientY;

    transformOrigX = transformBaseX;
    transformOrigY = transformBaseY;
    transformOrigW = transformW;
    transformOrigH = transformH;
    transformOrigAngle = transformAngle;
}

function interactTransformMove(e) {
    if (!isTransforming || !transformOp) return;

    const dxRaw = (e.clientX - transformPointerStartX) / zoomLevel;
    const dyRaw = (e.clientY - transformPointerStartY) / zoomLevel;

    const cos = Math.cos(-transformOrigAngle);
    const sin = Math.sin(-transformOrigAngle);
    const dx = dxRaw * cos - dyRaw * sin;
    const dy = dxRaw * sin + dyRaw * cos;

    if (transformOp === 'move') {
        transformBaseX = transformOrigX + dxRaw;
        transformBaseY = transformOrigY + dyRaw;
    } else if (transformOp === 'rotate') {
        const rect = transformBox.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        // Native angles based on pure DOM bounding rect
        let ang1 = Math.atan2(transformPointerStartY - cy, transformPointerStartX - cx);
        let ang2 = Math.atan2(e.clientY - cy, e.clientX - cx);
        let rawAngle = transformOrigAngle + (ang2 - ang1);
        if (!e.altKey) {
            const snap = 15 * Math.PI / 180;
            rawAngle = Math.round(rawAngle / snap) * snap;
        }
        transformAngle = rawAngle;
    } else {
        let newW = transformOrigW;
        let newH = transformOrigH;
        let newX = transformOrigX;
        let newY = transformOrigY;

        const aspect = transformOrigW / transformOrigH;

        if (transformOp.includes('r')) newW = transformOrigW + dx;
        if (transformOp.includes('l')) { newW = transformOrigW - dx; newX = transformOrigX + dx; }
        if (transformOp.includes('b')) newH = transformOrigH + dy;
        if (transformOp.includes('t')) { newH = transformOrigH - dy; newY = transformOrigY + dy; }

        if (!e.altKey && (transformOp === 'tl' || transformOp === 'tr' || transformOp === 'bl' || transformOp === 'br')) {
            if (Math.abs(dx) > Math.abs(dy)) {
                const driveH = newW / aspect;
                const diffH = driveH - newH;
                newH = driveH;
                if (transformOp.includes('t')) newY -= diffH;
            } else {
                const driveW = newH * aspect;
                const diffW = driveW - newW;
                newW = driveW;
                if (transformOp.includes('l')) newX -= diffW;
            }
        }

        if (newW < 2) {
            if (transformOp.includes('l')) newX -= (2 - newW);
            newW = 2;
        }
        if (newH < 2) {
            if (transformOp.includes('t')) newY -= (2 - newH);
            newH = 2;
        }

        transformW = newW;
        transformH = newH;

        const cxUnrotated = newX + newW / 2;
        const cyUnrotated = newY + newH / 2;
        const origCx = transformOrigX + transformOrigW / 2;
        const origCy = transformOrigY + transformOrigH / 2;

        const dcx = cxUnrotated - origCx;
        const dcy = cyUnrotated - origCy;

        const rcx = dcx * Math.cos(transformOrigAngle) - dcy * Math.sin(transformOrigAngle);
        const rcy = dcx * Math.sin(transformOrigAngle) + dcy * Math.cos(transformOrigAngle);

        const newFinalCx = origCx + rcx;
        const newFinalCy = origCy + rcy;

        transformBaseX = newFinalCx - newW / 2;
        transformBaseY = newFinalCy - newH / 2;
    }
    updateTransformUI();
}

function interactTransformEnd() {
    transformOp = null;
}

transformBox.addEventListener('pointerdown', interactTransformStart);
document.addEventListener('pointermove', interactTransformMove);
document.addEventListener('pointerup', interactTransformEnd);

function nudgeMove(dx, dy) {
    if (!documentCreated) return;
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;

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

    if (!hasSel) {
        const temp = document.createElement('canvas');
        temp.width = documentWidth;
        temp.height = documentHeight;
        temp.getContext('2d').drawImage(activeObj.canvas, 0, 0);

        activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
        activeObj.ctx.drawImage(temp, dx, dy);
        updateLayerThumbnail(activeObj.id);
        saveState();
        return;
    }

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w <= 0 || h <= 0) return;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    const cropData = cropCtx.createImageData(w, h);

    const srcData = activeObj.ctx.getImageData(0, 0, documentWidth, documentHeight);

    const erasedCanvas = document.createElement('canvas');
    erasedCanvas.width = documentWidth;
    erasedCanvas.height = documentHeight;
    const erCtx = erasedCanvas.getContext('2d', { willReadFrequently: true });
    const erData = erCtx.createImageData(documentWidth, documentHeight);

    for (let y = 0; y < documentHeight; y++) {
        for (let x = 0; x < documentWidth; x++) {
            const i = y * documentWidth + x;
            const px = i * 4;
            const selVal = selectionMask[i];

            if (selVal > 0 && x >= minX && x <= maxX && y >= minY && y <= maxY) {
                const destIdx = ((y - minY) * w + (x - minX)) * 4;
                cropData.data[destIdx] = srcData.data[px];
                cropData.data[destIdx + 1] = srcData.data[px + 1];
                cropData.data[destIdx + 2] = srcData.data[px + 2];
                const factor = selVal / 255;
                cropData.data[destIdx + 3] = Math.floor(srcData.data[px + 3] * factor);

                erData.data[px] = srcData.data[px];
                erData.data[px + 1] = srcData.data[px + 1];
                erData.data[px + 2] = srcData.data[px + 2];
                erData.data[px + 3] = Math.max(0, srcData.data[px + 3] - cropData.data[destIdx + 3]);
            } else {
                erData.data[px] = srcData.data[px];
                erData.data[px + 1] = srcData.data[px + 1];
                erData.data[px + 2] = srcData.data[px + 2];
                erData.data[px + 3] = srcData.data[px + 3];
            }
        }
    }
    cropCtx.putImageData(cropData, 0, 0);
    erCtx.putImageData(erData, 0, 0);

    activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
    activeObj.ctx.drawImage(erasedCanvas, 0, 0);
    activeObj.ctx.drawImage(cropCanvas, minX + dx, minY + dy);

    const oldMask = new Uint8Array(selectionMask);
    selectionMask.fill(0);
    for (let y = 0; y < documentHeight; y++) {
        for (let x = 0; x < documentWidth; x++) {
            const sx = x - dx;
            const sy = y - dy;
            if (sx >= 0 && sx < documentWidth && sy >= 0 && sy < documentHeight) {
                selectionMask[y * documentWidth + x] = oldMask[sy * documentWidth + sx];
            }
        }
    }

    renderSelectionVisual();
    updateLayerThumbnail(activeObj.id);
    saveState();
}

transformBox.addEventListener('dblclick', applyTransform);

document.addEventListener('keydown', (e) => {
    if (isTransforming) {
        if (e.key === 'Escape') cancelTransform();
        else if (e.key === 'Enter') applyTransform();
        else if (e.key === 'ArrowUp') { e.preventDefault(); transformBaseY -= e.shiftKey ? 10 : 1; updateTransformUI(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); transformBaseY += e.shiftKey ? 10 : 1; updateTransformUI(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); transformBaseX -= e.shiftKey ? 10 : 1; updateTransformUI(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); transformBaseX += e.shiftKey ? 10 : 1; updateTransformUI(); }
    } else {
        if (e.key.toLowerCase() === 't' && e.ctrlKey && e.altKey) {
            e.preventDefault();
            startTransform();
        } else if (currentTool === 'move' && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            let dx = 0, dy = 0;
            let amt = e.shiftKey ? 10 : 1;
            if (e.key === 'ArrowUp') dy = -amt;
            else if (e.key === 'ArrowDown') dy = amt;
            else if (e.key === 'ArrowLeft') dx = -amt;
            else if (e.key === 'ArrowRight') dx = amt;

            nudgeMove(dx, dy);
        }
    }
});
