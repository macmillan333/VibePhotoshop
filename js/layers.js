// --- Layer Management ---
function initDocument(w, h, skipBaseLayer = false) {
    documentWidth = w;
    documentHeight = h;
    documentCreated = true;

    layers.forEach(l => l.canvas.remove());
    layersList.innerHTML = '';
    layers = [];
    layerCounter = 0;
    activeLayerId = null;
    selectedLayerIds.clear();
    lastClickedLayerId = null;
    history = [];
    historyIndex = -1;

    // Reset Viewport
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;

    // Initialize Core Selection Engine Math
    selectionMask = new Uint8Array(documentWidth * documentHeight);

    if (selectionOverlay) selectionOverlay.remove();
    selectionOverlay = document.createElement('canvas');
    selectionOverlay.id = 'selection-overlay';
    selectionOverlay.width = documentWidth;
    selectionOverlay.height = documentHeight;
    selectionCtx = selectionOverlay.getContext('2d');
    canvasStack.appendChild(selectionOverlay);

    if (selectionDragOverlay) selectionDragOverlay.remove();
    selectionDragOverlay = document.createElement('canvas');
    selectionDragOverlay.id = 'selection-drag-overlay';
    selectionDragOverlay.width = documentWidth;
    selectionDragOverlay.height = documentHeight;
    selectionDragCtx = selectionDragOverlay.getContext('2d');
    canvasStack.appendChild(selectionDragOverlay);
    canvasStack.appendChild(transformBox);

    canvasStack.classList.add('active');
    canvasStack.style.width = `${w}px`;
    canvasStack.style.height = `${h}px`;
    canvasStack.style.aspectRatio = `${w} / ${h}`;
    canvasStack.style.transformOrigin = '0 0';
    applyViewport();

    noImageState.classList.add('hidden');
    btnSave.removeAttribute('disabled');
    btnSaveAs.removeAttribute('disabled');
    btnExport.removeAttribute('disabled');
    btnAddLayer.removeAttribute('disabled');
    btnUndo.removeAttribute('disabled');
    btnRedo.removeAttribute('disabled');
    btnImageSize.removeAttribute('disabled');
    btnCanvasSize.removeAttribute('disabled');
    btnFlipH.removeAttribute('disabled');
    btnFlipV.removeAttribute('disabled');
    btnFreeTransform.removeAttribute('disabled');

    if (!skipBaseLayer) {
        createLayer('Background');
        saveState();
        markDocumentClean();
    }
}

