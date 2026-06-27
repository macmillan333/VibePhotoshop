// --- Panel Resizer Logic ---
let isResizingPanel = false;

layersResizer.addEventListener('pointerdown', (e) => {
    isResizingPanel = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
});

document.addEventListener('pointermove', (e) => {
    if (showRulers && documentCreated) {
        const workspaceRect = document.getElementById('workspace').getBoundingClientRect();
        if (e.clientX >= workspaceRect.left && e.clientX <= workspaceRect.right &&
            e.clientY >= workspaceRect.top && e.clientY <= workspaceRect.bottom) {
            
            const x = e.clientX - workspaceRect.left;
            const y = e.clientY - workspaceRect.top;
            
            rulerMarkerX.style.transform = `translateX(${x}px)`;
            rulerMarkerY.style.transform = `translateY(${y}px)`;
            
            // Only show markers when inside the actual workspace content area (below properties bar, right of left ruler)
            if (y > 44) rulerMarkerX.classList.remove('hidden');
            else rulerMarkerX.classList.add('hidden');
            
            if (x > 20) rulerMarkerY.classList.remove('hidden');
            else rulerMarkerY.classList.add('hidden');
        } else {
            rulerMarkerX.classList.add('hidden');
            rulerMarkerY.classList.add('hidden');
        }
    }

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

        let hasSel = hasSelection();

        e.preventDefault();

        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            executeFill(fgColor, activeObj, hasSel);
        } else if ((e.ctrlKey || e.metaKey) && !e.altKey) {
            executeFill(bgColor, activeObj, hasSel);
        } else if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            executeClear(activeObj, hasSel);
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

            let hasSel = hasSelection();

            clipboardData = document.createElement('canvas');
            clipboardData.width = documentWidth;
            clipboardData.height = documentHeight;
            const clipCtx = clipboardData.getContext('2d');

            if (!hasSel) {
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

            let hasSel = hasSelection();

            clipboardData = document.createElement('canvas');
            clipboardData.width = documentWidth;
            clipboardData.height = documentHeight;
            const clipCtx = clipboardData.getContext('2d');

            if (!hasSel) {
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
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'x' || e.key === 'X') {
            e.preventDefault();
            btnSwapColors.click();
        } else if (e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            btnResetColors.click();
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
    if (!imageDropdown.classList.contains('hidden')) toggleMenu(imageMenuBtn, imageDropdown);
    if (!viewDropdown.classList.contains('hidden')) toggleMenu(viewMenuBtn, viewDropdown);
    if (!selectDropdown.classList.contains('hidden')) toggleMenu(selectMenuBtn, selectDropdown);
    toggleMenu(fileMenuBtn, fileDropdown);
});

editMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!fileDropdown.classList.contains('hidden')) toggleMenu(fileMenuBtn, fileDropdown);
    if (!imageDropdown.classList.contains('hidden')) toggleMenu(imageMenuBtn, imageDropdown);
    if (!viewDropdown.classList.contains('hidden')) toggleMenu(viewMenuBtn, viewDropdown);
    if (!selectDropdown.classList.contains('hidden')) toggleMenu(selectMenuBtn, selectDropdown);
    toggleMenu(editMenuBtn, editDropdown);
});

imageMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!fileDropdown.classList.contains('hidden')) toggleMenu(fileMenuBtn, fileDropdown);
    if (!editDropdown.classList.contains('hidden')) toggleMenu(editMenuBtn, editDropdown);
    if (!viewDropdown.classList.contains('hidden')) toggleMenu(viewMenuBtn, viewDropdown);
    if (!selectDropdown.classList.contains('hidden')) toggleMenu(selectMenuBtn, selectDropdown);
    toggleMenu(imageMenuBtn, imageDropdown);
});

viewMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!fileDropdown.classList.contains('hidden')) toggleMenu(fileMenuBtn, fileDropdown);
    if (!editDropdown.classList.contains('hidden')) toggleMenu(editMenuBtn, editDropdown);
    if (!imageDropdown.classList.contains('hidden')) toggleMenu(imageMenuBtn, imageDropdown);
    if (!selectDropdown.classList.contains('hidden')) toggleMenu(selectMenuBtn, selectDropdown);
    toggleMenu(viewMenuBtn, viewDropdown);
});

selectMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!fileDropdown.classList.contains('hidden')) toggleMenu(fileMenuBtn, fileDropdown);
    if (!editDropdown.classList.contains('hidden')) toggleMenu(editMenuBtn, editDropdown);
    if (!imageDropdown.classList.contains('hidden')) toggleMenu(imageMenuBtn, imageDropdown);
    if (!viewDropdown.classList.contains('hidden')) toggleMenu(viewMenuBtn, viewDropdown);
    toggleMenu(selectMenuBtn, selectDropdown);
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
    if (!imageMenuBtn.contains(e.target) && !imageDropdown.contains(e.target)) {
        imageDropdown.classList.add('hidden');
        imageMenuBtn.classList.remove('active');
    }
    if (!viewMenuBtn.contains(e.target) && !viewDropdown.contains(e.target)) {
        viewDropdown.classList.add('hidden');
        viewMenuBtn.classList.remove('active');
    }
    if (!selectMenuBtn.contains(e.target) && !selectDropdown.contains(e.target)) {
        selectDropdown.classList.add('hidden');
        selectMenuBtn.classList.remove('active');
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

imageDropdown.addEventListener('click', () => {
    imageDropdown.classList.add('hidden');
    imageMenuBtn.classList.remove('active');
});

viewDropdown.addEventListener('click', (e) => {
    // Let buttons inside handle closing if needed, to avoid closing when clicking toggle
    // We will let the specific button handler close the dropdown
});

selectDropdown.addEventListener('click', () => {
    selectDropdown.classList.add('hidden');
    selectMenuBtn.classList.remove('active');
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

// Image Menu Action Handlers
btnBlur.addEventListener('click', () => {
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) {
        showToast("Please select a visible layer to blur.");
        return;
    }
    
    isBlurActive = true;
    blurOriginalLayerData = activeObj.ctx.getImageData(0, 0, documentWidth, documentHeight);
    
    blurRadiusSlider.value = 5;
    blurRadiusInput.value = 5;
    
    applyGaussianBlurPreview(5);
    blurModal.showModal();
});

btnCancelBlur.addEventListener('click', () => {
    isBlurActive = false;
    const activeObj = getActiveLayerObj();
    if (activeObj && blurOriginalLayerData) {
        activeObj.ctx.putImageData(blurOriginalLayerData, 0, 0);
        updateLayerThumbnail(activeObj.id);
    }
    blurOriginalLayerData = null;
    blurModal.close();
});

blurForm.addEventListener('submit', (e) => {
    e.preventDefault();
    isBlurActive = false;
    blurOriginalLayerData = null;
    saveState();
    blurModal.close();
});

blurRadiusSlider.addEventListener('input', (e) => {
    blurRadiusInput.value = e.target.value;
});

blurRadiusSlider.addEventListener('change', (e) => {
    applyGaussianBlurPreview(Number(e.target.value));
});

blurRadiusInput.addEventListener('input', (e) => {
    let val = Number(e.target.value);
    if (val < 0) val = 0;
    blurRadiusSlider.value = val;
    applyGaussianBlurPreview(val);
});

btnHsl.addEventListener('click', () => {
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) {
        showToast("Please select a visible layer to adjust.");
        return;
    }
    
    isHslActive = true;
    hslOriginalLayerData = activeObj.ctx.getImageData(0, 0, documentWidth, documentHeight);
    
    hslHueSlider.value = 0;
    hslHueInput.value = 0;
    hslSatSlider.value = 0;
    hslSatInput.value = 0;
    hslLightSlider.value = 0;
    hslLightInput.value = 0;
    
    applyHSLPreview(0, 0, 0);
    hslModal.showModal();
});

btnCancelHsl.addEventListener('click', () => {
    isHslActive = false;
    const activeObj = getActiveLayerObj();
    if (activeObj && hslOriginalLayerData) {
        activeObj.ctx.putImageData(hslOriginalLayerData, 0, 0);
        updateLayerThumbnail(activeObj.id);
    }
    hslOriginalLayerData = null;
    hslModal.close();
});

hslForm.addEventListener('submit', (e) => {
    e.preventDefault();
    isHslActive = false;
    hslOriginalLayerData = null;
    saveState();
    hslModal.close();
});

function handleHslChange() {
    const hue = Number(hslHueInput.value);
    const sat = Number(hslSatInput.value);
    const light = Number(hslLightInput.value);
    applyHSLPreview(hue, sat, light);
}

hslHueSlider.addEventListener('input', (e) => {
    hslHueInput.value = e.target.value;
});
hslHueSlider.addEventListener('change', handleHslChange);
hslHueInput.addEventListener('input', (e) => {
    let val = Number(e.target.value);
    if (val < -180) val = -180;
    if (val > 180) val = 180;
    hslHueSlider.value = val;
    handleHslChange();
});

hslSatSlider.addEventListener('input', (e) => {
    hslSatInput.value = e.target.value;
});
hslSatSlider.addEventListener('change', handleHslChange);
hslSatInput.addEventListener('input', (e) => {
    let val = Number(e.target.value);
    if (val < -100) val = -100;
    if (val > 100) val = 100;
    hslSatSlider.value = val;
    handleHslChange();
});

hslLightSlider.addEventListener('input', (e) => {
    hslLightInput.value = e.target.value;
});
hslLightSlider.addEventListener('change', handleHslChange);
hslLightInput.addEventListener('input', (e) => {
    let val = Number(e.target.value);
    if (val < -100) val = -100;
    if (val > 100) val = 100;
    hslLightSlider.value = val;
    handleHslChange();
});

// View Menu Action Handlers
btnGuides.addEventListener('click', () => {
    guidesModal.showModal();
});

btnCancelGuides.addEventListener('click', () => {
    guidesModal.close();
});

guidesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    documentGuides = { horizontal: [], vertical: [] };
    
    function parseGuides(mode, valueStr, size) {
        let guidesList = [];
        if (mode === 'none' || !valueStr.trim()) return guidesList;
        
        if (mode === 'evenly-spaced') {
            const count = Math.max(1, parseInt(valueStr) || 0);
            if (count > 0) {
                const step = size / (count + 1);
                for (let i = 1; i <= count; i++) {
                    guidesList.push(Math.round(step * i));
                }
            }
        } else {
            const parts = valueStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
            for (let val of parts) {
                if (mode === 'percent') {
                    const p = Math.max(0, Math.min(100, val)) / 100;
                    guidesList.push(Math.round(size * p));
                } else { // pixels
                    guidesList.push(Math.round(val));
                }
            }
        }
        return guidesList;
    }

    const hMode = document.querySelector('input[name="guide-h-mode"]:checked').value;
    const vMode = document.querySelector('input[name="guide-v-mode"]:checked').value;

    documentGuides.horizontal = parseGuides(hMode, guideHValue.value, documentHeight);
    documentGuides.vertical = parseGuides(vMode, guideVValue.value, documentWidth);
    
    drawGuides();
    guidesModal.close();
});

