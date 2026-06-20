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

function applyMorphologicalOperation(sourceMask, pixels, isExpand) {
    let w = documentWidth;
    let h = documentHeight;
    let r2 = pixels * pixels;
    let newMask = new Uint8Array(sourceMask);
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let isBoundary = false;
            
            if (isExpand) {
                if (sourceMask[y * w + x] > 0) {
                    if (x === 0 || x === w - 1 || y === 0 || y === h - 1 ||
                        sourceMask[y * w + (x - 1)] === 0 ||
                        sourceMask[y * w + (x + 1)] === 0 ||
                        sourceMask[(y - 1) * w + x] === 0 ||
                        sourceMask[(y + 1) * w + x] === 0) {
                        isBoundary = true;
                    }
                }
            } else {
                if (sourceMask[y * w + x] === 0 || x === 0 || x === w - 1 || y === 0 || y === h - 1) {
                    if (sourceMask[y * w + x] === 0) {
                        if ((x > 0 && sourceMask[y * w + (x - 1)] > 0) ||
                            (x < w - 1 && sourceMask[y * w + (x + 1)] > 0) ||
                            (y > 0 && sourceMask[(y - 1) * w + x] > 0) ||
                            (y < h - 1 && sourceMask[(y + 1) * w + x] > 0)) {
                            isBoundary = true;
                        }
                    } else {
                        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
                            isBoundary = true;
                        }
                    }
                }
            }

            if (isBoundary) {
                let startY = Math.max(0, y - pixels);
                let endY = Math.min(h - 1, y + pixels);
                let startX = Math.max(0, x - pixels);
                let endX = Math.min(w - 1, x + pixels);
                
                for (let ny = startY; ny <= endY; ny++) {
                    for (let nx = startX; nx <= endX; nx++) {
                        let targetVal = newMask[ny * w + nx];
                        if ((isExpand && targetVal === 0) || (!isExpand && targetVal > 0)) {
                            let dx = x - nx;
                            let dy = y - ny;
                            if (dx * dx + dy * dy <= r2) {
                                newMask[ny * w + nx] = isExpand ? 255 : 0;
                            }
                        }
                    }
                }
            }
        }
    }
    
    return newMask;
}

function expandSelection(pixels) {
    if (!documentCreated || pixels <= 0) return;
    selectionMask.set(applyMorphologicalOperation(selectionMask, pixels, true));
    renderSelectionVisual();
    saveState();
}

function contractSelection(pixels) {
    if (!documentCreated || pixels <= 0) return;
    selectionMask.set(applyMorphologicalOperation(selectionMask, pixels, false));
    renderSelectionVisual();
    saveState();
}

function borderSelection(pixels) {
    if (!documentCreated || pixels <= 0) return;
    let a = Math.floor(pixels / 2);
    let b = Math.ceil(pixels / 2);
    
    let maskA = a > 0 ? applyMorphologicalOperation(selectionMask, a, true) : new Uint8Array(selectionMask);
    let maskB = b > 0 ? applyMorphologicalOperation(selectionMask, b, false) : new Uint8Array(selectionMask);
    
    for (let i = 0; i < documentWidth * documentHeight; i++) {
        selectionMask[i] = (maskA[i] > 0 && maskB[i] === 0) ? 255 : 0;
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

function updateColorRangePreview() {
    if (!documentCreated || !colorRangeSampledColor) return;
    
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;
    
    const imgData = activeObj.ctx.getImageData(0, 0, documentWidth, documentHeight);
    const data = imgData.data;
    const { r, g, b } = colorRangeSampledColor;
    const fuzziness = colorRangeFuzzinessValue;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = documentWidth;
    tempCanvas.height = documentHeight;
    const tempCtx = tempCanvas.getContext('2d');
    const previewData = tempCtx.createImageData(documentWidth, documentHeight);
    const pData = previewData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const pr = data[i];
        const pg = data[i+1];
        const pb = data[i+2];
        const pa = data[i+3];
        
        let selAlpha = 0;
        if (pa > 0) {
            const dist = Math.sqrt(Math.pow(pr - r, 2) + Math.pow(pg - g, 2) + Math.pow(pb - b, 2));
            if (fuzziness === 0) {
                selAlpha = (dist === 0) ? 255 : 0;
            } else if (dist <= fuzziness) {
                selAlpha = Math.round(255 * (1 - (dist / fuzziness)));
            }
        }
        
        pData[i] = selAlpha;
        pData[i+1] = selAlpha;
        pData[i+2] = selAlpha;
        pData[i+3] = 255;
    }
    
    tempCtx.putImageData(previewData, 0, 0);
    
    const previewCtx = colorRangePreviewCanvas.getContext('2d');
    const scale = Math.min(colorRangePreviewCanvas.width / documentWidth, colorRangePreviewCanvas.height / documentHeight);
    const scaledW = documentWidth * scale;
    const scaledH = documentHeight * scale;
    const dx = (colorRangePreviewCanvas.width - scaledW) / 2;
    const dy = (colorRangePreviewCanvas.height - scaledH) / 2;
    
    previewCtx.fillStyle = '#000';
    previewCtx.fillRect(0, 0, colorRangePreviewCanvas.width, colorRangePreviewCanvas.height);
    previewCtx.drawImage(tempCanvas, 0, 0, documentWidth, documentHeight, dx, dy, scaledW, scaledH);
}

function applyColorRangeSelection() {
    if (!documentCreated || !colorRangeSampledColor) return;
    
    const activeObj = getActiveLayerObj();
    if (!activeObj || !activeObj.visible) return;
    
    const imgData = activeObj.ctx.getImageData(0, 0, documentWidth, documentHeight);
    const data = imgData.data;
    const { r, g, b } = colorRangeSampledColor;
    const fuzziness = colorRangeFuzzinessValue;
    
    selectionMask.fill(0);
    for (let i = 0; i < data.length; i += 4) {
        const pa = data[i+3];
        if (pa > 0) {
            const pr = data[i];
            const pg = data[i+1];
            const pb = data[i+2];
            const dist = Math.sqrt(Math.pow(pr - r, 2) + Math.pow(pg - g, 2) + Math.pow(pb - b, 2));
            if (fuzziness === 0) {
                if (dist === 0) selectionMask[i / 4] = 255;
            } else if (dist <= fuzziness) {
                selectionMask[i / 4] = Math.round(255 * (1 - (dist / fuzziness)));
            }
        }
    }
    
    renderSelectionVisual();
    saveState();
}
