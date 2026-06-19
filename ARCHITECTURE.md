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
- **Modular Architecture:** The codebase is split into modular subsystems (e.g., `layers.js`, `tools.js`, `brush.js`, `eraser.js`, `viewport.js`, `utils.js`, `modal-drag.js`, `components/*.css`) which are loaded sequentially via `<script defer>` in `index.html`.

## Core Subsystems & State Management

### 1. Global State (`js/globals.js`)
Pure variable declarations — no event handlers or logic. All central application state is maintained globally to allow seamless interaction between different modules without complex dependency injection. Key state variables include:
- `layers`: Array of layer objects containing their DOM `<canvas>` elements and 2D contexts.
- `activeLayerId` / `selectedLayerIds`: State tracking for active and multi-selected layers.
- `history`: Array of state snapshots for undo/redo functionality.
- `selectionMask`: A 1D `Uint8Array` matching the document dimensions, tracking alpha selection data per pixel (0-255).
- `currentTool`: Tracks the currently active tool instance.

### 2. Layer Management (`js/layers.js`)
- **Native Canvas Stacking:** Each layer is an independent `<canvas>` element injected into the `#canvas-stack` container.
- **Hardware Compositing:** Visual compositing is handled natively by the browser engine using CSS `z-index`, avoiding continuous manual redrawing of a master canvas.
- **DOM Integration:** Layer thumbnails and visibility toggles are synchronized with the DOM list.

