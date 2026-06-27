// --- DOM Elements ---
const fileMenuBtn = document.getElementById('file-menu-btn');
const fileDropdown = document.getElementById('file-dropdown');

const btnNew = document.getElementById('btn-new');
const btnOpen = document.getElementById('btn-open');
const btnSave = document.getElementById('btn-save');
const btnSaveAs = document.getElementById('btn-save-as');
const btnImport = document.getElementById('btn-import');
const btnExport = document.getElementById('btn-export');
const fileInputVps = document.getElementById('file-input-vps');
const fileInputImage = document.getElementById('file-input-image');

const editMenuBtn = document.getElementById('edit-menu-btn');
const editDropdown = document.getElementById('edit-dropdown');
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnImageSize = document.getElementById('btn-image-size');
const btnCanvasSize = document.getElementById('btn-canvas-size');
const btnFlipH = document.getElementById('btn-flip-h');
const btnFlipV = document.getElementById('btn-flip-v');
const btnFreeTransform = document.getElementById('btn-free-transform');

const imageMenuBtn = document.getElementById('image-menu-btn');
const imageDropdown = document.getElementById('image-dropdown');
const btnBlur = document.getElementById('btn-blur');
const btnHsl = document.getElementById('btn-hsl');

const viewMenuBtn = document.getElementById('view-menu-btn');
const viewDropdown = document.getElementById('view-dropdown');
const btnToggleRulers = document.getElementById('btn-toggle-rulers');
const rulersCheckmark = document.getElementById('rulers-checkmark');
const btnGuides = document.getElementById('btn-guides');

const selectMenuBtn = document.getElementById('select-menu-btn');
const selectDropdown = document.getElementById('select-dropdown');
const btnExpandSelection = document.getElementById('btn-expand-selection');
const btnContractSelection = document.getElementById('btn-contract-selection');
const btnBorderSelection = document.getElementById('btn-border-selection');
const btnFeatherSelection = document.getElementById('btn-feather-selection');

const layerContextMenu = document.getElementById('layer-context-menu');
const ctxDuplicateLayer = document.getElementById('ctx-duplicate-layer');
const ctxRasterizeLayer = document.getElementById('ctx-rasterize-layer');
const ctxMergeSelected = document.getElementById('ctx-merge-selected');
const ctxDeleteLayer = document.getElementById('ctx-delete-layer');

const transformBox = document.getElementById('transform-box');
const transformContentCanvas = document.getElementById('transform-content');

const newCanvasModal = document.getElementById('new-canvas-modal');
const newCanvasForm = document.getElementById('new-canvas-form');
const btnCancelNew = document.getElementById('btn-cancel-new');

const imageSizeModal = document.getElementById('image-size-modal');
const imageSizeForm = document.getElementById('image-size-form');
const btnCancelImageSize = document.getElementById('btn-cancel-image-size');

const canvasSizeModal = document.getElementById('canvas-size-modal');
const canvasSizeForm = document.getElementById('canvas-size-form');
const btnCancelCanvasSize = document.getElementById('btn-cancel-canvas-size');
const anchorBtns = document.querySelectorAll('.anchor-btn');

const guidesModal = document.getElementById('guides-modal');
const guidesForm = document.getElementById('guides-form');
const btnCancelGuides = document.getElementById('btn-cancel-guides');
const guideHValue = document.getElementById('guide-h-value');
const guideVValue = document.getElementById('guide-v-value');
const guidesSvg = document.getElementById('guides-svg');
let documentGuides = { horizontal: [], vertical: [] };
let isDraggingGuide = false;
let dragGuideType = null; // 'horizontal' or 'vertical'
let dragGuideIndex = -1;

const expandSelectionModal = document.getElementById('expand-selection-modal');
const expandSelectionForm = document.getElementById('expand-selection-form');
const btnCancelExpandSelection = document.getElementById('btn-cancel-expand-selection');

const contractSelectionModal = document.getElementById('contract-selection-modal');
const contractSelectionForm = document.getElementById('contract-selection-form');
const btnCancelContractSelection = document.getElementById('btn-cancel-contract-selection');

const borderSelectionModal = document.getElementById('border-selection-modal');
const borderSelectionForm = document.getElementById('border-selection-form');
const btnCancelBorderSelection = document.getElementById('btn-cancel-border-selection');

const featherSelectionModal = document.getElementById('feather-selection-modal');
const featherSelectionForm = document.getElementById('feather-selection-form');
const btnCancelFeatherSelection = document.getElementById('btn-cancel-feather-selection');

const blurModal = document.getElementById('blur-modal');
const blurForm = document.getElementById('blur-form');
const btnCancelBlur = document.getElementById('btn-cancel-blur');
const blurRadiusSlider = document.getElementById('blur-radius-slider');
const blurRadiusInput = document.getElementById('blur-radius-input');

