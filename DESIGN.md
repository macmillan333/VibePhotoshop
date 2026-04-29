# VibePhotoshop Design Language

This document outlines the design system and UI conventions for the VibePhotoshop project. Use this as a reference to maintain a consistent visual style when adding new features or UI components.

## 1. Core Philosophy
- **Dark Mode First**: The application is exclusively dark-themed.
- **Sleek & Modern**: Uses a flat design with subtle elevation (shadows) to establish visual hierarchy. Avoid skeuomorphism and heavy gradients.
- **Compact & Professional**: Designed like a desktop creative application. UI elements are compact to maximize the workspace area.

## 2. Color Palette
All colors are defined as CSS variables in `css/variables.css`. Always use the variables instead of hardcoding hex values.

### Backgrounds
- `--bg-dark` (`#121217`): The deepest background layer (used for the `body`).
- `--bg-surface` (`#1C1C23`): Standard panel backgrounds (Toolbar, Sidebars, Modals).
- `--bg-elevated` (`#2A2A35`): Hover states, active items, dropdown menus, and input fields.
- **Workspace**: The canvas container uses a slightly darker `#0d0d10` to make the image stand out.
- **Canvas Transparency**: Checked pattern using `#1A1A23` and `#242430`.

### Accents
Used for primary actions, active states, and focus rings.
- `--accent` (`#5C6BFF`): Primary indigo/blue.
- `--accent-hover` (`#717EFF`): Lighter for hover.
- `--accent-active` (`#4856E6`): Darker for active/click.

### Typography Colors
- `--text-primary` (`#EDEDF5`): High contrast for primary reading text and active UI elements.
- `--text-secondary` (`#9090A6`): Medium contrast for labels, panel titles, and inactive icons.
- `--text-muted` (`#606075`): Low contrast for disabled states or secondary borders.

### Borders
- `--border-color` (`#353545`): Standard divider and panel border.
- `--border-light` (`rgba(255, 255, 255, 0.1)`): Subtle inner borders.

## 3. Typography
- **Font Family**: `--font-family` (`'Inter', system-ui, -apple-system, sans-serif`)
- **Base Sizes**:
  - `13px`: Standard UI text (buttons, menus, layers, form labels).
  - `14px`: Input fields and empty states.
  - `15px`: Application Logo/Title.
  - `18px`: Modal Headings (`<h2>`).
- **Font Weights**:
  - `400` (Regular): Standard text.
  - `500` (Medium): Buttons, toast notifications.
  - `600` (Semi-bold): Panel titles, headings, application name.

## 4. Spacing & Sizing
We follow an 4px/8px baseline grid system for spacing (margins, padding, gaps).
- **Common Gaps**: 4px, 8px, 12px.
- **Panel Paddings**: 16px or 24px.
- **Standard UI Heights**: Toolbar is `56px`, Buttons are typically `28px` to `36px` tall.

## 5. Shape & Elevation
### Border Radius
- `--radius-sm` (`6px`): Buttons, tool icons, inputs, layer items.
- `--radius-md` (`10px`): Modals, dropdown menus.
- `--radius-lg` (`14px`): Larger containers (if applicable).
- `--radius-pill` (`9999px`): Toast notifications.

### Shadows (Elevation)
- `--shadow-sm`: `0 2px 8px rgba(0, 0, 0, 0.2)` (Toolbar, subtle elevations)
- `--shadow-md`: `0 4px 16px rgba(0, 0, 0, 0.4)` (Toast notifications)
- `--shadow-lg`: `0 10px 40px rgba(0, 0, 0, 0.5)` (Dropdowns, Modals, Context Menus)

## 6. Components & Interaction
- **Transitions**: Use `var(--transition)` (`0.2s cubic-bezier(0.16, 1, 0.3, 1)`) for all interactive state changes (color, background, transform).
- **Buttons**:
  - Primary (`.btn-primary`): Accent background, white text, subtle translateY(-1px) and shadow on hover.
  - Secondary (`.btn-secondary`): Elevated background, primary text.
  - Icon Buttons (`.tool-btn`, `.btn-icon`): Transparent by default, elevate on hover, accent color when active.
- **Inputs**: Solid `--bg-elevated` background with a `--border-color` border. On focus, border changes to `--accent` with no outline.
- **Icons**: Use SVG icons with `stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap="round"`, and `stroke-linejoin="round"`.
- **Dropdowns & Modals**: Appear with a subtle fade and slide-up animation (`transform: translateY(-4px)` to `0`). Modals use a dark blurred backdrop (`backdrop-filter: blur(4px)`).
- **Disabled States**: Reduce opacity to `0.5` (or `0.3` for icons) and set `cursor: not-allowed`.

## 7. Layout Architecture
- The app utilizes a `100vh` flexbox layout.
- `header.toolbar`: Fixed height at the top.
- `.app-body`: Flex-grow container holding the sidebars and workspace.
- `aside`: Left and right side panels with defined widths and borders facing the workspace.
- `main#workspace`: Center area using absolute positioning for the main canvas stack, allowing infinite panning/zooming if implemented.

When generating new CSS or HTML components, strictly adhere to these variables and structural patterns to ensure VibePhotoshop feels like a single, cohesive application.
