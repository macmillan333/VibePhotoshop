function saveState() {
    if (!documentCreated) return;

    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }

    const snapshot = {
        width: documentWidth,
        height: documentHeight,
        activeLayerId,
        layerCounter,
        // Native highly-optimized deep array cloning
        selectionMask: new Uint8Array(selectionMask),
        layersData: layers.map(l => {
            return {
                id: l.id,
                name: l.name,
                visible: l.visible,
                opacity: l.opacity !== undefined ? l.opacity : 1.0,
                blendMode: l.blendMode || 'normal',
                imgData: l.ctx.getImageData(0, 0, documentWidth, documentHeight)
            };
        })
    };

    history.push(snapshot);
    if (history.length > MAX_HISTORY) {
        history.shift();
    } else {
        historyIndex++;
    }
}

function restoreState(state) {
    layers.forEach(l => l.canvas.remove());
    layersList.innerHTML = '';
    layers = [];

    documentWidth = state.width;
    documentHeight = state.height;
    layerCounter = state.layerCounter;

    canvasStack.style.width = `${documentWidth}px`;
    canvasStack.style.height = `${documentHeight}px`;
    canvasStack.style.aspectRatio = `${documentWidth} / ${documentHeight}`;

    state.layersData.forEach(lData => {
        const c = document.createElement('canvas');
        c.id = lData.id;
        c.width = documentWidth;
        c.height = documentHeight;
        c.style.display = lData.visible ? 'block' : 'none';
        c.style.opacity = lData.opacity !== undefined ? lData.opacity : 1.0;
        c.style.mixBlendMode = lData.blendMode === 'additive' ? 'plus-lighter' : (lData.blendMode || 'normal');
        const cx = c.getContext('2d', { willReadFrequently: true });

        cx.putImageData(lData.imgData, 0, 0);

        canvasStack.appendChild(c);
        layers.push({ id: lData.id, name: lData.name, visible: lData.visible, opacity: lData.opacity !== undefined ? lData.opacity : 1.0, blendMode: lData.blendMode || 'normal', canvas: c, ctx: cx });
    });

    // Ensure selection canvas remains cleanly anchored at top
    canvasStack.appendChild(selectionOverlay);
    canvasStack.appendChild(selectionDragOverlay);
    canvasStack.appendChild(transformBox);

    // Preserve current layer selection if the layer still exists in the
    // restored state; otherwise fall back to the snapshot's activeLayerId.
    const restoredIds = new Set(layers.map(l => l.id));
    if (!restoredIds.has(activeLayerId)) {
        activeLayerId = state.activeLayerId;
    }

    // Keep only selectedLayerIds that still exist; if none survive, select active
    for (const id of selectedLayerIds) {
        if (!restoredIds.has(id)) selectedLayerIds.delete(id);
    }
    if (selectedLayerIds.size === 0) {
        selectedLayerIds.add(activeLayerId);
    }
    if (!restoredIds.has(lastClickedLayerId)) {
        lastClickedLayerId = activeLayerId;
    }

    updateZIndices();
    renderLayersList();
    setActiveLayer(activeLayerId);

    // Snapshot perfectly restored array
    selectionMask = new Uint8Array(state.selectionMask);
    renderSelectionVisual();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(history[historyIndex]);
    } else {
        showToast("Nothing to Undo");
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState(history[historyIndex]);
    } else {
        showToast("Nothing to Redo");
    }
}

