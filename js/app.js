document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const fileMenuBtn = document.getElementById('file-menu-btn');
    const fileDropdown = document.getElementById('file-dropdown');
    
    const btnNew = document.getElementById('btn-new');
    const btnOpen = document.getElementById('btn-open');
    const btnSave = document.getElementById('btn-save');
    const fileInput = document.getElementById('file-input');
    
    const newCanvasModal = document.getElementById('new-canvas-modal');
    const newCanvasForm = document.getElementById('new-canvas-form');
    const btnCancelNew = document.getElementById('btn-cancel-new');

    const canvasWrapper = document.querySelector('.canvas-wrapper');
    const canvasStack = document.getElementById('canvas-stack');
    const sidebarRight = document.getElementById('sidebar-right');
    const layersList = document.getElementById('layers-list');
    const btnAddLayer = document.getElementById('btn-add-layer');
    const noImageState = document.getElementById('no-image-state');
    const toastContainer = document.getElementById('toast-container');
    const layersResizer = document.getElementById('layers-resizer');

    // --- State ---
    let currentFileName = 'untitled.png';
    let documentWidth = 800;
    let documentHeight = 600;
    let documentCreated = false;

    // Viewport State
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 32.0;
    let zoomLevel = 1.0;
    let panX = 0;
    let panY = 0;
    
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    
    let isZoomDragging = false;
    let zoomStartX = 0;
    let zoomStartY = 0;
    let zoomStartLevel = 1.0;

    // Selection State
    let selectionMask = null;
    let selectionOverlay = null;
    let selectionDragOverlay = null;
    let selectionCtx = null;
    let selectionDragCtx = null;
    
    let isSelecting = false;
    let selectStartX = 0;
    let selectStartY = 0;
    let selectionMode = 'replace';
    
    let clipboardData = null;

    // Layers Subsystem
    let layers = []; // Array of { id, name, canvas, ctx, visible }
    let activeLayerId = null;
    let layerCounter = 0;

    // History Subsystem (Undo/Redo)
    let history = [];
    let historyIndex = -1;
    const MAX_HISTORY = 30;

    let fgColor = '#000000';
    let bgColor = '#ffffff';

    const toolPencil = document.getElementById('tool-pencil');
    const toolZoom = document.getElementById('tool-zoom');
    const toolRectSelect = document.getElementById('tool-rect-select');
    const toolBtns = [toolPencil, toolZoom, toolRectSelect];

    let currentTool = null;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const fgColorInput = document.getElementById('fg-color');
    const bgColorInput = document.getElementById('bg-color');

    fgColorInput.addEventListener('input', (e) => { fgColor = e.target.value; });
    bgColorInput.addEventListener('input', (e) => { bgColor = e.target.value; });

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


    // --- History & Toast Logic ---
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
            const cx = c.getContext('2d', { willReadFrequently: true });
            
            cx.putImageData(lData.imgData, 0, 0);
            
            canvasStack.appendChild(c);
            layers.push({ id: lData.id, name: lData.name, visible: lData.visible, canvas: c, ctx: cx });
        });

        // Ensure selection canvas remains cleanly anchored at top
        canvasStack.appendChild(selectionOverlay);
        canvasStack.appendChild(selectionDragOverlay);
        
        activeLayerId = state.activeLayerId;
        updateZIndices();
        renderLayersList();
        
        const newActive = document.getElementById(`list-item-${activeLayerId}`);
        if (newActive) newActive.classList.add('active');

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

    // --- Selection Logic ---
    function clearSelection() {
        if (!documentCreated) return;
        selectionMask.fill(0);
        selectionCtx.clearRect(0, 0, documentWidth, documentHeight);
        if (selectionDragCtx) selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);
    }

    function renderSelectionVisual() {
        if (!documentCreated) return;
        selectionCtx.clearRect(0, 0, documentWidth, documentHeight);
        
        let minX = documentWidth, maxX = 0;
        let minY = documentHeight, maxY = 0;
        let hasSelection = false;

        const imgData = selectionCtx.createImageData(documentWidth, documentHeight);
        const data = imgData.data;

        for (let y = 0; y < documentHeight; y++) {
            for (let x = 0; x < documentWidth; x++) {
                const i = y * documentWidth + x;
                const val = selectionMask[i];
                if (val > 0) {
                    hasSelection = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;

                    const px = i * 4;
                    data[px] = 92;
                    data[px+1] = 107;
                    data[px+2] = 255;
                    data[px+3] = Math.floor((val / 255) * 100); 
                }
            }
        }

        if (!hasSelection) return;

        selectionCtx.putImageData(imgData, 0, 0);

        // Render alternating high-contrast pixel boundaries naturally over global viewport map
        selectionCtx.setLineDash([5, 5]);
        selectionCtx.lineWidth = 1;
        
        selectionCtx.strokeStyle = '#ffffff';
        selectionCtx.strokeRect(minX + 0.5, minY + 0.5, (maxX - minX + 1), (maxY - minY + 1));
        
        selectionCtx.lineDashOffset = 5;
        selectionCtx.strokeStyle = '#222222';
        selectionCtx.strokeRect(minX + 0.5, minY + 0.5, (maxX - minX + 1), (maxY - minY + 1));
        
        selectionCtx.setLineDash([]);
        selectionCtx.lineDashOffset = 0;
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;

        if (e.key === 'Alt') {
            canvasStack.classList.add('alt-down');
        }
        if (e.key === 'Shift') {
            canvasStack.classList.add('shift-down');
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' || e.key === 'Z') {
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
                            destData.data[px+1] = srcData.data[px+1];
                            destData.data[px+2] = srcData.data[px+2];
                            destData.data[px+3] = Math.floor((srcData.data[px+3] * selAlpha) / 255);
                        }
                    }
                    clipCtx.putImageData(destData, 0, 0);
                }
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
                showToast("Pasted as new layer");
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
        toggleMenu(fileMenuBtn, fileDropdown);
    });

    document.addEventListener('click', (e) => {
        if (!fileMenuBtn.contains(e.target) && !fileDropdown.contains(e.target)) {
            fileDropdown.classList.add('hidden');
            fileMenuBtn.classList.remove('active');
        }
    });

    fileDropdown.addEventListener('click', () => {
        fileDropdown.classList.add('hidden');
        fileMenuBtn.classList.remove('active');
    });

    // --- Tool Management ---
    function setActiveTool(toolId) {
        toolBtns.forEach(btn => btn.classList.remove('active'));
        canvasStack.classList.remove('tool-pencil', 'tool-zoom', 'tool-rect-select', 'alt-down');

        if (currentTool === toolId) {
            currentTool = null;
            return;
        }

        currentTool = toolId;
        if (toolId === 'pencil') {
            toolPencil.classList.add('active');
            canvasStack.classList.add('tool-pencil');
        } else if (toolId === 'zoom') {
            toolZoom.classList.add('active');
            canvasStack.classList.add('tool-zoom');
        } else if (toolId === 'rect-select') {
            toolRectSelect.classList.add('active');
            canvasStack.classList.add('tool-rect-select');
        }
    }

    toolPencil.addEventListener('click', () => setActiveTool('pencil'));
    toolZoom.addEventListener('click', () => setActiveTool('zoom'));
    toolRectSelect.addEventListener('click', () => setActiveTool('rect-select'));

    // --- Viewport Management ---
    function applyViewport() {
        canvasStack.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
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


    // --- Layer Management ---
    function initDocument(w, h, skipBaseLayer = false) {
        documentWidth = w;
        documentHeight = h;
        documentCreated = true;
        
        canvasStack.innerHTML = '';
        layersList.innerHTML = '';
        layers = [];
        layerCounter = 0;
        activeLayerId = null;
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

        canvasStack.classList.add('active');
        canvasStack.style.width = `${w}px`;
        canvasStack.style.height = `${h}px`;
        canvasStack.style.transformOrigin = '0 0';
        applyViewport();
        
        noImageState.classList.add('hidden');
        btnSave.removeAttribute('disabled');
        btnAddLayer.removeAttribute('disabled');

        if (!skipBaseLayer) {
            createLayer('Background');
            saveState();
        }
    }

    function setActiveLayer(id) {
        if (activeLayerId === id) return;
        activeLayerId = id;
        
        const items = layersList.querySelectorAll('.layer-item');
        items.forEach(item => {
            if (item.id === `list-item-${id}`) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    function getActiveLayerObj() {
        return layers.find(l => l.id === activeLayerId);
    }

    let draggedLayerId = null;

    function createLayer(name = `Layer ${layerCounter + 1}`) {
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
        
        const layerObj = { id, name, canvas: c, ctx: cx, visible: true };
        layers.unshift(layerObj);
        
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
            setActiveLayer(layers[0].id);
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
        tCtx.drawImage(layerObj.canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }

    function renderLayersList() {
        layersList.innerHTML = '';
        layers.forEach((layer) => {
            const item = document.createElement('div');
            item.className = `layer-item ${layer.id === activeLayerId ? 'active' : ''}`;
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

            const actionsGroup = document.createElement('div');
            actionsGroup.className = 'item-actions';

            const dupBtn = document.createElement('button');
            dupBtn.className = 'btn-icon';
            dupBtn.title = 'Duplicate Layer';
            dupBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            `;

            const delBtn = document.createElement('button');
            delBtn.className = 'btn-icon';
            delBtn.title = 'Delete Layer';
            delBtn.disabled = layers.length <= 1;
            delBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;

            actionsGroup.appendChild(dupBtn);
            actionsGroup.appendChild(delBtn);

            item.appendChild(visBtn);
            item.appendChild(tcvs);
            item.appendChild(title);
            item.appendChild(actionsGroup);

            visBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                layer.canvas.style.display = layer.visible ? 'block' : 'none';
                saveState();
                renderLayersList();
            });

            dupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = layers.findIndex(l => l.id === layer.id);
                const newLayer = createLayer(layer.name + ' copy');
                const createdLayerObj = layers.shift();
                layers.splice(idx, 0, createdLayerObj);
                
                createdLayerObj.ctx.drawImage(layer.canvas, 0, 0);
                
                updateZIndices();
                renderLayersList();
                setActiveLayer(createdLayerObj.id);
                saveState();
            });

            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if(deleteLayer(layer.id)){
                    saveState();
                }
            });

            item.addEventListener('click', (e) => {
                if (delBtn.contains(e.target) || visBtn.contains(e.target) || dupBtn.contains(e.target)) return;
                setActiveLayer(layer.id);
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

    canvasWrapper.addEventListener('pointerdown', (e) => {
        if (!documentCreated) return;
        
        if (e.button === 1 || (e.button === 0 && e.altKey && currentTool !== 'zoom' && currentTool !== 'pencil' && currentTool !== 'rect-select')) {
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
        } else if (currentTool === 'rect-select') {
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
        } else if (currentTool === 'pencil') {
            const activeObj = getActiveLayerObj();
            if(!activeObj || !activeObj.visible) return;

            isDrawing = true;
            const coords = getCanvasCoords(e);
            lastX = coords.x;
            lastY = coords.y;
            drawPixelBresenham(lastX, lastY, coords.x, coords.y);
            canvasWrapper.setPointerCapture(e.pointerId);
        }
    });

    canvasWrapper.addEventListener('pointermove', (e) => {
        if (!documentCreated) return;

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
            
        } else if (currentTool === 'pencil' && isDrawing) {
            const coords = getCanvasCoords(e);
            drawPixelBresenham(lastX, lastY, coords.x, coords.y);
            lastX = coords.x;
            lastY = coords.y;
        }
    });

    canvasWrapper.addEventListener('pointerup', (e) => {
        if (!documentCreated) return;
        
        try { canvasWrapper.releasePointerCapture(e.pointerId); } catch(err) {}

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
            
        } else if (currentTool === 'pencil' && isDrawing) {
            isDrawing = false;
            if (activeLayerId) updateLayerThumbnail(activeLayerId);
            saveState();
        }
    });

    canvasWrapper.addEventListener('pointercancel', (e) => {
        isPanning = false;
        canvasStack.classList.remove('is-panning');
        isZoomDragging = false;
        
        if (isSelecting) {
            isSelecting = false;
            selectionDragCtx.clearRect(0, 0, documentWidth, documentHeight);
            renderSelectionVisual();
        }
        
        if(isDrawing) {
            isDrawing = false;
            if (activeLayerId) updateLayerThumbnail(activeLayerId);
            saveState(); 
        }
    });

    canvasWrapper.addEventListener('wheel', (e) => {
        if (currentTool === 'zoom' || e.ctrlKey || e.altKey) {
            e.preventDefault();
        }
    }, { passive: false });


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
            currentFileName = 'untitled.png';
            initDocument(width, height);
            newCanvasModal.close();
        }
    });

    btnOpen.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        currentFileName = file.name;
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = () => {
            initDocument(img.width, img.height, true);
            const layer = createLayer('Background');
            layer.ctx.drawImage(img, 0, 0);
            updateLayerThumbnail(layer.id);
            
            saveState();
            URL.revokeObjectURL(objectUrl);
        };
        
        img.onerror = () => {
            alert('Failed to load the selected image file.');
            URL.revokeObjectURL(objectUrl);
        };
        
        img.src = objectUrl;
        fileInput.value = '';
    });

    btnSave.addEventListener('click', async () => {
        if (!documentCreated) return;

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = documentWidth;
        outputCanvas.height = documentHeight;
        const outputCtx = outputCanvas.getContext('2d');
        
        for (let i = layers.length - 1; i >= 0; i--) {
            if(layers[i].visible) {
                outputCtx.drawImage(layers[i].canvas, 0, 0);
            }
        }

        if ('showSaveFilePicker' in window && window.isSecureContext) {
            try {
                const blob = await new Promise(resolve => outputCanvas.toBlob(resolve, 'image/png'));
                const handle = await window.showSaveFilePicker({
                    suggestedName: `edited_${currentFileName}`,
                    types: [{
                        description: 'PNG Image',
                        accept: {'image/png': ['.png']},
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        outputCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `edited_${currentFileName}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }, 'image/png');
    });
});