function setActiveLayer(id) {
    if (activeLayerId !== id) {
        activeLayerId = id;
    }

    const items = layersList.querySelectorAll('.layer-item');
    items.forEach(item => {
        const itemId = item.id.replace('list-item-', '');
        if (itemId === id) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }

        if (selectedLayerIds.has(itemId)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function getActiveLayerObj() {
    return layers.find(l => l.id === activeLayerId);
}

let draggedLayerId = null;

function createLayer(name = `Layer ${layerCounter + 1}`, type = 'pixel') {
    layerCounter++;
    const id = `layer-${layerCounter}`;

    const c = document.createElement('canvas');
    c.id = id;
    c.width = documentWidth;
    c.height = documentHeight;
    const cx = c.getContext('2d', { willReadFrequently: true });

    canvasStack.appendChild(c);

    // Selection visualization natively drops behind top layers conceptually 
    // to render on very top, we re-append it after standard DOM flow
    canvasStack.appendChild(selectionOverlay);
    canvasStack.appendChild(selectionDragOverlay);

    const layerObj = { id, name, canvas: c, ctx: cx, visible: true, type };
    if (type === 'text') {
        layerObj.textContent = '';
        layerObj.htmlContent = '';
        layerObj.textX = 0;
        layerObj.textY = 0;
    }
    layers.unshift(layerObj);

    selectedLayerIds.clear();
    selectedLayerIds.add(id);
    lastClickedLayerId = id;

    updateZIndices();
    renderLayersList();
    setActiveLayer(id);
    return layerObj;
}

function deleteLayer(id) {
    if (layers.length <= 1) return false;

    const layerObj = layers.find(l => l.id === id);
    if (!layerObj) return false;

    layerObj.canvas.remove();
    layers = layers.filter(l => l.id !== id);

    renderLayersList();

    if (activeLayerId === id) {
        const newTopId = layers[0].id;
        selectedLayerIds.clear();
        selectedLayerIds.add(newTopId);
        lastClickedLayerId = newTopId;
        setActiveLayer(newTopId);
    } else if (selectedLayerIds.has(id)) {
        selectedLayerIds.delete(id);
        if (selectedLayerIds.size === 0) {
            selectedLayerIds.add(activeLayerId);
        }
        setActiveLayer(activeLayerId);
    }
    return true;
}

function updateZIndices() {
    for (let i = 0; i < layers.length; i++) {
        layers[i].canvas.style.zIndex = (layers.length - i) * 10;
    }
}

function updateLayerThumbnail(layerId) {
    const item = document.getElementById(`list-item-${layerId}`);
    if (!item) return;

    const thumbCanvas = item.querySelector('.layer-thumb');
    const layerObj = layers.find(l => l.id === layerId);
    if (!thumbCanvas || !layerObj) return;

    const tCtx = thumbCanvas.getContext('2d');
    tCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);

    if (layerObj.type === 'text') {
        tCtx.fillStyle = '#ffffff';
        tCtx.font = '20px Inter, sans-serif';
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.fillText('T', thumbCanvas.width / 2, thumbCanvas.height / 2);
    } else {
        tCtx.drawImage(layerObj.canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
}

function renderLayersList() {
    layersList.innerHTML = '';
    layers.forEach((layer) => {
        const item = document.createElement('div');
        item.className = `layer-item`;
        if (layer.id === activeLayerId) item.classList.add('active');
        if (selectedLayerIds.has(layer.id)) item.classList.add('selected');

        if (!layer.visible) {
            item.classList.add('hidden-layer');
        }
        item.id = `list-item-${layer.id}`;
        item.draggable = true;

        const visBtn = document.createElement('button');
        visBtn.className = 'btn-icon';
        visBtn.title = 'Toggle Visibility';
        visBtn.innerHTML = layer.visible ? `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        ` : `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        `;

        const tcvs = document.createElement('canvas');
        tcvs.className = 'layer-thumb';
        tcvs.width = 32;
        tcvs.height = 32;

        const title = document.createElement('span');
        title.className = 'layer-name';
        title.textContent = layer.name;

        item.appendChild(visBtn);
        item.appendChild(tcvs);
        item.appendChild(title);

        visBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            layer.canvas.style.display = layer.visible ? 'block' : 'none';
            saveState();
            renderLayersList();
        });

        item.addEventListener('click', (e) => {
            if (visBtn.contains(e.target)) return;

            if (e.shiftKey && lastClickedLayerId) {
                const idx1 = layers.findIndex(l => l.id === lastClickedLayerId);
                const idx2 = layers.findIndex(l => l.id === layer.id);
                if (idx1 !== -1 && idx2 !== -1) {
                    const start = Math.min(idx1, idx2);
                    const end = Math.max(idx1, idx2);
                    selectedLayerIds.clear();
                    for (let i = start; i <= end; i++) {
                        selectedLayerIds.add(layers[i].id);
                    }
                }
            } else if (e.ctrlKey) {
                if (selectedLayerIds.has(layer.id)) {
                    selectedLayerIds.delete(layer.id);
                } else {
                    selectedLayerIds.add(layer.id);
                }
            } else {
                selectedLayerIds.clear();
                selectedLayerIds.add(layer.id);
            }

            lastClickedLayerId = layer.id;

            if (!selectedLayerIds.has(activeLayerId) && selectedLayerIds.size > 0) {
                setActiveLayer(Array.from(selectedLayerIds)[0]);
            } else {
                setActiveLayer(activeLayerId || layer.id);
            }
        });

        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!selectedLayerIds.has(layer.id)) {
                selectedLayerIds.clear();
                selectedLayerIds.add(layer.id);
                lastClickedLayerId = layer.id;
                setActiveLayer(layer.id);
            }

            ctxMergeSelected.disabled = selectedLayerIds.size < 2;

            let hasText = false;
            for (const selId of selectedLayerIds) {
                const l = layers.find(layer => layer.id === selId);
                if (l && l.type === 'text') hasText = true;
            }
            ctxRasterizeLayer.disabled = !hasText;

            layerContextMenu.classList.remove('hidden');
            layerContextMenu.style.left = `${e.clientX - layerContextMenu.offsetWidth}px`;
            layerContextMenu.style.top = `${e.clientY}px`;
        });

        title.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            title.contentEditable = true;
            setTimeout(() => {
                title.focus();
                const range = document.createRange();
                range.selectNodeContents(title);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }, 0);
        });

        function saveTitle() {
            title.contentEditable = false;
            const newName = title.textContent.trim() || 'Layer';
            if (newName !== layer.name) {
                layer.name = newName;
                saveState();
            }
            title.textContent = layer.name;
        }

        title.addEventListener('blur', saveTitle);
        title.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                title.blur();
            }
        });

        item.addEventListener('dragstart', (e) => {
            if (title.contentEditable === 'true') {
                e.preventDefault();
                return;
            }
            draggedLayerId = layer.id;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => item.style.opacity = '0.5', 0);
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            item.style.borderTop = '2px solid var(--accent)';
        });

        item.addEventListener('dragleave', () => {
            item.style.borderTop = '1px solid transparent';
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.style.borderTop = '1px solid transparent';
            if (!draggedLayerId || draggedLayerId === layer.id) return;

            const fromIdx = layers.findIndex(l => l.id === draggedLayerId);
            const toIdx = layers.findIndex(l => l.id === layer.id);

            const [moved] = layers.splice(fromIdx, 1);
            layers.splice(toIdx, 0, moved);

            updateZIndices();
            renderLayersList();
            saveState();
        });

        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
            draggedLayerId = null;
        });

        layersList.appendChild(item);
        updateLayerThumbnail(layer.id);
    });
    updateZIndices();
}

