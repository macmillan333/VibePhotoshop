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
    const toolBtns = [toolPencil];

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
        
        // Truncate future if we are branching from the past
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
        // Destroy existing DOM elements securely
        layers.forEach(l => l.canvas.remove());
        layersList.innerHTML = '';
        layers = [];
        
        documentWidth = state.width;
        documentHeight = state.height;
        layerCounter = state.layerCounter;
        
        canvasStack.style.width = `${documentWidth}px`;
        canvasStack.style.height = `${documentHeight}px`;
        canvasStack.style.aspectRatio = `${documentWidth} / ${documentHeight}`;
        
        // Rebuild Layers array keeping precise structural order
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
        canvasStack.classList.remove('tool-pencil');

        if (currentTool === toolId) {
            currentTool = null;
            return;
        }

        currentTool = toolId;
        if (toolId === 'pencil') {
            toolPencil.classList.add('active');
            canvasStack.classList.add('tool-pencil');
        }
    }

    toolPencil.addEventListener('click', () => setActiveTool('pencil'));

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
        
        canvasStack.classList.add('active');
        canvasStack.style.width = `${w}px`;
        canvasStack.style.height = `${h}px`;
        canvasStack.style.maxWidth = '100%';
        canvasStack.style.maxHeight = '100%';
        canvasStack.style.aspectRatio = `${w} / ${h}`;
        
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

    canvasStack.addEventListener('pointerdown', (e) => {
        if (!documentCreated || !currentTool) return;
        
        isDrawing = true;
        const coords = getCanvasCoords(e);
        lastX = coords.x;
        lastY = coords.y;
        
        if (currentTool === 'pencil') {
            drawPixelBresenham(lastX, lastY, coords.x, coords.y);
        }
        
        canvasStack.setPointerCapture(e.pointerId);
    });

    canvasStack.addEventListener('pointermove', (e) => {
        if (!isDrawing) return;
        if (currentTool === 'pencil') {
            const coords = getCanvasCoords(e);
            drawPixelBresenham(lastX, lastY, coords.x, coords.y);
            lastX = coords.x;
            lastY = coords.y;
        }
    });

    canvasStack.addEventListener('pointerup', (e) => {
        if(isDrawing) {
            isDrawing = false;
            try { canvasStack.releasePointerCapture(e.pointerId); } catch(e) {}
            if (activeLayerId) updateLayerThumbnail(activeLayerId);
            saveState(); // Snapshot after brushing
        }
    });

    canvasStack.addEventListener('pointercancel', (e) => {
        if(isDrawing) {
            isDrawing = false;
            if (activeLayerId) updateLayerThumbnail(activeLayerId);
            saveState(); 
        }
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
            canvasStack.style.transform = 'scale(0.98)';
            setTimeout(() => {
                canvasStack.style.transform = 'scale(1)';
                canvasStack.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }, 50);
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
