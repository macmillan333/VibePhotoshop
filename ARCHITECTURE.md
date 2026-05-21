# VibePhotoshop Architecture Overview

## Project Goals
The end goal of VibePhotoshop is to implement a robust subset of Photoshop features directly in the browser. The app currently supports bitmap editing and rich text layers. Future expansions are planned to include:
- Vector layers
- Filters
- Masks
- Advanced blend modes

## Tech Stack & Conventions
- **Vanilla Web Technologies:** Built strictly with HTML, CSS, and JavaScript.
- **Zero Build Step:** Designed to run seamlessly via the `file://` protocol. No dev server, bundler (e.g., Webpack, Vite), or package manager (NPM) is required.
- **Modular Architecture:** The codebase is split into modular subsystems (e.g., `layers.js`, `tools.js`, `components/*.css`) which are loaded sequentially via `<script defer>` in `index.html`.

## Core Subsystems & State Management

### 1. Global State (`js/globals.js`)
All central application state is maintained globally to allow seamless interaction between different modules without complex dependency injection. Key state variables include:
- `layers`: Array of layer objects containing their DOM `<canvas>` elements and 2D contexts.
- `activeLayerId` / `selectedLayerIds`: State tracking for active and multi-selected layers.
- `history`: Array of state snapshots for undo/redo functionality.
- `selectionMask`: A 1D `Uint8Array` matching the document dimensions, tracking alpha selection data per pixel (0-255).
- `currentTool`: Tracks the currently active tool instance.

### 2. Layer Management (`js/layers.js`)
- **Native Canvas Stacking:** Each layer is an independent `<canvas>` element injected into the `#canvas-stack` container.
- **Hardware Compositing:** Visual compositing is handled natively by the browser engine using CSS `z-index`, avoiding continuous manual redrawing of a master canvas.
- **DOM Integration:** Layer thumbnails and visibility toggles are synchronized with the DOM list.

### 3. Selection Engine (`js/tools.js`)
- **Bitmap Masking:** Selection is driven by a `Uint8Array` (`selectionMask`). Operations like copying, cutting, or transforming use this array as an alpha mask against the active layer.
- **Shape Tools:** Marquee tools (Rect, Oval) and Path tools (Polygon) rasterize vector paths or shapes onto a temporary canvas, read the resulting alpha map via `getImageData`, and merge the pixel values into the `selectionMask` (supporting Add/Subtract/Replace modes).
- **Visual Overlays:** Selection marquees (marching ants) and dragged selection previews are rendered to dedicated `selectionOverlay` and `selectionDragOverlay` canvases layered on top of the document.

### 4. History / Undo-Redo (`js/history.js`)
- **Deep Pixel Snapshots:** The history engine takes deep snapshots of the entire document state.
- **Memory Storage:** Uses `getImageData` to store raw pixel arrays for every layer upon significant actions. When restoring a state, it clears the canvases and uses `putImageData` to revert.
- **Cap:** History is currently capped at `MAX_HISTORY` states to prevent browser memory exhaustion.

### 5. Tools & Transform Engine (`js/tools.js`)
- **Pointer Events:** Canvas interaction is driven by `pointerdown`, `pointermove`, and `pointerup` to seamlessly support both mouse and tablet/pen inputs.
- **Transform/Move:** Complex operations like Free Transform manage their own temporary DOM canvases (`moveFloatingCanvas`, `transformErasedLayerCanvas`) to visually preview transformations before mathematically committing the final pixels back to the active layer.

### 6. Text Tool (`js/tools.js`, `css/components/text-toolbar.css`)
- **Layer Type:** Text layers are stored as regular layer objects with `type: 'text'` and extra properties: `textContent` (plain text), `htmlContent` (rich HTML), `textX`, and `textY` (origin coordinates).
- **Editing Overlay:** When the user clicks on the canvas with the Text tool, a `contenteditable` div (`#text-editor`) is positioned at the click point inside `#canvas-stack`. This allows native browser text editing (cursor, selection, clipboard) while visually overlaying the canvas.
- **Tool Properties Bar:** A contextual toolbar (`#properties-bar`) appears at the top of the workspace and provides rich formatting controls depending on the active tool. For the Text tool, it allows changing font family (`<select>`), font size, bold/italic/strikethrough (via `document.execCommand`), text alignment, letter spacing, and line height.
- **Selection Preservation:** Toolbar number inputs (font size, letter spacing, line height) have spinner buttons that steal focus from the `contenteditable` div. To prevent this from collapsing the text selection, the current `Range` is saved on `pointerdown` and restored in the `change` handler before applying formatting.
- **SVG foreignObject Rendering:** When editing is committed (`commitTextLayer`), the editor's HTML is serialized via `XMLSerializer`, embedded in an SVG `<foreignObject>`, and drawn to the layer's canvas using a `data:` URI (not Blob URL) to avoid cross-origin canvas tainting.
- **Hit Testing:** Clicking near existing text re-opens the editor instead of creating a new layer. Detection uses a padded area check (20px radius around the click point sampled via `getImageData`) plus a proximity check to the text origin, making the hit box forgiving.
- **Commit Flow:** Clicking outside the editor or toolbar triggers `commitTextLayer()`, which hides the overlay, stores `htmlContent`/`textContent` on the layer object, and re-renders the text to the canvas. Empty text layers are automatically deleted.

