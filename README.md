# VibePhotoshop - A vibe-coded Photoshop clone

All code is written by the free tier of [Google Antigravity](https://antigravity.google/), using Gemini 3.1 Pro.

https://macmillan333.github.io/VibePhotoshop/

### How I prompt

Instead of prompting "Build Photoshop", I break the project into small steps and run a "plan - implement - verify" loop for each. For each step I describe my requirement and answer any open questions in Antigravity's plan, then hit submit; I do not review or comment on the generated code.

An example prompt:

"Add a toolbar to the left of the page. We will add tools in the future. For now, add two squares in the toolbar corresponding to the current foreground and background color. They default to black and white. Clicking on these squares should bring up a color picker to change the color."

### Features

I only intend to implement a subset of Photoshop features, ones that I regularly use. Currently available features:
* Create, open and save layered project files (.vps format)
* Import and export flat images (PNG, JPEG, WebP)
* Undo and redo
* Tools
  * Move
  * Pencil
  * Brush
  * Zoom
  * Selection: rectangle, oval, polygon
  * Text
* Layers
  * Create
  * Reorder
  * Delete
  * Duplicate
  * Merge

### Browser Compatibility

VibePhotoshop uses the native [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API) for reading and writing `.vps` project files. This API is supported in:
* **Chrome / Edge** 80+
* **Firefox** 113+
* **Safari** 16.4+

Older browsers that lack `CompressionStream` / `DecompressionStream` will not be able to open or save `.vps` files.