function updateGuideInputState(modeName, valueInput) {
    const mode = document.querySelector(`input[name="${modeName}"]:checked`).value;
    if (mode === 'none') {
        valueInput.disabled = true;
        valueInput.value = '';
    } else {
        valueInput.disabled = false;
        if (mode === 'evenly-spaced') {
            valueInput.type = 'number';
            valueInput.min = '1';
            valueInput.placeholder = 'e.g. 4';
        } else {
            valueInput.type = 'text';
            valueInput.removeAttribute('min');
            valueInput.placeholder = 'e.g. 10, 50, 100';
        }
    }
}

document.querySelectorAll('input[name="guide-h-mode"]').forEach(r => {
    r.addEventListener('change', () => updateGuideInputState('guide-h-mode', guideHValue));
});
document.querySelectorAll('input[name="guide-v-mode"]').forEach(r => {
    r.addEventListener('change', () => updateGuideInputState('guide-v-mode', guideVValue));
});

btnToggleRulers.addEventListener('click', (e) => {
    e.stopPropagation();
    showRulers = !showRulers;
    if (showRulers) {
        rulersCheckmark.style.opacity = '1';
        rulerTopCanvas.classList.remove('hidden');
        rulerLeftCanvas.classList.remove('hidden');
        if (typeof drawRulers === 'function') drawRulers();
    } else {
        rulersCheckmark.style.opacity = '0';
        rulerTopCanvas.classList.add('hidden');
        rulerLeftCanvas.classList.add('hidden');
        rulerMarkerX.classList.add('hidden');
        rulerMarkerY.classList.add('hidden');
    }
    viewDropdown.classList.add('hidden');
    viewMenuBtn.classList.remove('active');
});

