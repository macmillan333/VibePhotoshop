# VibePhotoshop Architecture Overview

## Project Goals
The end goal of VibePhotoshop is to implement a robust subset of Photoshop features directly in the browser. While it is currently a fundamental bitmap editor, future expansions are planned to include:
- Text layers
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
- **Visual Overlays:** Selection marquees (marching ants) and dragged selection previews are rendered to dedicated `selectionOverlay` and `selectionDragOverlay` canvases layered on top of the document.

### 4. History / Undo-Redo (`js/history.js`)
- **Deep Pixel Snapshots:** The history engine takes deep snapshots of the entire document state.
- **Memory Storage:** Uses `getImageData` to store raw pixel arrays for every layer upon significant actions. When restoring a state, it clears the canvases and uses `putImageData` to revert.
- **Cap:** History is currently capped at `MAX_HISTORY` states to prevent browser memory exhaustion.

### 5. Tools & Transform Engine (`js/tools.js`)
- **Pointer Events:** Canvas interaction is driven by `pointerdown`, `pointermove`, and `pointerup` to seamlessly support both mouse and tablet/pen inputs.
- **Transform/Move:** Complex operations like Free Transform manage their own temporary DOM canvases (`moveFloatingCanvas`, `transformErasedLayerCanvas`) to visually preview transformations before mathematically committing the final pixels back to the active layer.

## Guidelines for AI / Future Modifications (Token Saving)
- **Do not introduce build tools:** Stick to vanilla JS and CSS.
- **Rely on Globals:** When adding new tools or features, utilize the existing global state in `globals.js` rather than creating isolated state management.
- **Architecture Shift for Vectors/Text:** As the app expands to Text and Vector layers, the History engine will need an update to store parametric data (e.g., font size, path data) instead of raw `getImageData` to remain memory efficient.
