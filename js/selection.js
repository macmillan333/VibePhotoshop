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