window.addEventListener('resize', () => {
    if (showRulers && typeof drawRulers === 'function') {
        drawRulers();
    }
});

// Select Menu Action Handlers
btnExpandSelection.addEventListener('click', () => {
    if (!hasSelection()) {
        showToast("No selection to expand.");
        return;
    }
    document.getElementById('expand-pixels').value = 1;
    expandSelectionModal.showModal();
});

btnCancelExpandSelection.addEventListener('click', () => expandSelectionModal.close());

expandSelectionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = parseInt(document.getElementById('expand-pixels').value, 10);
    expandSelectionModal.close();
    if (p > 0) {
        expandSelection(p);
    }
});

btnContractSelection.addEventListener('click', () => {
    if (!hasSelection()) {
        showToast("No selection to contract.");
        return;
    }
    document.getElementById('contract-pixels').value = 1;
    contractSelectionModal.showModal();
});

btnCancelContractSelection.addEventListener('click', () => contractSelectionModal.close());

contractSelectionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = parseInt(document.getElementById('contract-pixels').value, 10);
    contractSelectionModal.close();
    if (p > 0) {
        contractSelection(p);
    }
});

btnBorderSelection.addEventListener('click', () => {
    if (!hasSelection()) {
        showToast("No selection to border.");
        return;
    }
    document.getElementById('border-pixels').value = 1;
    borderSelectionModal.showModal();
});

btnCancelBorderSelection.addEventListener('click', () => borderSelectionModal.close());

borderSelectionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = parseInt(document.getElementById('border-pixels').value, 10);
    borderSelectionModal.close();
    if (p > 0) {
        borderSelection(p);
    }
});

btnFeatherSelection.addEventListener('click', () => {
    if (!hasSelection()) {
        showToast("No selection to feather.");
        return;
    }
    document.getElementById('feather-pixels').value = 5;
    featherSelectionModal.showModal();
});

btnCancelFeatherSelection.addEventListener('click', () => featherSelectionModal.close());

featherSelectionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = parseInt(document.getElementById('feather-pixels').value, 10);
    featherSelectionModal.close();
    if (p > 0) {
        featherSelection(p);
    }
});

btnColorRangeSelection.addEventListener('click', () => {
    isColorRangeActive = true;
    canvasStack.classList.add('color-range-active');
    
    const r = parseInt(fgColor.slice(1, 3), 16) || 0;
    const g = parseInt(fgColor.slice(3, 5), 16) || 0;
    const b = parseInt(fgColor.slice(5, 7), 16) || 0;
    colorRangeSampledColor = { r, g, b };
    
    colorRangeFuzzinessValue = parseInt(colorRangeFuzziness.value, 10);
    updateColorRangePreview();
    colorRangeModal.show();
});

btnCancelColorRange.addEventListener('click', () => {
    isColorRangeActive = false;
    canvasStack.classList.remove('color-range-active');
    colorRangeModal.close();
});

colorRangeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    isColorRangeActive = false;
    canvasStack.classList.remove('color-range-active');
    colorRangeModal.close();
    applyColorRangeSelection();
});

