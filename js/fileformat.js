// --- VPS File Format (VibePhotoshop Project) ---
// A .vps file is a standard ZIP archive containing:
//   manifest.json  — document metadata and layer order
//   layers/*.png   — one RGBA PNG per layer
//
// ZIP read/write uses native CompressionStream / DecompressionStream APIs.
// No external libraries required.

// ========================
// CRC-32 (required by ZIP)
// ========================

const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c;
    }
    return table;
})();

function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ========================
// Native Compress/Decompress
// ========================

async function deflateRaw(data) {
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRaw(data) {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ========================
// ZIP Writer
// ========================

async function createZip(files) {
    // files: Array<{ name: string, data: Uint8Array }>
    // Returns: Blob of the ZIP archive

    const encoder = new TextEncoder();
    const entries = [];

    // Build local file entries
    for (const file of files) {
        const nameBytes = encoder.encode(file.name);
        const uncompressedSize = file.data.length;
        const crc = crc32(file.data);
        const compressed = await deflateRaw(file.data);
        const compressedSize = compressed.length;

        // Local file header (30 bytes + filename)
        const localHeader = new ArrayBuffer(30 + nameBytes.length);
        const lh = new DataView(localHeader);
        lh.setUint32(0, 0x04034B50, true);  // signature
        lh.setUint16(4, 20, true);           // version needed (2.0)
        lh.setUint16(6, 0, true);            // flags
        lh.setUint16(8, 8, true);            // compression: deflate
        lh.setUint16(10, 0, true);           // mod time
        lh.setUint16(12, 0, true);           // mod date
        lh.setUint32(14, crc, true);         // crc-32
        lh.setUint32(18, compressedSize, true);   // compressed size
        lh.setUint32(22, uncompressedSize, true); // uncompressed size
        lh.setUint16(26, nameBytes.length, true); // filename length
        lh.setUint16(28, 0, true);           // extra field length

        new Uint8Array(localHeader).set(nameBytes, 30);

        entries.push({
            nameBytes,
            crc,
            compressedSize,
            uncompressedSize,
            localHeader: new Uint8Array(localHeader),
            compressedData: compressed,
            localHeaderOffset: 0  // filled below
        });
    }

    // Calculate offsets and total size
    let offset = 0;
    for (const entry of entries) {
        entry.localHeaderOffset = offset;
        offset += entry.localHeader.length + entry.compressedData.length;
    }

    const centralDirOffset = offset;

    // Build central directory
    const centralHeaders = [];
    for (const entry of entries) {
        const ch = new ArrayBuffer(46 + entry.nameBytes.length);
        const v = new DataView(ch);
        v.setUint32(0, 0x02014B50, true);  // signature
        v.setUint16(4, 20, true);           // version made by
        v.setUint16(6, 20, true);           // version needed
        v.setUint16(8, 0, true);            // flags
        v.setUint16(10, 8, true);           // compression: deflate
        v.setUint16(12, 0, true);           // mod time
        v.setUint16(14, 0, true);           // mod date
        v.setUint32(16, entry.crc, true);
        v.setUint32(20, entry.compressedSize, true);
        v.setUint32(24, entry.uncompressedSize, true);
        v.setUint16(28, entry.nameBytes.length, true);
        v.setUint16(30, 0, true);           // extra field length
        v.setUint16(32, 0, true);           // comment length
        v.setUint16(34, 0, true);           // disk number start
        v.setUint16(36, 0, true);           // internal attributes
        v.setUint32(38, 0, true);           // external attributes
        v.setUint32(42, entry.localHeaderOffset, true);

        new Uint8Array(ch).set(entry.nameBytes, 46);
        centralHeaders.push(new Uint8Array(ch));
        offset += ch.byteLength;
    }

    const centralDirSize = offset - centralDirOffset;

    // End of central directory record (22 bytes)
    const eocd = new ArrayBuffer(22);
    const ev = new DataView(eocd);
    ev.setUint32(0, 0x06054B50, true);   // signature
    ev.setUint16(4, 0, true);            // disk number
    ev.setUint16(6, 0, true);            // disk with central dir
    ev.setUint16(8, entries.length, true);  // entries on this disk
    ev.setUint16(10, entries.length, true); // total entries
    ev.setUint32(12, centralDirSize, true);
    ev.setUint32(16, centralDirOffset, true);
    ev.setUint16(20, 0, true);           // comment length

    // Assemble final blob
    const parts = [];
    for (const entry of entries) {
        parts.push(entry.localHeader);
        parts.push(entry.compressedData);
    }
    for (const ch of centralHeaders) {
        parts.push(ch);
    }
    parts.push(new Uint8Array(eocd));

    return new Blob(parts, { type: 'application/zip' });
}

// ========================
// ZIP Reader
// ========================

async function readZip(arrayBuffer) {
    // Returns: Map<string, Uint8Array> of filename → uncompressed data
    const data = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const files = new Map();

    // Find End of Central Directory (scan backwards)
    let eocdOffset = -1;
    for (let i = data.length - 22; i >= 0; i--) {
        if (view.getUint32(i, true) === 0x06054B50) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset === -1) throw new Error('Invalid ZIP: EOCD not found');

    const centralDirOffset = view.getUint32(eocdOffset + 16, true);
    const entryCount = view.getUint16(eocdOffset + 10, true);

    // Parse central directory to find local header offsets
    const decoder = new TextDecoder();
    let pos = centralDirOffset;

    for (let i = 0; i < entryCount; i++) {
        if (view.getUint32(pos, true) !== 0x02014B50) {
            throw new Error('Invalid ZIP: bad central directory entry');
        }

        const compression = view.getUint16(pos + 10, true);
        const compressedSize = view.getUint32(pos + 20, true);
        const uncompressedSize = view.getUint32(pos + 24, true);
        const nameLen = view.getUint16(pos + 28, true);
        const extraLen = view.getUint16(pos + 30, true);
        const commentLen = view.getUint16(pos + 32, true);
        const localHeaderOffset = view.getUint32(pos + 42, true);

        const name = decoder.decode(data.subarray(pos + 46, pos + 46 + nameLen));

        // Jump to local header to find actual data offset
        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;

        const compressedData = data.subarray(dataOffset, dataOffset + compressedSize);

        let fileData;
        if (compression === 0) {
            // Stored (no compression)
            fileData = compressedData;
        } else if (compression === 8) {
            // Deflate
            fileData = await inflateRaw(compressedData);
        } else {
            throw new Error(`Unsupported compression method: ${compression}`);
        }

        files.set(name, fileData);

        pos += 46 + nameLen + extraLen + commentLen;
    }

    return files;
}

// ========================
// Canvas ↔ PNG helpers
// ========================

function canvasToBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function blobToUint8Array(blob) {
    return blob.arrayBuffer().then(ab => new Uint8Array(ab));
}

function loadImageFromBytes(bytes) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([bytes], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load layer image'));
        };
        img.src = url;
    });
}

