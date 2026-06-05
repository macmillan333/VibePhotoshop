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
                data[px + 1] = 107;
                data[px + 2] = 255;
                data[px + 3] = Math.floor((val / 255) * 100);
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

function expandSelection(pixels) {
    if (!documentCreated || pixels <= 0) return;
    let w = documentWidth;
    let h = documentHeight;
    let r2 = pixels * pixels;
    
    let newMask = new Uint8Array(selectionMask);
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (selectionMask[y * w + x] > 0) {
                // Is boundary?
                if (x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
                    selectionMask[y * w + (x - 1)] === 0 ||
                    selectionMask[y * w + (x + 1)] === 0 ||
                    selectionMask[(y - 1) * w + x] === 0 ||
                    selectionMask[(y + 1) * w + x] === 0) {
                    
                    let startY = Math.max(0, y - pixels);
                    let endY = Math.min(h - 1, y + pixels);
                    let startX = Math.max(0, x - pixels);
                    let endX = Math.min(w - 1, x + pixels);
                    
                    for (let ny = startY; ny <= endY; ny++) {
                        for (let nx = startX; nx <= endX; nx++) {
                            if (newMask[ny * w + nx] === 0) {
                                let dx = x - nx;
                                let dy = y - ny;
                                if (dx * dx + dy * dy <= r2) {
                                    newMask[ny * w + nx] = 255;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    selectionMask.set(newMask);
    renderSelectionVisual();
    saveState();
}

function contractSelection(pixels) {
    if (!documentCreated || pixels <= 0) return;
    let w = documentWidth;
    let h = documentHeight;
    let r2 = pixels * pixels;
    
    let newMask = new Uint8Array(selectionMask);
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (selectionMask[y * w + x] === 0 || x === 0 || x === w - 1 || y === 0 || y === h - 1) {
                let isBoundary = false;
                if (selectionMask[y * w + x] === 0) {
                    if ((x > 0 && selectionMask[y * w + (x - 1)] > 0) ||
                        (x < w - 1 && selectionMask[y * w + (x + 1)] > 0) ||
                        (y > 0 && selectionMask[(y - 1) * w + x] > 0) ||
                        (y < h - 1 && selectionMask[(y + 1) * w + x] > 0)) {
                        isBoundary = true;
                    }
                } else {
                    if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
                        isBoundary = true;
                    }
                }

                if (isBoundary) {
                    let startY = Math.max(0, y - pixels);
                    let endY = Math.min(h - 1, y + pixels);
                    let startX = Math.max(0, x - pixels);
                    let endX = Math.min(w - 1, x + pixels);
                    
                    for (let ny = startY; ny <= endY; ny++) {
                        for (let nx = startX; nx <= endX; nx++) {
                            if (newMask[ny * w + nx] > 0) {
                                let dx = x - nx;
                                let dy = y - ny;
                                if (dx * dx + dy * dy <= r2) {
                                    newMask[ny * w + nx] = 0;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    selectionMask.set(newMask);
    renderSelectionVisual();
    saveState();
}

function borderSelection(pixels) {
    if (!documentCreated || pixels <= 0) return;
    let w = documentWidth;
    let h = documentHeight;
    
    let a = Math.floor(pixels / 2);
    let b = Math.ceil(pixels / 2);
    
    let maskA = new Uint8Array(selectionMask);
    if (a > 0) {
        let r2 = a * a;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (selectionMask[y * w + x] > 0) {
                    if (x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
                        selectionMask[y * w + (x - 1)] === 0 ||
                        selectionMask[y * w + (x + 1)] === 0 ||
                        selectionMask[(y - 1) * w + x] === 0 ||
                        selectionMask[(y + 1) * w + x] === 0) {
                        
                        let startY = Math.max(0, y - a);
                        let endY = Math.min(h - 1, y + a);
                        let startX = Math.max(0, x - a);
                        let endX = Math.min(w - 1, x + a);
                        
                        for (let ny = startY; ny <= endY; ny++) {
                            for (let nx = startX; nx <= endX; nx++) {
                                if (maskA[ny * w + nx] === 0) {
                                    let dx = x - nx;
                                    let dy = y - ny;
                                    if (dx * dx + dy * dy <= r2) {
                                        maskA[ny * w + nx] = 255;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    let maskB = new Uint8Array(selectionMask);
    if (b > 0) {
        let r2 = b * b;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (selectionMask[y * w + x] === 0 || x === 0 || x === w - 1 || y === 0 || y === h - 1) {
                    let isBoundary = false;
                    if (selectionMask[y * w + x] === 0) {
                        if ((x > 0 && selectionMask[y * w + (x - 1)] > 0) ||
                            (x < w - 1 && selectionMask[y * w + (x + 1)] > 0) ||
                            (y > 0 && selectionMask[(y - 1) * w + x] > 0) ||
                            (y < h - 1 && selectionMask[(y + 1) * w + x] > 0)) {
                            isBoundary = true;
                        }
                    } else {
                        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
                            isBoundary = true;
                        }
                    }

                    if (isBoundary) {
                        let startY = Math.max(0, y - b);
                        let endY = Math.min(h - 1, y + b);
                        let startX = Math.max(0, x - b);
                        let endX = Math.min(w - 1, x + b);
                        
                        for (let ny = startY; ny <= endY; ny++) {
                            for (let nx = startX; nx <= endX; nx++) {
                                if (maskB[ny * w + nx] > 0) {
                                    let dx = x - nx;
                                    let dy = y - ny;
                                    if (dx * dx + dy * dy <= r2) {
                                        maskB[ny * w + nx] = 0;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    for (let i = 0; i < w * h; i++) {
        if (maskA[i] > 0 && maskB[i] === 0) {
            selectionMask[i] = 255;
        } else {
            selectionMask[i] = 0;
        }
    }
    
    renderSelectionVisual();
    saveState();
}

function featherSelection(pixels) {
    if (!documentCreated || pixels <= 0) return;
    let w = documentWidth;
    let h = documentHeight;
    
    let r = Math.round(pixels);
    if (r < 1) r = 1;

    let src = new Float32Array(selectionMask);
    let tmp = new Float32Array(w * h);
    let dst = new Float32Array(w * h);
    
    let windowSize = r * 2 + 1;
    
    for (let pass = 0; pass < 3; pass++) {
        for (let y = 0; y < h; y++) {
            let sum = 0;
            for (let i = -r; i <= r; i++) {
                let cx = Math.max(0, Math.min(w - 1, i));
                sum += src[y * w + cx];
            }
            for (let x = 0; x < w; x++) {
                tmp[y * w + x] = sum / windowSize;
                let outPixel = src[y * w + Math.max(0, x - r)];
                let inPixel = src[y * w + Math.min(w - 1, x + r + 1)];
                sum += inPixel - outPixel;
            }
        }
        for (let x = 0; x < w; x++) {
            let sum = 0;
            for (let i = -r; i <= r; i++) {
                let cy = Math.max(0, Math.min(h - 1, i));
                sum += tmp[cy * w + x];
            }
            for (let y = 0; y < h; y++) {
                dst[y * w + x] = sum / windowSize;
                let outPixel = tmp[Math.max(0, y - r) * w + x];
                let inPixel = tmp[Math.min(h - 1, y + r + 1) * w + x];
                sum += inPixel - outPixel;
            }
        }
        
        let t = src;
        src = dst;
        dst = t;
    }
    
    for (let i = 0; i < w * h; i++) {
        selectionMask[i] = Math.max(0, Math.min(255, Math.round(src[i])));
    }
    
    renderSelectionVisual();
    saveState();
}