colorRangeFuzziness.addEventListener('input', (e) => {
    colorRangeFuzzinessValue = parseInt(e.target.value, 10);
    colorRangeFuzzinessVal.textContent = colorRangeFuzzinessValue;
    updateColorRangePreview();
});

// --- Flip Operations ---
function executeFlip(flipH, flipV) {
    if (isTransforming) return;
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;

    const bounds = getSelectionBounds();
    let { hasSelection: hasSel, minX, minY, maxX, maxY } = bounds;

    if (!hasSel) {
        minX = 0; minY = 0; maxX = documentWidth - 1; maxY = documentHeight - 1;
    }

    if (maxX < minX || maxY < minY) return;

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    const res = extractSelectionRegion(activeObj.ctx, hasSel, minX, minY, maxX, maxY);

    activeObj.ctx.clearRect(0, 0, documentWidth, documentHeight);
    activeObj.ctx.drawImage(res.erasedCanvas, 0, 0);

    const cx = minX + w / 2;
    const cy = minY + h / 2;

    activeObj.ctx.save();
    activeObj.ctx.translate(cx, cy);
    activeObj.ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    activeObj.ctx.drawImage(res.floatingCanvas, -w / 2, -h / 2, w, h);
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

// --- Color Picker Events ---
let _fgColorSavedSelection = null;

function openCustomColorPicker(target) {
    cpActiveTarget = target;
    const colorHex = target === 'fg' ? fgColor : bgColor;
    const [r, g, b] = hexToRgb(colorHex);
    const [h, s, v] = rgbToHsv(r, g, b);
    
    cpCurrentH = h;
    cpCurrentS = s;
    cpCurrentV = v;

    cpCurrentSwatch.style.backgroundColor = colorHex;
    updateColorPickerUI(false);

    if (isTypingText && target === 'fg') {
        const sel = window.getSelection();
        if (sel.rangeCount > 0 && textEditor.contains(sel.anchorNode)) {
            _fgColorSavedSelection = sel.getRangeAt(0).cloneRange();
        }
    }
    cpModal.showModal();
}

fgColorInput.addEventListener('click', () => openCustomColorPicker('fg'));
bgColorInput.addEventListener('click', () => openCustomColorPicker('bg'));

btnSwapColors.addEventListener('click', () => {
    const temp = fgColor;
    fgColor = bgColor;
    bgColor = temp;
    fgColorInput.style.backgroundColor = fgColor;
    bgColorInput.style.backgroundColor = bgColor;
    if (typeof updateBrushStamp === 'function') updateBrushStamp();
});

btnResetColors.addEventListener('click', () => {
    fgColor = '#000000';
    bgColor = '#ffffff';
    fgColorInput.style.backgroundColor = fgColor;
    bgColorInput.style.backgroundColor = bgColor;
    if (typeof updateBrushStamp === 'function') updateBrushStamp();
});

// --- Ruler Drag (Create Guide) ---
function handleRulerPointerMove(e) {
    if (!isDraggingGuide) return;
    const coords = getExactCanvasCoords(e, false);
    if (dragGuideType === 'horizontal') {
        documentGuides.horizontal[dragGuideIndex] = Math.round(coords.y);
    } else {
        documentGuides.vertical[dragGuideIndex] = Math.round(coords.x);
    }
    drawGuides();
}

function handleRulerPointerUp(e) {
    if (!isDraggingGuide) return;
    try { e.target.releasePointerCapture(e.pointerId); } catch (err) { }
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
}

rulerTopCanvas.addEventListener('pointerdown', (e) => {
    if (!documentCreated || e.button !== 0) return;
    const coords = getExactCanvasCoords(e, false);
    documentGuides.horizontal.push(Math.round(coords.y));
    isDraggingGuide = true;
    dragGuideType = 'horizontal';
    dragGuideIndex = documentGuides.horizontal.length - 1;
    rulerTopCanvas.setPointerCapture(e.pointerId);
});
rulerTopCanvas.addEventListener('pointermove', handleRulerPointerMove);
rulerTopCanvas.addEventListener('pointerup', handleRulerPointerUp);

rulerLeftCanvas.addEventListener('pointerdown', (e) => {
    if (!documentCreated || e.button !== 0) return;
    const coords = getExactCanvasCoords(e, false);
    documentGuides.vertical.push(Math.round(coords.x));
    isDraggingGuide = true;
    dragGuideType = 'vertical';
    dragGuideIndex = documentGuides.vertical.length - 1;
    rulerLeftCanvas.setPointerCapture(e.pointerId);
});
rulerLeftCanvas.addEventListener('pointermove', handleRulerPointerMove);
rulerLeftCanvas.addEventListener('pointerup', handleRulerPointerUp);

// --- Custom Color Picker Implementation ---
let cpIsDraggingSV = false;
let cpIsDraggingHue = false;

function updateColorPickerUI(fromInputs) {
    cpCurrentH = Math.max(0, Math.min(360, cpCurrentH || 0));
    cpCurrentS = Math.max(0, Math.min(100, cpCurrentS || 0));
    cpCurrentV = Math.max(0, Math.min(100, cpCurrentV || 0));

    const [r, g, b] = hsvToRgb(cpCurrentH, cpCurrentS, cpCurrentV);
    const hex = rgbToHex(r, g, b);

    cpNewSwatch.style.backgroundColor = hex;

    if (!fromInputs) {
        cpInputH.value = Math.round(cpCurrentH);
        cpInputS.value = Math.round(cpCurrentS);
        cpInputV.value = Math.round(cpCurrentV);
        cpInputR.value = Math.round(r);
        cpInputG.value = Math.round(g);
        cpInputB.value = Math.round(b);
        cpInputHex.value = hex.substring(1);
    }

    cpSvCursor.style.left = `${cpCurrentS}%`;
    cpSvCursor.style.top = `${100 - cpCurrentV}%`;
    cpHueCursor.style.top = `${(cpCurrentH / 360) * 100}%`;

    renderColorPickerCanvases();
}

function renderColorPickerCanvases() {
    const svCtx = cpSvCanvas.getContext('2d', { willReadFrequently: true });
    const width = cpSvCanvas.width;
    const height = cpSvCanvas.height;

    const [hr, hg, hb] = hsvToRgb(cpCurrentH, 100, 100);
    svCtx.fillStyle = `rgb(${hr}, ${hg}, ${hb})`;
    svCtx.fillRect(0, 0, width, height);

    const whiteGrad = svCtx.createLinearGradient(0, 0, width, 0);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    svCtx.fillStyle = whiteGrad;
    svCtx.fillRect(0, 0, width, height);

    const blackGrad = svCtx.createLinearGradient(0, 0, 0, height);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    svCtx.fillStyle = blackGrad;
    svCtx.fillRect(0, 0, width, height);

    const hueCtx = cpHueCanvas.getContext('2d', { willReadFrequently: true });
    const hWidth = cpHueCanvas.width;
    const hHeight = cpHueCanvas.height;
    const hueGrad = hueCtx.createLinearGradient(0, 0, 0, hHeight);
    hueGrad.addColorStop(0, '#ff0000');
    hueGrad.addColorStop(1/6, '#ffff00');
    hueGrad.addColorStop(2/6, '#00ff00');
    hueGrad.addColorStop(3/6, '#00ffff');
    hueGrad.addColorStop(4/6, '#0000ff');
    hueGrad.addColorStop(5/6, '#ff00ff');
    hueGrad.addColorStop(1, '#ff0000');
    hueCtx.fillStyle = hueGrad;
    hueCtx.fillRect(0, 0, hWidth, hHeight);
}

function handleSvDrag(e) {
    if (!cpIsDraggingSV) return;
    const rect = cpSvContainer.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    x = Math.max(0, Math.min(rect.width, x));
    y = Math.max(0, Math.min(rect.height, y));
    cpCurrentS = (x / rect.width) * 100;
    cpCurrentV = 100 - (y / rect.height) * 100;
    updateColorPickerUI(false);
}

cpSvContainer.addEventListener('pointerdown', (e) => {
    cpIsDraggingSV = true;
    try { cpSvContainer.setPointerCapture(e.pointerId); } catch(e){}
    handleSvDrag(e);
});
cpSvContainer.addEventListener('pointermove', handleSvDrag);
cpSvContainer.addEventListener('pointerup', (e) => {
    cpIsDraggingSV = false;
    try { cpSvContainer.releasePointerCapture(e.pointerId); } catch(e){}
});

function handleHueDrag(e) {
    if (!cpIsDraggingHue) return;
    const rect = cpHueContainer.getBoundingClientRect();
    let y = e.clientY - rect.top;
    y = Math.max(0, Math.min(rect.height, y));
    cpCurrentH = (y / rect.height) * 360;
    if (cpCurrentH === 360) cpCurrentH = 0;
    updateColorPickerUI(false);
}

cpHueContainer.addEventListener('pointerdown', (e) => {
    cpIsDraggingHue = true;
    try { cpHueContainer.setPointerCapture(e.pointerId); } catch(e){}
    handleHueDrag(e);
});
cpHueContainer.addEventListener('pointermove', handleHueDrag);
cpHueContainer.addEventListener('pointerup', (e) => {
    cpIsDraggingHue = false;
    try { cpHueContainer.releasePointerCapture(e.pointerId); } catch(e){}
});

function updateFromInputs() {
    const r = parseInt(cpInputR.value) || 0;
    const g = parseInt(cpInputG.value) || 0;
    const b = parseInt(cpInputB.value) || 0;
    const [h, s, v] = rgbToHsv(r, g, b);
    cpCurrentH = h;
    cpCurrentS = s;
    cpCurrentV = v;
    updateColorPickerUI(true);
    cpNewSwatch.style.backgroundColor = rgbToHex(r, g, b);
}
cpInputR.addEventListener('input', updateFromInputs);
cpInputG.addEventListener('input', updateFromInputs);
cpInputB.addEventListener('input', updateFromInputs);

function updateFromHsvInputs() {
    cpCurrentH = parseFloat(cpInputH.value) || 0;
    cpCurrentS = parseFloat(cpInputS.value) || 0;
    cpCurrentV = parseFloat(cpInputV.value) || 0;
    updateColorPickerUI(true);
    const [r, g, b] = hsvToRgb(cpCurrentH, cpCurrentS, cpCurrentV);
    cpNewSwatch.style.backgroundColor = rgbToHex(r, g, b);
}
cpInputH.addEventListener('input', updateFromHsvInputs);
cpInputS.addEventListener('input', updateFromHsvInputs);
cpInputV.addEventListener('input', updateFromHsvInputs);

cpInputHex.addEventListener('input', (e) => {
    let hex = e.target.value;
    if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
        const [r, g, b] = hexToRgb('#' + hex);
        const [h, s, v] = rgbToHsv(r, g, b);
        cpCurrentH = h;
        cpCurrentS = s;
        cpCurrentV = v;
        updateColorPickerUI(true);
        cpNewSwatch.style.backgroundColor = '#' + hex;
    }
});

btnCancelCp.addEventListener('click', () => cpModal.close());
cpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const [r, g, b] = hsvToRgb(cpCurrentH, cpCurrentS, cpCurrentV);
    const hex = rgbToHex(r, g, b);
    
    if (cpActiveTarget === 'fg') {
        fgColor = hex;
        fgColorInput.style.backgroundColor = hex;
        
        if (isTypingText && _fgColorSavedSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(_fgColorSavedSelection);
            if (!sel.isCollapsed) {
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('foreColor', false, fgColor);
            }
            _fgColorSavedSelection = null;
        }
    } else {
        bgColor = hex;
        bgColorInput.style.backgroundColor = hex;
    }
    
    if (typeof updateBrushStamp === 'function') updateBrushStamp();
    cpModal.close();
});
