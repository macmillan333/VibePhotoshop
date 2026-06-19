// --- Filters Engine ---

function blurChannel(src, dest, w, h, r) {
    const windowSize = r * 2 + 1;
    
    // Horizontal pass: src -> dest
    for (let y = 0; y < h; y++) {
        let sum = src[y * w] * (r + 1);
        for (let i = 1; i <= r; i++) {
            sum += src[y * w + Math.min(w - 1, i)];
        }
        for (let x = 0; x < w; x++) {
            dest[y * w + x] = sum / windowSize;
            const outPixel = src[y * w + Math.max(0, x - r)];
            const inPixel = src[y * w + Math.min(w - 1, x + r + 1)];
            sum += inPixel - outPixel;
        }
    }
    
    // Vertical pass: dest -> src
    for (let x = 0; x < w; x++) {
        let sum = dest[x] * (r + 1);
        for (let i = 1; i <= r; i++) {
            sum += dest[Math.min(h - 1, i) * w + x];
        }
        for (let y = 0; y < h; y++) {
            src[y * w + x] = sum / windowSize;
            const outPixel = dest[Math.max(0, y - r) * w + x];
            const inPixel = dest[Math.min(h - 1, y + r + 1) * w + x];
            sum += inPixel - outPixel;
        }
    }
}

function applyGaussianBlurPreview(radius) {
    if (!documentCreated || !blurOriginalLayerData) return;
    
    const activeObj = getActiveLayerObj();
    if (!activeObj) return;

    if (radius === 0) {
        activeObj.ctx.putImageData(blurOriginalLayerData, 0, 0);
        updateLayerThumbnail(activeObj.id);
        return;
    }

    const r = Math.round(radius);
    const w = documentWidth;
    const h = documentHeight;
    const len = w * h;
    
    const rChan = new Float32Array(len);
    const gChan = new Float32Array(len);
    const bChan = new Float32Array(len);
    const aChan = new Float32Array(len);
    const temp = new Float32Array(len);
    
    const srcData = blurOriginalLayerData.data;
    
    // Populate channels with premultiplied alpha
    for (let i = 0; i < len; i++) {
        const px = i * 4;
        const a = srcData[px + 3];
        aChan[i] = a;
        
        const alphaFactor = a / 255;
        rChan[i] = srcData[px] * alphaFactor;
        gChan[i] = srcData[px + 1] * alphaFactor;
        bChan[i] = srcData[px + 2] * alphaFactor;
    }
    
    // 3-pass box blur for Gaussian approximation
    for (let pass = 0; pass < 3; pass++) {
        blurChannel(rChan, temp, w, h, r);
        blurChannel(gChan, temp, w, h, r);
        blurChannel(bChan, temp, w, h, r);
        blurChannel(aChan, temp, w, h, r);
    }
    
    const destData = activeObj.ctx.createImageData(w, h);
    const dest = destData.data;
    const hasSel = hasSelection();
    
    for (let i = 0; i < len; i++) {
        const px = i * 4;
        const blurredA = Math.max(0, Math.min(255, Math.round(aChan[i])));
        
        let blurredR = 0, blurredG = 0, blurredB = 0;
        
        // Un-premultiply
        if (blurredA > 0) {
            const alphaFactor = blurredA / 255;
            blurredR = Math.max(0, Math.min(255, Math.round(rChan[i] / alphaFactor)));
            blurredG = Math.max(0, Math.min(255, Math.round(gChan[i] / alphaFactor)));
            blurredB = Math.max(0, Math.min(255, Math.round(bChan[i] / alphaFactor)));
        }
        
        if (hasSel) {
            const maskVal = selectionMask[i] / 255;
            dest[px] = Math.round(srcData[px] * (1 - maskVal) + blurredR * maskVal);
            dest[px + 1] = Math.round(srcData[px + 1] * (1 - maskVal) + blurredG * maskVal);
            dest[px + 2] = Math.round(srcData[px + 2] * (1 - maskVal) + blurredB * maskVal);
            dest[px + 3] = Math.round(srcData[px + 3] * (1 - maskVal) + blurredA * maskVal);
        } else {
            dest[px] = blurredR;
            dest[px + 1] = blurredG;
            dest[px + 2] = blurredB;
            dest[px + 3] = blurredA;
        }
    }
    
    activeObj.ctx.putImageData(destData, 0, 0);
    updateLayerThumbnail(activeObj.id);
}