// ========================
// VPS Save helpers
// ========================

async function buildVpsBlob() {
    const manifest = {
        version: 1,
        width: documentWidth,
        height: documentHeight,
        layers: []
    };

    const zipFiles = [];

    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const pngFilename = `layers/layer-${i}.png`;

        manifest.layers.push({
            name: layer.name,
            file: pngFilename,
            visible: layer.visible,
            opacity: layer.opacity !== undefined ? layer.opacity : 1.0,
            blendMode: layer.blendMode || 'normal',
            type: layer.type,
            textContent: layer.textContent,
            htmlContent: layer.htmlContent,
            textX: layer.textX,
            textY: layer.textY
        });

        const blob = await canvasToBlob(layer.canvas);
        const bytes = await blobToUint8Array(blob);
        zipFiles.push({ name: pngFilename, data: bytes });
    }

    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestBytes = new TextEncoder().encode(manifestJson);
    zipFiles.unshift({ name: 'manifest.json', data: manifestBytes });

    return createZip(zipFiles);
}

function markDocumentClean() {
    lastSavedHistoryIndex = historyIndex;
}

function isDocumentDirty() {
    if (!documentCreated) return false;
    return historyIndex !== lastSavedHistoryIndex;
}

// ========================
// VPS Save (quick-save to remembered handle)
// ========================