### 3. Selection Engine (`js/tools.js`, `js/utils.js`, `js/selection.js`)
- **Bitmap Masking:** Selection is driven by a `Uint8Array` (`selectionMask`). Operations like copying, cutting, or transforming use this array as an alpha mask against the active layer.
- **Shape Tools:** Marquee tools (Rect, Oval) and Path tools (Polygon) rasterize vector paths or shapes onto a temporary canvas, read the resulting alpha map via `getImageData`, and merge the pixel values into the `selectionMask` (supporting Add/Subtract/Replace modes).
- **Selection Modifications (`js/selection.js`):** The Select menu offers Euclidean distance-based mathematical operations to modify the active selection:
  - **Expand/Contract:** Uses radius-based Euclidean distance comparisons against boundary pixels to uniformly grow or shrink the selection area.
  - **Border:** Hollows out the existing selection to create a uniform stroke along the boundary, implemented via a combined mathematical expansion and contraction.
  - **Feather:** Simulates a Gaussian blur on the selection mask using a high-performance 3-pass Box Blur algorithm directly on the `Uint8Array`, producing smooth, Photoshop-accurate falloffs.
  - **Color Range:** Opens a non-modal dialog that lets the user click anywhere on the canvas to sample a color (overriding the active tool's cursor to an eyedropper via a `color-range-active` CSS class on `#canvas-stack`). A fuzziness slider (0–200) controls the tolerance. The preview canvas renders a live black-and-white mask showing partial selection intensity — pixels matching the sampled color exactly are fully white (100% selected), fading linearly to black (0%) as the Euclidean RGB distance approaches the fuzziness threshold. On confirmation, the generated mask is committed to `selectionMask`, producing soft/partial selections.
- **Visual Overlays:** Selection marquees (marching ants) and dragged selection previews are rendered to dedicated `selectionOverlay` and `selectionDragOverlay` canvases layered on top of the document.
- **Shared Helpers (`js/utils.js`):** Common selection operations — `hasSelection()`, `getSelectionBounds()`, `extractSelectionRegion()`, and `shiftSelectionMask()` — are consolidated in `utils.js` and called from `tools.js`, `events.js`, and `transform.js`.

### 4. History / Undo-Redo (`js/history.js`)
- **Deep Pixel Snapshots:** The history engine takes deep snapshots of the entire document state.
- **Memory Storage:** Uses `getImageData` to store raw pixel arrays for every layer upon significant actions. When restoring a state, it clears the canvases and uses `putImageData` to revert.
- **Cap:** History is currently capped at `MAX_HISTORY` states to prevent browser memory exhaustion.

### 5. Tools & Transform Engine (`js/tools.js`, `js/viewport.js`)
- **Pointer Events:** Canvas interaction is driven by `pointerdown`, `pointermove`, and `pointerup` to seamlessly support both mouse and tablet/pen inputs. `tools.js` acts as the central dispatcher, delegating to tool-specific handlers in `brush.js`, `eraser.js`, etc.
- **Viewport, Rulers & Guides (`js/viewport.js`):** Pan/zoom logic (`applyViewport`, `zoomAtPoint`) and canvas coordinate translation (`getCanvasCoords`, `getExactCanvasCoords`) are encapsulated here. The viewport dynamically renders top and left UI Rulers that scale tick intervals based on zoom level. 1px CSS div markers driven by global `pointermove` events live-track the user's cursor across the rulers. Guides are implemented as an SVG overlay (`<svg id="guides-svg">`) inside the canvas stack, leveraging `vector-effect="non-scaling-stroke"` to keep lines exactly 1 physical pixel wide at any zoom level without consuming bitmap memory. Tool coordinates automatically snap to guides within a fixed screen-pixel radius unless bypassed with the `Ctrl`/`Cmd` key. Guides are manipulated via the Move tool.
- **Transform/Move:** Complex operations like Free Transform manage their own temporary DOM canvases (`moveFloatingCanvas`, `transformErasedLayerCanvas`) to visually preview transformations before mathematically committing the final pixels back to the active layer.

### 6. Text Tool (`js/tools.js`, `js/text-tool.js`, `css/components/text-toolbar.css`)
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

### 8. Brush & Eraser Engine (`js/brush.js`, `js/eraser.js`, `js/utils.js`)
- **Distance-Based Spacing:** To prevent "alpha build-up" (where stamping a soft brush too densely causes it to look hard), the engine mathematically tracks mouse dragging distance and stamps only when the distance exceeds the configured percentage of the brush's diameter (`brushSpacing`, defaults to 25%).
- **Off-Screen Stamping:** When settings change, a radial gradient matching the user's hardness percentage is generated onto an off-screen `brushStampCanvas` or `eraserStampCanvas`. The shared helper `generateCircleStamp()` in `utils.js` produces the gradient for both tools; a quadratic curve simulates a smooth, Photoshop-like airbrush tail. The Eraser tool also supports a 'square' shape brush.
- **Stroke-Level Opacity:** To ensure that a continuous stroke respects the `brushStrength` or `eraserStrength` limit, stamps are drawn at 100% opacity onto a full-sized stroke canvas. On every mouse move, the shared helper `compositeStrokeBoundingBox()` in `utils.js` isolates the active line segment's bounding box and draws it over a pristine snapshot of the layer. For the brush, it uses `source-in` on a color canvas. For the eraser, it uses `destination-out` compositing to seamlessly remove pixels. This creates a mathematically perfect, unified semi-transparent stroke regardless of stroke length or scrub speed.
- **Dynamic Tool Properties:** Tool options like size, hardness, spacing, and strength are managed in the contextual `#properties-bar` at the top of the workspace. Toolbar event listeners live in their respective files (`brush.js`, `eraser.js`).

### 9. Eyedropper Tool (`js/tools.js`)

- **Canvas Flattening Sampling:** When sampling colors, the engine iterates through all visible layers from bottom to top and draws them onto a small, temporary $N \times N$ canvas.
- **Averaging:** It calculates the average RGB values of all non-transparent pixels in this sampled area, enabling Point Sample (1x1), 3x3 Average, or 5x5 Average modes.
- **Background vs Foreground:** Left-click assigns the sampled color to the foreground, while right-click (without triggering a context menu) assigns it to the background color.

### 10. Filters Engine (`js/filters.js`)
- **Real-Time Previews**: Filtering features like Gaussian Blur (`applyGaussianBlurPreview`) and Hue/Saturation/Lightness (`applyHSLPreview`) operate non-destructively for previews by reading from a cached pristine snapshot (`blurOriginalLayerData`, `hslOriginalLayerData`). These live previews are rendered directly to the active canvas, correctly respecting alpha compositing and active selection masks, and can be instantly reverted if the user cancels.
- **Gaussian Blur Algorithm**: Simulated using a 3-pass 1D Box Blur algorithm on `Float32Array` channels, providing $O(1)$ performance independent of the blur radius. Out-of-bounds pixel accesses are clamped to repeat edge pixels, avoiding dark borders.
- **Color Adjustments (HSL)**: Hue/Saturation/Lightness operates by transforming each non-transparent pixel from RGB to HSL color space (`rgbToHsl`), applying linear numeric offsets to the components (while carefully handling edge cases like achromatic greys preventing artificial saturation injection), and converting back to RGB (`hslToRgb`).
- **Alpha Correction**: For spatial filters like blur, colors are properly pre-multiplied by their alpha channel before the pass and un-premultiplied afterward, preventing "dirty gray" artifacts in transparent areas. HSL similarly un-premultiplies alpha before color conversion to prevent transparent black fringes from distorting hue calculations.
- **Selection Integration**: All filters natively respect the global `selectionMask`, using the mask's alpha channel to linearly composite the modified pixel over the original, supporting Photoshop-accurate soft/feathered selection borders.

### 11. Draggable Modals (`js/modal-drag.js`)
- **Title Bar Dragging:** All `<dialog class="modal">` elements are draggable by their `<h2>` title bar. The script is a self-contained IIFE with no dependencies on global state.
- **Pointer Capture:** Dragging uses `setPointerCapture` on the `<h2>` handle for reliable tracking even when the cursor moves fast.
- **Positioning Strategy:** On drag start, the dialog's current `getBoundingClientRect()` position is captured, the browser's default centering (`inset: 0` + `margin: auto`) is replaced with explicit `position: fixed` / `left` / `top`, and mouse deltas are applied from there.
- **Re-centering on Reopen:** A `MutationObserver` watches each dialog's `open` attribute and clears all inline positioning overrides (including `inset`) when the dialog reopens, restoring the browser's native centering.

## Guidelines for AI / Future Modifications (Token Saving)
- **Do not introduce build tools:** Stick to vanilla JS and CSS.
- **Rely on Globals:** When adding new tools or features, utilize the existing global state in `globals.js` rather than creating isolated state management.
- **Manual Testing Required:** We have had trouble with automated tests in the past. All AI-driven code changes must be manually tested rather than relying on automated browser test suites.
- **Text Layer Persistence:** Text layers are stored in `.vps` files with their parametric data (`textContent`, `htmlContent`, `textX`, `textY`, `type`) in the manifest alongside a rasterized PNG preview. On load, these properties are restored so text layers remain re-editable.
- **Architecture Shift for Vectors:** As the app expands to Vector layers, the History engine will need an update to store parametric data (e.g., path data) instead of raw `getImageData` to remain memory efficient. Text layers already suffer from this—the history engine currently snapshots their rasterized pixels rather than their HTML content.
- **Line Endings (LF only):** All source files in this repository use LF (`\n`) line endings — never CRLF (`\r\n`). This is critical for AI-assisted editing: the agent's `TargetContent` string matching operates on LF-terminated strings, so CRLF files cause edit failures even when the visible text looks identical. Any new files created by AI or developers must be saved with LF line endings. In VS Code this is shown in the status bar (bottom-right); ensure it reads "LF" and not "CRLF".