### 7. File Format Engine (`js/fileformat.js`)
- **VPS Format:** The app's native layered file format is `.vps` (VibePhotoshop), which is a standard ZIP archive containing a `manifest.json` (document metadata and layer order) plus one RGBA PNG file per layer.
- **Native ZIP Implementation:** ZIP read/write is implemented from scratch using `CompressionStream('deflate-raw')` / `DecompressionStream('deflate-raw')` and manual binary header construction via `DataView`. No external libraries are used.
- **File Menu Structure:** "Open" loads `.vps` project files. "Save" writes to the last-used file handle (quick-save via `savedFileHandle`); "Save As" always shows a file picker dialog. "Import Image" loads flat bitmaps (PNG/JPEG/WebP) into a new project. "Export" flattens visible layers and lets the user choose between PNG and JPEG formats.
- **Dirty Tracking:** `lastSavedHistoryIndex` tracks the history position of the last save. A `beforeunload` listener warns the user if they try to close the page with unsaved changes. Exporting does not count as a save.

### 8. Brush & Eraser Engine (`js/tools.js`)
- **Distance-Based Spacing:** To prevent "alpha build-up" (where stamping a soft brush too densely causes it to look hard), the engine mathematically tracks mouse dragging distance and stamps only when the distance exceeds the configured percentage of the brush's diameter (`brushSpacing`, defaults to 25%).
- **Off-Screen Stamping:** When settings change, a radial gradient matching the user's hardness percentage is generated onto an off-screen `brushStampCanvas` or `eraserStampCanvas`. A quadratic curve is used to simulate a smooth, Photoshop-like airbrush tail. The Eraser tool also supports a 'square' shape brush.
- **Stroke-Level Opacity:** To ensure that a continuous stroke respects the `brushStrength` or `eraserStrength` limit, stamps are drawn at 100% opacity onto a full-sized stroke canvas. On every mouse move, the engine isolates the active line segment's bounding box and draws it over a pristine snapshot of the layer. For the brush, it uses `source-in` on a color canvas. For the eraser, it uses `destination-out` compositing to seamlessly remove pixels. This creates a mathematically perfect, unified semi-transparent stroke regardless of stroke length or scrub speed.
- **Dynamic Tool Properties:** Tool options like size, hardness, spacing, and strength are managed in the contextual `#properties-bar` at the top of the workspace.

### 9. Eyedropper Tool (`js/tools.js`)
- **Canvas Flattening Sampling:** When sampling colors, the engine iterates through all visible layers from bottom to top and draws them onto a small, temporary $N \times N$ canvas.
- **Averaging:** It calculates the average RGB values of all non-transparent pixels in this sampled area, enabling Point Sample (1x1), 3x3 Average, or 5x5 Average modes.
- **Background vs Foreground:** Left-click assigns the sampled color to the foreground, while right-click (without triggering a context menu) assigns it to the background color.

## Guidelines for AI / Future Modifications (Token Saving)
- **Do not introduce build tools:** Stick to vanilla JS and CSS.
- **Rely on Globals:** When adding new tools or features, utilize the existing global state in `globals.js` rather than creating isolated state management.
- **Manual Testing Required:** We have had trouble with automated tests in the past. All AI-driven code changes must be manually tested rather than relying on automated browser test suites.
- **Text Layer Persistence:** Text layers are stored in `.vps` files with their parametric data (`textContent`, `htmlContent`, `textX`, `textY`, `type`) in the manifest alongside a rasterized PNG preview. On load, these properties are restored so text layers remain re-editable.
- **Architecture Shift for Vectors:** As the app expands to Vector layers, the History engine will need an update to store parametric data (e.g., path data) instead of raw `getImageData` to remain memory efficient. Text layers already suffer from this—the history engine currently snapshots their rasterized pixels rather than their HTML content.
- **Line Endings (LF only):** All source files in this repository use LF (`\n`) line endings — never CRLF (`\r\n`). This is critical for AI-assisted editing: the agent's `TargetContent` string matching operates on LF-terminated strings, so CRLF files cause edit failures even when the visible text looks identical. Any new files created by AI or developers must be saved with LF line endings. In VS Code this is shown in the status bar (bottom-right); ensure it reads "LF" and not "CRLF".
