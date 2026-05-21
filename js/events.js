// --- Panel Resizer Logic ---
let isResizingPanel = false;

layersResizer.addEventListener('pointerdown', (e) => {
    isResizingPanel = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
});

document.addEventListener('pointermove', (e) => {
    if (isResizingPanel) {
        let newWidth = sidebarRight.getBoundingClientRect().right - e.clientX;
        newWidth = Math.max(200, Math.min(600, newWidth));
        sidebarRight.style.width = `${newWidth}px`;
    }
});

document.addEventListener('pointerup', () => {
    if (isResizingPanel) {
        isResizingPanel = false;
        document.body.style.cursor = '';
    }
});


// --- Fill & Clear Operations ---
function executeFill(colorHex, activeObj, hasSelection) {
    let r = parseInt(colorHex.slice(1, 3), 16);
    let g = parseInt(colorHex.slice(3, 5), 16);
    let b = parseInt(colorHex.slice(5, 7), 16);

    if (!hasSelection) {
        activeObj.ctx.fillStyle = colorHex;
        activeObj.ctx.fillRect(0, 0, documentWidth, documentHeight);
    } else {
        const fillCanvas = document.createElement('canvas');
        fillCanvas.width = documentWidth;
        fillCanvas.height = documentHeight;
        const fillCtx = fillCanvas.getContext('2d');
        const fillData = fillCtx.createImageData(documentWidth, documentHeight);

        for (let i = 0; i < selectionMask.length; i++) {
            const selAlpha = selectionMask[i];
            if (selAlpha > 0) {
                const px = i * 4;
                fillData.data[px] = r;
                fillData.data[px + 1] = g;
                fillData.data[px + 2] = b;
                fillData.data[px + 3] = selAlpha;
            }
        }
        fillCtx.putImageData(fillData, 0, 0);
        activeObj.ctx.drawImage(fillCanvas, 0, 0);
    }
    updateLayerThumbnail(activeObj.id);
    saveState();
}

