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
    const layersList = document.getElementById('layers-list');
    const btnAddLayer = document.getElementById('btn-add-layer');
    const noImageState = document.getElementById('no-image-state');
    const toastContainer = document.getElementById('toast-container');

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

    // Layers Subsystem
    let layers = []; // Array of { id, name, canvas, ctx }
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
    const toolBtns = [toolPencil, toolZoom];

    let currentTool = null;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const fgColorInput = document.getElementById('fg-color');
    const bgColorInput = document.getElementById('bg-color');

    fgColorInput.addEventListener('input', (e) => { fgColor = e.target.value; });
    bgColorInput.addEventListener('input', (e) => { bgColor = e.target.value; });

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
            layersData: layers.map(l => {
                return {
                    id: l.id,
                    name: l.name,
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
            const cx = c.getContext('2d', { willReadFrequently: true });
            
            cx.putImageData(lData.imgData, 0, 0);
            
            canvasStack.appendChild(c);
            layers.push({ id: lData.id, name: lData.name, canvas: c, ctx: cx });
        });

        activeLayerId = state.activeLayerId;
        updateZIndices();
        renderLayersList();
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

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // UI Alt tag tracking
        if (e.key === 'Alt' && currentTool === 'zoom') {
            canvasStack.classList.add('alt-down');
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
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Alt') {
            canvasStack.classList.remove('alt-down');
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
        canvasStack.classList.remove('tool-pencil', 'tool-zoom', 'alt-down');

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
        }
    }

    toolPencil.addEventListener('click', () => setActiveTool('pencil'));
    toolZoom.addEventListener('click', () => setActiveTool('zoom'));

    // --- Viewport Management ---
    function applyViewport() {
        canvasStack.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    }

    function zoomAtPoint(clientX, clientY, newZoom) {
        newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        if (newZoom === zoomLevel) return;

        // Bounding rect gets the CURRENT scaled & physically translated box
        const rect = canvasStack.getBoundingClientRect();
        
        // Offset of mouse from top-left of the currently visually scaled canvas
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;
        
        // Physical document coordinates
        const unscaledX = offsetX / zoomLevel;
        const unscaledY = offsetY / zoomLevel;
        
        // Difference in scale multiplied by physical coordinates gives translate shift
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
        
        canvasStack.classList.add('active');
        canvasStack.style.width = `${w}px`;
        canvasStack.style.height = `${h}px`;
        // Top-left origin is critical for exact mouse cursor coordinate tracking 
        canvasStack.style.transformOrigin = '0 0';
        applyViewport();
        
        noImageState.classList.add('hidden');
        btnSave.removeAttribute('disabled');
        btnAddLayer.removeAttribute('disabled');

        if (!skipBaseLayer) {
            createLayer('Background');
            saveState(); // Snapshot 0
        }
    }

    function setActiveLayer(id) {
        activeLayerId = id;
        renderLayersList();
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
        
        const layerObj = { id, name, canvas: c, ctx: cx };
        layers.unshift(layerObj);
        
        updateZIndices();
        setActiveLayer(id);
        return layerObj;
    }

    function deleteLayer(id) {
        if (layers.length <= 1) return false;
        
        const layerObj = layers.find(l => l.id === id);
        if (!layerObj) return false;
        
        layerObj.canvas.remove();
        layers = layers.filter(l => l.id !== id);
        
        if (activeLayerId === id) {
            setActiveLayer(layers[0].id);
        } else {
            renderLayersList();
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
            item.id = `list-item-${layer.id}`;
            item.draggable = true;

            const tcvs = document.createElement('canvas');
            tcvs.className = 'layer-thumb';
            tcvs.width = 32;
            tcvs.height = 32;

            const title = document.createElement('span');
            title.className = 'layer-name';
            title.textContent = layer.name;

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

            item.appendChild(tcvs);
            item.appendChild(title);
            item.appendChild(delBtn);

            item.addEventListener('click', (e) => {
                if (delBtn.contains(e.target)) return;
                setActiveLayer(layer.id);
            });

            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if(deleteLayer(layer.id)){
                    saveState();
                }
            });

            // Drag capabilities
            item.addEventListener('dragstart', (e) => {
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
        // Since BoundingClientRect natively accounts for the CSS transform matrix, scaling is automatically mapped
        const scaleX = documentWidth / rect.width;
        const scaleY = documentHeight / rect.height;
        return {
            x: Math.floor((e.clientX - rect.left) * scaleX),
            y: Math.floor((e.clientY - rect.top) * scaleY)
        };
    }

    function drawPixelBresenham(x0, y0, x1, y1) {
        const activeObj = getActiveLayerObj();
        if (!activeObj) return;
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

    // Capture pointers directly on the viewport wrapper so drawing/panning/zooming tracks outside bounds seamlessly
    canvasWrapper.addEventListener('pointerdown', (e) => {
        if (!documentCreated) return;
        
        // Middle mouse button (button 1) triggers Panning natively
        if (e.button === 1 || (e.button === 0 && e.altKey && currentTool !== 'zoom' && currentTool !== 'pencil')) {
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
        } else if (currentTool === 'pencil') {
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
                // Scrubby zoom function maps X mouse tracking to exponential multi-scale
                const newZoom = zoomStartLevel * Math.pow(1.01, dx);
                zoomAtPoint(zoomStartX, zoomStartY, newZoom);
            }
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
            // Distinct click vs scrub check
            if (!isZoomDragging) {
                const direction = e.altKey ? -1 : 1;
                const step = direction * 0.4; // 40% absolute step
                let newZoom = zoomLevel * (1 + step);
                zoomAtPoint(e.clientX, e.clientY, newZoom);
            }
            isZoomDragging = false;
            
        } else if (currentTool === 'pencil' && isDrawing) {
            isDrawing = false;
            if (activeLayerId) updateLayerThumbnail(activeLayerId);
            saveState(); // Snapshot after brushing
        }
    });

    canvasWrapper.addEventListener('pointercancel', (e) => {
        isPanning = false;
        canvasStack.classList.remove('is-panning');
        isZoomDragging = false;
        
        if(isDrawing) {
            isDrawing = false;
            if (activeLayerId) updateLayerThumbnail(activeLayerId);
            saveState(); 
        }
    });

    // Block native scroll zooming inside the canvas wrapper mapping into browser viewport
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
            
            saveState(); // Snapshot after Opening Image
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
            outputCtx.drawImage(layers[i].canvas, 0, 0);
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