const hslModal = document.getElementById('hsl-modal');
const hslForm = document.getElementById('hsl-form');
const btnCancelHsl = document.getElementById('btn-cancel-hsl');
const hslHueSlider = document.getElementById('hsl-hue-slider');
const hslHueInput = document.getElementById('hsl-hue-input');
const hslSatSlider = document.getElementById('hsl-sat-slider');
const hslSatInput = document.getElementById('hsl-sat-input');
const hslLightSlider = document.getElementById('hsl-light-slider');
const hslLightInput = document.getElementById('hsl-light-input');

const btnColorRangeSelection = document.getElementById('btn-color-range-selection');
const colorRangeModal = document.getElementById('color-range-modal');
const colorRangeForm = document.getElementById('color-range-form');
const colorRangePreviewCanvas = document.getElementById('color-range-preview-canvas');
const colorRangeFuzziness = document.getElementById('color-range-fuzziness');
const colorRangeFuzzinessVal = document.getElementById('color-range-fuzziness-val');
const btnCancelColorRange = document.getElementById('btn-cancel-color-range');

const cpModal = document.getElementById('custom-color-picker-modal');
const cpForm = document.getElementById('custom-color-picker-form');
const btnCancelCp = document.getElementById('btn-cancel-custom-color-picker');
const cpSvContainer = document.getElementById('cp-sv-container');
const cpSvCanvas = document.getElementById('cp-sv-canvas');
const cpSvCursor = document.getElementById('cp-sv-cursor');
const cpHueContainer = document.getElementById('cp-hue-container');
const cpHueCanvas = document.getElementById('cp-hue-canvas');
const cpHueCursor = document.getElementById('cp-hue-cursor');
const cpNewSwatch = document.getElementById('cp-new-swatch');
const cpCurrentSwatch = document.getElementById('cp-current-swatch');
const cpInputH = document.getElementById('cp-input-h');
const cpInputS = document.getElementById('cp-input-s');
const cpInputV = document.getElementById('cp-input-v');
const cpInputR = document.getElementById('cp-input-r');
const cpInputG = document.getElementById('cp-input-g');
const cpInputB = document.getElementById('cp-input-b');
const cpInputHex = document.getElementById('cp-input-hex');

let cpActiveTarget = 'fg'; // 'fg' or 'bg'
let cpCurrentH = 0;
let cpCurrentS = 100;
let cpCurrentV = 100;

const canvasWrapper = document.querySelector('.canvas-wrapper');
const canvasStack = document.getElementById('canvas-stack');
const rulerTopCanvas = document.getElementById('ruler-top');
const rulerLeftCanvas = document.getElementById('ruler-left');
const rulerMarkerX = document.getElementById('ruler-marker-x');
const rulerMarkerY = document.getElementById('ruler-marker-y');
const sidebarRight = document.getElementById('sidebar-right');
const layersList = document.getElementById('layers-list');
const btnAddLayer = document.getElementById('btn-add-layer');
const layerOpacitySlider = document.getElementById('layer-opacity-slider');
const layerOpacityValue = document.getElementById('layer-opacity-value');
const layerBlendModeSelect = document.getElementById('layer-blend-mode-select');
const noImageState = document.getElementById('no-image-state');
const toastContainer = document.getElementById('toast-container');
const layersResizer = document.getElementById('layers-resizer');

// --- State ---
let currentFileName = 'untitled.vps';
let savedFileHandle = null;       // File System Access API handle for quick-save
let lastSavedHistoryIndex = -1;   // historyIndex at last save; -1 = never saved
let documentWidth = 800;
let documentHeight = 600;
let documentCreated = false;

// Viewport State
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 32.0;
let zoomLevel = 1.0;
let panX = 0;
let panY = 0;

let showRulers = false;

let isPanning = false;
let panStartX = 0;
let panStartY = 0;

let isZoomDragging = false;
let zoomStartX = 0;
let zoomStartY = 0;
let zoomStartLevel = 1.0;

// Selection State
let selectionMask = null;
let selectionOverlay = null;
let selectionDragOverlay = null;
let selectionCtx = null;
let selectionDragCtx = null;

let isSelecting = false;
let selectStartX = 0;
let selectStartY = 0;
let selectionMode = 'replace';

let polygonPoints = [];
let polygonMode = 'replace';
let lastPolygonClickTime = 0;

let isColorRangeActive = false;
let colorRangeSampledColor = null; // {r, g, b}
let colorRangeFuzzinessValue = 40;

let isBlurActive = false;
let blurOriginalLayerData = null;

let isHslActive = false;
let hslOriginalLayerData = null;

let clipboardData = null;

// Transform Engine
let isTransforming = false;
let transformBaseX = 0, transformBaseY = 0;
let transformW = 0, transformH = 0, transformAngle = 0;
let transformOriginalLayerCanvas = null;
let transformSelectionMaskClone = null;
let transformErasedLayerCanvas = null;
let transformOp = null; // 'move', 'rotate', 'tl', 'br', etc
let transformPointerStartX = 0, transformPointerStartY = 0;
let transformOrigX = 0, transformOrigY = 0;
let transformOrigW = 0, transformOrigH = 0, transformOrigAngle = 0;
let transformHasSelection = false;