function executeClear(activeObj, hasSelection) {
    if (!hasSelection) {
        activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
    } else {
        const srcData = activeObj.ctx.getImageData(0, 0, documentWidth, documentHeight);
        for (let i = 0; i < selectionMask.length; i++) {
            const selAlpha = selectionMask[i];
            if (selAlpha > 0) {
                const px = i * 4;
                const factor = selAlpha / 255;
                const reduction = Math.floor(srcData.data[px + 3] * factor);
                srcData.data[px + 3] = Math.max(0, srcData.data[px + 3] - reduction);
            }
        }
        activeObj.ctx.putImageData(srcData, 0, 0);
    }
    updateLayerThumbnail(activeObj.id);
    saveState();
}

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;


    if (e.key === 'Alt') {
        canvasStack.classList.add('alt-down');
    }
    if (e.key === 'Shift') {
        canvasStack.classList.add('shift-down');
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObj = getActiveLayerObj();
        if (!activeObj || !activeObj.visible) return;

        let hasSelection = false;
        if (selectionMask) {
            for (let i = 0; i < selectionMask.length; i++) {
                if (selectionMask[i] > 0) { hasSelection = true; break; }
            }
        }

        e.preventDefault();

        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            executeFill(fgColor, activeObj, hasSelection);
        } else if ((e.ctrlKey || e.metaKey) && !e.altKey) {
            executeFill(bgColor, activeObj, hasSelection);
        } else if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            executeClear(activeObj, hasSelection);
        }
        return;
    }

    if (e.ctrlKey || e.metaKey) {
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            if (documentCreated) saveVpsFile();
        } else if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        } else if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            redo();
        } else if (e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            clearSelection();
            saveState();
        } else if (e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            selectionMask.fill(255);
            renderSelectionVisual();
            saveState();
        } else if (e.key === 'i' || e.key === 'I') {
            if (e.shiftKey) {
                e.preventDefault();
                for (let i = 0; i < selectionMask.length; i++) {
                    selectionMask[i] = 255 - selectionMask[i];
                }
                renderSelectionVisual();
                saveState();
            }
        } else if (e.key === 'c' || e.key === 'C') {
            e.preventDefault();
            const activeObj = getActiveLayerObj();
            if (!activeObj || !activeObj.visible) {
                showToast("Cannot copy from hidden/missing layer");
                return;
            }

            let hasSelection = false;
            for (let i = 0; i < selectionMask.length; i++) {
                if (selectionMask[i] > 0) { hasSelection = true; break; }
            }

            clipboardData = document.createElement('canvas');
            clipboardData.width = documentWidth;
            clipboardData.height = documentHeight;
            const clipCtx = clipboardData.getContext('2d');

            if (!hasSelection) {
                clipCtx.drawImage(activeObj.canvas, 0, 0);
            } else {
                const srcData = activeObj.ctx.getImageData(0, 0, documentWidth, documentHeight);
                const destData = clipCtx.createImageData(documentWidth, documentHeight);
                for (let i = 0; i < selectionMask.length; i++) {
                    const selAlpha = selectionMask[i];
                    if (selAlpha > 0) {
                        const px = i * 4;
                        destData.data[px] = srcData.data[px];
                        destData.data[px + 1] = srcData.data[px + 1];
                        destData.data[px + 2] = srcData.data[px + 2];
                        destData.data[px + 3] = Math.floor((srcData.data[px + 3] * selAlpha) / 255);
                    }
                }
                clipCtx.putImageData(destData, 0, 0);
            }
            showToast("Copied to clipboard");
        } else if (e.key === 'x' || e.key === 'X') {
            e.preventDefault();
            const activeObj = getActiveLayerObj();
            if (!activeObj || !activeObj.visible) {
                showToast("Cannot cut from hidden/missing layer");
                return;
            }

            let hasSelection = false;
            for (let i = 0; i < selectionMask.length; i++) {
                if (selectionMask[i] > 0) { hasSelection = true; break; }
            }

            clipboardData = document.createElement('canvas');
            clipboardData.width = documentWidth;
            clipboardData.height = documentHeight;
            const clipCtx = clipboardData.getContext('2d');

            if (!hasSelection) {
                clipCtx.drawImage(activeObj.canvas, 0, 0);
                activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
            } else {
                const srcData = activeObj.ctx.getImageData(0, 0, documentWidth, documentHeight);
                const destData = clipCtx.createImageData(documentWidth, documentHeight);
                for (let i = 0; i < selectionMask.length; i++) {
                    const selAlpha = selectionMask[i];
                    if (selAlpha > 0) {
                        const px = i * 4;
                        destData.data[px] = srcData.data[px];
                        destData.data[px + 1] = srcData.data[px + 1];
                        destData.data[px + 2] = srcData.data[px + 2];
                        destData.data[px + 3] = Math.floor((srcData.data[px + 3] * selAlpha) / 255);

                        const factor = selAlpha / 255;
                        const reduction = Math.floor(srcData.data[px + 3] * factor);
                        srcData.data[px + 3] = Math.max(0, srcData.data[px + 3] - reduction);
                    }
                }
                clipCtx.putImageData(destData, 0, 0);
                activeObj.ctx.putImageData(srcData, 0, 0);
            }
            updateLayerThumbnail(activeObj.id);
            saveState();
            showToast("Copied to clipboard");
        } else if (e.key === 'v' || e.key === 'V') {
            e.preventDefault();
            if (!clipboardData) {
                showToast("Clipboard is empty");
                return;
            }

            const newLayer = createLayer('Pasted Layer');
            newLayer.ctx.drawImage(clipboardData, 0, 0);
            updateLayerThumbnail(newLayer.id);
            saveState();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
        canvasStack.classList.remove('alt-down');
    }
    if (e.key === 'Shift') {
        canvasStack.classList.remove('shift-down');
    }
});

// --- Menu Logic ---
function toggleMenu(menuBtn, dropdown) {
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
        dropdown.classList.remove('hidden');
        menuBtn.classList.add('active');
    } else {
        dropdown.classList.add('hidden');
        menuBtn.classList.remove('active');
    }
}

fileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!editDropdown.classList.contains('hidden')) toggleMenu(editMenuBtn, editDropdown);
    toggleMenu(fileMenuBtn, fileDropdown);
});

editMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!fileDropdown.classList.contains('hidden')) toggleMenu(fileMenuBtn, fileDropdown);
    toggleMenu(editMenuBtn, editDropdown);
});

document.addEventListener('click', (e) => {
    if (!fileMenuBtn.contains(e.target) && !fileDropdown.contains(e.target)) {
        fileDropdown.classList.add('hidden');
        fileMenuBtn.classList.remove('active');
    }
    if (!editMenuBtn.contains(e.target) && !editDropdown.contains(e.target)) {
        editDropdown.classList.add('hidden');
        editMenuBtn.classList.remove('active');
    }
});

fileDropdown.addEventListener('click', () => {
    fileDropdown.classList.add('hidden');
    fileMenuBtn.classList.remove('active');
});

editDropdown.addEventListener('click', () => {
    editDropdown.classList.add('hidden');
    editMenuBtn.classList.remove('active');
});

// --- Actions ---

btnNew.addEventListener('click', () => {
    newCanvasModal.showModal();
});

btnCancelNew.addEventListener('click', () => {
    newCanvasModal.close();
});

newCanvasForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(newCanvasForm);
    const width = parseInt(formData.get('width'), 10);
    const height = parseInt(formData.get('height'), 10);

    if (width > 0 && height > 0) {
        currentFileName = 'untitled.vps';
        savedFileHandle = null;
        lastSavedHistoryIndex = -1;
        initDocument(width, height);
        newCanvasModal.close();
    }
});

// Edit Menu Action Handlers
btnImageSize.addEventListener('click', () => {
    document.getElementById('image-size-width').value = documentWidth;
    document.getElementById('image-size-height').value = documentHeight;
    imageSizeModal.showModal();
});

btnCancelImageSize.addEventListener('click', () => imageSizeModal.close());

imageSizeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const w = parseInt(document.getElementById('image-size-width').value, 10);
    const h = parseInt(document.getElementById('image-size-height').value, 10);
    resizeDocument(w, h, true);
    imageSizeModal.close();
});

btnCanvasSize.addEventListener('click', () => {
    document.getElementById('resize-canvas-width').value = documentWidth;
    document.getElementById('resize-canvas-height').value = documentHeight;
    canvasSizeModal.showModal();
});

btnCancelCanvasSize.addEventListener('click', () => canvasSizeModal.close());

anchorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        anchorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

canvasSizeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const w = parseInt(document.getElementById('resize-canvas-width').value, 10);
    const h = parseInt(document.getElementById('resize-canvas-height').value, 10);
    const activeAnchor = document.querySelector('.anchor-btn.active');
    const anchorStr = activeAnchor ? activeAnchor.dataset.anchor : 'center';
    resizeDocument(w, h, false, anchorStr);
    canvasSizeModal.close();
});

// --- Flip Operations ---
function executeFlip(flipH, flipV) {
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

    if (!hasSel) {
        minX = 0; minY = 0; maxX = documentWidth - 1; maxY = documentHeight - 1;
    }

    if (maxX < minX || maxY < minY) return;

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

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
            const selVal = hasSel ? selectionMask[i] : 255;

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

    const cx = minX + w / 2;
    const cy = minY + h / 2;

    activeObj.ctx.save();
    activeObj.ctx.translate(cx, cy);
    activeObj.ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    activeObj.ctx.drawImage(cropCanvas, -w / 2, -h / 2, w, h);
    activeObj.ctx.restore();

    if (hasSel) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        const mData = mCtx.createImageData(w, h);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const val = selectionMask[y * documentWidth + x];
                if (val > 0) {
                    const di = ((y - minY) * w + (x - minX)) * 4;
                    mData.data[di + 3] = val;
                }
            }
        }
        mCtx.putImageData(mData, 0, 0);

        const projCanvas = document.createElement('canvas');
        projCanvas.width = documentWidth;
        projCanvas.height = documentHeight;
        const pCtx = projCanvas.getContext('2d', { willReadFrequently: true });
        pCtx.translate(cx, cy);
        pCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        pCtx.drawImage(maskCanvas, -w / 2, -h / 2, w, h);

        const pData = pCtx.getImageData(0, 0, documentWidth, documentHeight);
        selectionMask.fill(0);
        for (let i = 0; i < selectionMask.length; i++) {
            selectionMask[i] = pData.data[i * 4 + 3];
        }
        renderSelectionVisual();
    }

    updateLayerThumbnail(activeObj.id);
    saveState();
}