async function saveVpsFile() {
    if (!documentCreated) return;

    // If we already have a file handle, write directly
    if (savedFileHandle) {
        try {
            const zipBlob = await buildVpsBlob();
            const writable = await savedFileHandle.createWritable();
            await writable.write(zipBlob);
            await writable.close();
            markDocumentClean();
            return;
        } catch (err) {
            // Permission revoked or file moved — fall through to Save As
            savedFileHandle = null;
        }
    }

    // No saved handle, delegate to Save As
    await saveVpsFileAs();
}

// ========================
// VPS Save As (always shows picker)
// ========================

async function saveVpsFileAs() {
    if (!documentCreated) return;

    const zipBlob = await buildVpsBlob();
    const suggestedName = currentFileName.replace(/\.[^.]+$/, '') + '.vps';

    if ('showSaveFilePicker' in window && window.isSecureContext) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [{
                    description: 'VibePhotoshop Project',
                    accept: { 'application/zip': ['.vps'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(zipBlob);
            await writable.close();
            savedFileHandle = handle;
            currentFileName = handle.name;
            markDocumentClean();
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    // Fallback: <a> download (cannot remember handle in this path)
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    currentFileName = suggestedName;
    markDocumentClean();
}

// ========================
// VPS Open
// ========================

async function openVpsFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const zipFiles = await readZip(arrayBuffer);

        // Read manifest
        const manifestBytes = zipFiles.get('manifest.json');
        if (!manifestBytes) {
            throw new Error('Invalid VPS file: missing manifest.json');
        }

        const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));

        if (!manifest.version || !manifest.width || !manifest.height || !manifest.layers) {
            throw new Error('Invalid VPS file: malformed manifest');
        }

        // Initialize document (skip creating default layer)
        currentFileName = file.name;
        savedFileHandle = null;
        initDocument(manifest.width, manifest.height, true);

        // Load layers in reverse order (bottom to top) since createLayer unshifts
        for (let i = manifest.layers.length - 1; i >= 0; i--) {
            const layerInfo = manifest.layers[i];
            const pngBytes = zipFiles.get(layerInfo.file);
            if (!pngBytes) {
                console.warn(`Missing layer file: ${layerInfo.file}, creating empty layer`);
                const layer = createLayer(layerInfo.name, layerInfo.type || 'pixel');
                if (layer.type === 'text') {
                    layer.textContent = layerInfo.textContent || '';
                    layer.htmlContent = layerInfo.htmlContent || '';
                    layer.textX = layerInfo.textX || 0;
                    layer.textY = layerInfo.textY || 0;
                }
                layer.visible = layerInfo.visible;
                layer.opacity = layerInfo.opacity !== undefined ? layerInfo.opacity : 1.0;
                layer.canvas.style.opacity = layer.opacity;
                layer.blendMode = layerInfo.blendMode || 'normal';
                layer.canvas.style.mixBlendMode = layer.blendMode === 'additive' ? 'plus-lighter' : layer.blendMode;
                if (!layer.visible) {
                    layer.canvas.style.display = 'none';
                }
                continue;
            }

            const img = await loadImageFromBytes(pngBytes);
            const layer = createLayer(layerInfo.name, layerInfo.type || 'pixel');
            if (layer.type === 'text') {
                layer.textContent = layerInfo.textContent || '';
                layer.htmlContent = layerInfo.htmlContent || '';
                layer.textX = layerInfo.textX || 0;
                layer.textY = layerInfo.textY || 0;
            }
            layer.ctx.drawImage(img, 0, 0);
            layer.visible = layerInfo.visible;
            layer.opacity = layerInfo.opacity !== undefined ? layerInfo.opacity : 1.0;
            layer.canvas.style.opacity = layer.opacity;
            layer.blendMode = layerInfo.blendMode || 'normal';
            layer.canvas.style.mixBlendMode = layer.blendMode === 'additive' ? 'plus-lighter' : layer.blendMode;
            if (!layer.visible) {
                layer.canvas.style.display = 'none';
            }
            updateLayerThumbnail(layer.id);
        }

        renderLayersList();
        saveState();
        markDocumentClean();
    } catch (err) {
        alert(`Failed to open VPS file: ${err.message}`);
        console.error(err);
    }
}