// Move Engine States
let isMoving = false;
let moveStartX = 0;
let moveStartY = 0;
let moveHasSelection = false;
let moveOriginalLayerCanvas = null;
let moveFloatingCanvas = null;
let moveErasedLayerCanvas = null;
let moveOriginalSelectionMask = null;

// Layers Subsystem
let layers = []; // Array of { id, name, canvas, ctx, visible }
let activeLayerId = null;
let layerCounter = 0;
let selectedLayerIds = new Set();
let lastClickedLayerId = null;

// History Subsystem (Undo/Redo)
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 30;

let fgColor = '#000000';
let bgColor = '#ffffff';

const toolMove = document.getElementById('tool-move');
const toolPencil = document.getElementById('tool-pencil');
const toolBrush = document.getElementById('tool-brush');
const toolEraser = document.getElementById('tool-eraser');
const toolZoom = document.getElementById('tool-zoom');
const toolRectSelect = document.getElementById('tool-rect-select');
const toolOvalSelect = document.getElementById('tool-oval-select');
const toolPolygonSelect = document.getElementById('tool-polygon-select');
const toolText = document.getElementById('tool-text');
const toolEyedropper = document.getElementById('tool-eyedropper');
const toolBtns = [toolMove, toolPencil, toolBrush, toolEraser, toolZoom, toolRectSelect, toolOvalSelect, toolPolygonSelect, toolText, toolEyedropper];

let currentTool = null;
let isDrawing = false;
let isErasing = false;
let eraserDistSinceLastStamp = 0;
let lastX = 0;
let lastY = 0;
let lastPressure = 1.0;

// Brush Subsystem
let brushRadius = 20;
let brushHardness = 50;
let brushStrength = 100;
let brushSpacing = 25;
let brushStampCanvas = document.createElement('canvas');
const brushStrokeCanvas = document.createElement('canvas');
const brushStrokeCtx = brushStrokeCanvas.getContext('2d');
const brushColorCanvas = document.createElement('canvas');
const brushColorCtx = brushColorCanvas.getContext('2d');
let brushOriginalLayerCanvas = null;
let brushDistSinceLastStamp = 0;

// Eraser Subsystem
let eraserRadius = 20;
let eraserHardness = 100;
let eraserStrength = 100;
let eraserShape = 'circle';
let eraserStampCanvas = document.createElement('canvas');
const eraserStrokeCanvas = document.createElement('canvas');
const eraserStrokeCtx = eraserStrokeCanvas.getContext('2d');
let eraserOriginalLayerCanvas = null;

let isTypingText = false;
let currentText = '';
let textX = 0;
let textY = 0;
let textLayerId = null;
let showCaret = true;
let caretBlinkInterval = null;

const fgColorInput = document.getElementById('fg-color');
const bgColorInput = document.getElementById('bg-color');
const btnSwapColors = document.getElementById('btn-swap-colors');
const btnResetColors = document.getElementById('btn-reset-colors');



const textEditor = document.getElementById('text-editor');
const textToolbar = document.getElementById('text-toolbar');
const textStyleBtns = document.querySelectorAll('.text-style-btn');
const fontFamilySelect = document.getElementById('font-family-select');
const fontSizeInput = document.getElementById('font-size-input');
const letterSpacingInput = document.getElementById('letter-spacing-input');
const lineHeightInput = document.getElementById('line-height-input');

const brushToolbar = document.getElementById('brush-toolbar');
const brushRadiusInput = document.getElementById('brush-radius-input');
const brushHardnessSlider = document.getElementById('brush-hardness-slider');
const brushHardnessInput = document.getElementById('brush-hardness-input');
const brushStrengthSlider = document.getElementById('brush-strength-slider');
const brushStrengthInput = document.getElementById('brush-strength-input');
const brushSpacingSlider = document.getElementById('brush-spacing-slider');
const brushSpacingInput = document.getElementById('brush-spacing-input');
const brushCursor = document.getElementById('brush-cursor');

const eraserToolbar = document.getElementById('eraser-toolbar');
const eraserRadiusInput = document.getElementById('eraser-radius-input');
const eraserHardnessSlider = document.getElementById('eraser-hardness-slider');
const eraserHardnessInput = document.getElementById('eraser-hardness-input');
const eraserStrengthSlider = document.getElementById('eraser-strength-slider');
const eraserStrengthInput = document.getElementById('eraser-strength-input');
const eraserShapeSelect = document.getElementById('eraser-shape-select');
const eraserCursor = document.getElementById('eraser-cursor');

const eyedropperToolbar = document.getElementById('eyedropper-toolbar');
const eyedropperSampleSizeSelect = document.getElementById('eyedropper-sample-size');
