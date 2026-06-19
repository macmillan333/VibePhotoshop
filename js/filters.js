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

// --- Hue/Saturation/Lightness ---

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    h /= 360;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function applyHSLPreview(hueOffset, satOffset, lightOffset) {
    if (!documentCreated || !hslOriginalLayerData) return;
    
    const activeObj = getActiveLayerObj();
    if (!activeObj) return;

    if (hueOffset === 0 && satOffset === 0 && lightOffset === 0) {
        activeObj.ctx.putImageData(hslOriginalLayerData, 0, 0);
        updateLayerThumbnail(activeObj.id);
        return;
    }

    const w = documentWidth;
    const h = documentHeight;
    const len = w * h;
    
    const srcData = hslOriginalLayerData.data;
    const destData = activeObj.ctx.createImageData(w, h);
    const dest = destData.data;
    const hasSel = hasSelection();
    
    const sFactor = satOffset / 100;
    const lFactor = lightOffset / 100;
    
    for (let i = 0; i < len; i++) {
        const px = i * 4;
        const a = srcData[px + 3];
        
        if (a === 0) {
            dest[px] = 0; dest[px + 1] = 0; dest[px + 2] = 0; dest[px + 3] = 0;
            continue;
        }

        const alphaFactor = a / 255;
        const origR = srcData[px] / alphaFactor;
        const origG = srcData[px + 1] / alphaFactor;
        const origB = srcData[px + 2] / alphaFactor;
        
        let [hh, ss, ll] = rgbToHsl(origR, origG, origB);
        
        hh = (hh + hueOffset) % 360;
        if (hh < 0) hh += 360;
        
        if (origR !== origG || origG !== origB) {
            ss = Math.max(0, Math.min(1, ss + sFactor));
        } else {
            ss = 0; // Keep greys achromatic unless colorizing (not implemented)
        }
        
        ll = Math.max(0, Math.min(1, ll + lFactor));
        
        let [newR, newG, newB] = hslToRgb(hh, ss, ll);
        
        newR = Math.max(0, Math.min(255, Math.round(newR * alphaFactor)));
        newG = Math.max(0, Math.min(255, Math.round(newG * alphaFactor)));
        newB = Math.max(0, Math.min(255, Math.round(newB * alphaFactor)));

        if (hasSel) {
            const maskVal = selectionMask[i] / 255;
            dest[px] = Math.round(srcData[px] * (1 - maskVal) + newR * maskVal);
            dest[px + 1] = Math.round(srcData[px + 1] * (1 - maskVal) + newG * maskVal);
            dest[px + 2] = Math.round(srcData[px + 2] * (1 - maskVal) + newB * maskVal);
            dest[px + 3] = srcData[px + 3];
        } else {
            dest[px] = newR;
            dest[px + 1] = newG;
            dest[px + 2] = newB;
            dest[px + 3] = a;
        }
    }
    
    activeObj.ctx.putImageData(destData, 0, 0);
    updateLayerThumbnail(activeObj.id);
}