btnFlipH.addEventListener('click', () => executeFlip(true, false));
btnFlipV.addEventListener('click', () => executeFlip(false, true));

btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redo);

btnFreeTransform.addEventListener('click', () => {
    startTransform();
});

// --- File: Open / Save (.vps) ---

btnOpen.addEventListener('click', () => {
    fileInputVps.click();
});

fileInputVps.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    openVpsFile(file);
    fileInputVps.value = '';
});

btnSave.addEventListener('click', () => {
    saveVpsFile();
});

btnSaveAs.addEventListener('click', () => {
    saveVpsFileAs();
});

// --- File: Import / Export (flat images) ---

btnImport.addEventListener('click', () => {
    fileInputImage.click();
});

fileInputImage.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    currentFileName = file.name.replace(/\.[^.]+$/, '') + '.vps';
    savedFileHandle = null;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
        initDocument(img.width, img.height, true);
        const layer = createLayer('Background');
        layer.ctx.drawImage(img, 0, 0);
        updateLayerThumbnail(layer.id);

        saveState();
        markDocumentClean();
        URL.revokeObjectURL(objectUrl);
    };

    img.onerror = () => {
        alert('Failed to load the selected image file.');
        URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
    fileInputImage.value = '';
});

btnExport.addEventListener('click', async () => {
    if (!documentCreated) return;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = documentWidth;
    outputCanvas.height = documentHeight;
    const outputCtx = outputCanvas.getContext('2d');

    for (let i = layers.length - 1; i >= 0; i--) {
        if (layers[i].visible) {
            outputCtx.drawImage(layers[i].canvas, 0, 0);
        }
    }

    const baseName = currentFileName.replace(/\.[^.]+$/, '');

    if ('showSaveFilePicker' in window && window.isSecureContext) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: baseName + '.png',
                types: [
                    {
                        description: 'PNG Image',
                        accept: { 'image/png': ['.png'] },
                    },
                    {
                        description: 'JPEG Image',
                        accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
                    },
                ],
            });

            // Determine mime type from the extension the user chose
            const fileName = handle.name.toLowerCase();
            const isJpeg = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
            const mimeType = isJpeg ? 'image/jpeg' : 'image/png';

            // For JPEG, composite onto a white background (no transparency)
            let exportCanvas = outputCanvas;
            if (isJpeg) {
                exportCanvas = document.createElement('canvas');
                exportCanvas.width = documentWidth;
                exportCanvas.height = documentHeight;
                const jpgCtx = exportCanvas.getContext('2d');
                jpgCtx.fillStyle = '#ffffff';
                jpgCtx.fillRect(0, 0, documentWidth, documentHeight);
                jpgCtx.drawImage(outputCanvas, 0, 0);
            }

            const blob = await new Promise(resolve =>
                exportCanvas.toBlob(resolve, mimeType, isJpeg ? 0.92 : undefined)
            );
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    // Fallback: download as PNG
    outputCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = baseName + '.png';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }, 'image/png');
});

// --- Unsaved Changes Warning ---
window.addEventListener('beforeunload', (e) => {
    if (isDocumentDirty()) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but setting returnValue is required.
        e.returnValue = '';
    }
});

// --- Spin Buttons Logic ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('spin-btn')) {
        const targetId = e.target.getAttribute('data-target');
        const stepStr = e.target.getAttribute('data-step');
        const step = parseFloat(stepStr);
        const input = document.getElementById(targetId);
        
        if (input) {
            const currentVal = parseFloat(input.value) || 0;
            let newVal = currentVal + step;
            
            // Respect min/max if they exist
            if (input.hasAttribute('min')) newVal = Math.max(parseFloat(input.getAttribute('min')), newVal);
            if (input.hasAttribute('max')) newVal = Math.min(parseFloat(input.getAttribute('max')), newVal);
            
            // Fix floating point precision
            const decimals = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
            newVal = parseFloat(newVal.toFixed(decimals));
            
            input.value = newVal;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
});
