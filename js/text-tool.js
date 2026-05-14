// --- Text Tool & Rendering ---

function renderTextLayerHTML() {
    const layer = layers.find(l => l.id === textLayerId);
    if (!layer) return;

    const html = textEditor.innerHTML;
    if (!html.trim() && textEditor.textContent.trim() === '') return;

    layer.ctx.clearRect(0, 0, documentWidth, documentHeight);

    // Convert HTML to well-formed XML to prevent SVG parsing errors
    let xmlSafeHtml = '';
    for (const node of textEditor.childNodes) {
        xmlSafeHtml += new XMLSerializer().serializeToString(node);
    }

    // Use the editor's current base color (set when editing started) as the default,
    // but let inline color styles from execCommand('foreColor') override it.
    const baseColor = textEditor.style.color || fgColor;
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${documentWidth}" height="${documentHeight}"><foreignObject x="${textX}" y="${textY}" width="${documentWidth - textX}" height="${documentHeight - textY}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Inter', sans-serif; font-size: 24px; color: ${baseColor}; line-height: 1.2; white-space: pre-wrap; word-break: break-word; margin: 0; padding: 0;">${xmlSafeHtml}</div></foreignObject></svg>`;
    const img = new Image();

    // Use data URI instead of Blob URL to prevent cross-origin canvas tainting in Chromium
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

    img.onload = () => {
        layer.ctx.drawImage(img, 0, 0);
        updateLayerThumbnail(layer.id);
        saveState();
    };
    img.src = url;
}

function commitTextLayer() {
    if (!isTypingText) return;
    isTypingText = false;
    textEditor.classList.add('hidden');
    textToolbar.classList.add('hidden');

    const html = textEditor.innerHTML;
    const textContent = textEditor.textContent;

    if (textContent.trim() === '') {
        deleteLayer(textLayerId);
    } else {
        const layer = layers.find(l => l.id === textLayerId);
        if (layer) {
            layer.textContent = textContent;
            layer.htmlContent = html;
            layer.name = textContent.split('\n')[0].substring(0, 20) || 'Text Layer';
            renderTextLayerHTML();
            renderLayersList();
        }
    }
}

// --- Text Toolbar Interactions ---

// When a toolbar control is clicked (especially number input spinners), focus
// leaves the contenteditable text editor, which collapses the text selection.
// We save the selection on pointerdown (before focus moves) so we can restore
// it in the change handler and apply formatting to the correct text range.
let savedTextSelection = null;

function saveTextSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && textEditor.contains(sel.anchorNode)) {
        savedTextSelection = sel.getRangeAt(0).cloneRange();
    }
}

function restoreTextSelection() {
    if (savedTextSelection) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedTextSelection);
        savedTextSelection = null;
    }
}

// Save selection when any toolbar input/select/button receives pointerdown
[fontSizeInput, letterSpacingInput, lineHeightInput, fontFamilySelect].forEach(el => {
    el.addEventListener('pointerdown', () => {
        saveTextSelection();
    });
});

textStyleBtns.forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const cmd = btn.dataset.command;
        document.execCommand(cmd, false, null);
    });
});

fontFamilySelect.addEventListener('change', (e) => {
    restoreTextSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('fontName', false, e.target.value);
    textEditor.focus();
});

fontSizeInput.addEventListener('change', (e) => {
    const val = e.target.value;
    restoreTextSelection();
    document.execCommand('styleWithCSS', false, true);
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const span = document.createElement('span');
        span.style.fontSize = val + 'px';
        const range = selection.getRangeAt(0);
        span.appendChild(range.extractContents());
        range.insertNode(span);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
    }
    textEditor.focus();
});

letterSpacingInput.addEventListener('change', (e) => {
    const val = e.target.value;
    restoreTextSelection();
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const span = document.createElement('span');
        span.style.letterSpacing = val + 'px';
        const range = selection.getRangeAt(0);
        span.appendChild(range.extractContents());
        range.insertNode(span);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
    }
    textEditor.focus();
});

lineHeightInput.addEventListener('change', (e) => {
    const val = e.target.value;
    restoreTextSelection();
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const span = document.createElement('span');
        span.style.lineHeight = val;
        const range = selection.getRangeAt(0);
        span.appendChild(range.extractContents());
        range.insertNode(span);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
    }
    textEditor.focus();
});