layersList.addEventListener('dragover', (e) => {
    if (e.target === layersList && draggedLayerId) {
        e.preventDefault();
        const lastChild = layersList.lastElementChild;
        if (lastChild) lastChild.style.borderBottom = '2px solid var(--accent)';
    }
});

layersList.addEventListener('dragleave', (e) => {
    if (e.target === layersList) {
        const lastChild = layersList.lastElementChild;
        if (lastChild) lastChild.style.borderBottom = '1px solid transparent';
    }
});

layersList.addEventListener('drop', (e) => {
    if (e.target === layersList && draggedLayerId) {
        e.preventDefault();
        const lastChild = layersList.lastElementChild;
        if (lastChild) lastChild.style.borderBottom = '1px solid transparent';

        const fromIdx = layers.findIndex(l => l.id === draggedLayerId);
        if (fromIdx !== -1 && fromIdx !== layers.length - 1) {
            const [moved] = layers.splice(fromIdx, 1);
            layers.push(moved);
            updateZIndices();
            renderLayersList();
            saveState();
        }
    }
});

btnAddLayer.addEventListener('click', () => {
    createLayer();
    saveState();
});

// --- Layer Context Menu Actions ---
document.addEventListener('click', (e) => {
    if (!layerContextMenu.contains(e.target)) {
        layerContextMenu.classList.add('hidden');
    }
});

ctxDuplicateLayer.addEventListener('click', () => {
    layerContextMenu.classList.add('hidden');
    const activeObj = getActiveLayerObj();
    if (!activeObj) return;

    const idx = layers.findIndex(l => l.id === activeObj.id);
    const newLayer = createLayer(activeObj.name + ' copy');
    const createdLayerObj = layers.shift();
    layers.splice(idx, 0, createdLayerObj);

    createdLayerObj.ctx.drawImage(activeObj.canvas, 0, 0);
    updateZIndices();
    renderLayersList();
    setActiveLayer(createdLayerObj.id);
    saveState();
});

ctxDeleteLayer.addEventListener('click', () => {
    layerContextMenu.classList.add('hidden');
    let deleted = false;
    const idsToDelete = Array.from(selectedLayerIds);

    for (let delId of idsToDelete) {
        if (layers.length <= 1) break;
        const layerObj = layers.find(l => l.id === delId);
        if (layerObj) {
            layerObj.canvas.remove();
            layers = layers.filter(l => l.id !== delId);
            deleted = true;
        }
    }

    if (deleted) {
        selectedLayerIds.clear();
        const topId = layers[0].id;
        selectedLayerIds.add(topId);
        lastClickedLayerId = topId;
        setActiveLayer(topId);
        renderLayersList();
        saveState();
    }
});

ctxRasterizeLayer.addEventListener('click', () => {
    layerContextMenu.classList.add('hidden');
    let changed = false;
    for (const id of selectedLayerIds) {
        const layer = layers.find(l => l.id === id);
        if (layer && layer.type === 'text') {
            layer.type = 'pixel';
            delete layer.textContent;
            delete layer.htmlContent;
            delete layer.textX;
            delete layer.textY;
            updateLayerThumbnail(layer.id);
            changed = true;
        }
    }
    if (changed) {
        renderLayersList();
        saveState();
    }
});

ctxMergeSelected.addEventListener('click', () => {
    layerContextMenu.classList.add('hidden');
    if (selectedLayerIds.size < 2) return;

    const sortedSelectedLayers = [];
    let topmostIndex = layers.length;

    for (let i = layers.length - 1; i >= 0; i--) {
        if (selectedLayerIds.has(layers[i].id)) {
            sortedSelectedLayers.push(layers[i]);
            if (i < topmostIndex) topmostIndex = i;
        }
    }

    const topmostName = layers[topmostIndex].name;

    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = documentWidth;
    mergedCanvas.height = documentHeight;
    const mCtx = mergedCanvas.getContext('2d', { willReadFrequently: true });

    for (const lObj of sortedSelectedLayers) {
        if (lObj.visible) {
            mCtx.drawImage(lObj.canvas, 0, 0);
        }
    }

    for (const lObj of sortedSelectedLayers) {
        lObj.canvas.remove();
    }

    layers = layers.filter(l => !selectedLayerIds.has(l.id));

    layerCounter++;
    const newId = `layer-${layerCounter}`;
    const c = document.createElement('canvas');
    c.id = newId;
    c.width = documentWidth;
    c.height = documentHeight;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(mergedCanvas, 0, 0);

    canvasStack.appendChild(c);
    canvasStack.appendChild(selectionOverlay);
    canvasStack.appendChild(selectionDragOverlay);
    canvasStack.appendChild(transformBox);

    const newLayerObj = { id: newId, name: topmostName, canvas: c, ctx: cx, visible: true };

    layers.splice(topmostIndex, 0, newLayerObj);

    selectedLayerIds.clear();
    selectedLayerIds.add(newId);
    lastClickedLayerId = newId;

    updateZIndices();
    renderLayersList();
    setActiveLayer(newId);
    saveState();
});

