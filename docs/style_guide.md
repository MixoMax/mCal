# Frontend Style Guide - mCal

This document outlines the stylistic choices and conventions used in the mCal frontend. It serves as a reference for implementing new UI elements and maintaining consistency.

## 1. Color Palette

The application employs a dark theme, with colors defined as CSS custom properties in `:root` for easy management and theming.

**Primary Colors:**
*   `--bg-primary: #1E1E1E` (Main background)
*   `--bg-secondary: #252525` (Slightly lighter background, e.g., sidebars, headers)
*   `--bg-tertiary: #2D2D2D` (Used for interactive elements like buttons, inputs)
*   `--bg-quaternary: #3A3A3A` (Hover states for tertiary elements)
*   `--text-primary: #E0E0E0` (Primary text color)
*   `--text-secondary: #B0B0B0` (Secondary text, less emphasis)
*   `--text-tertiary: #808080` (Tertiary text, e.g., placeholder text, disabled states)

**Accent Colors:**
*   `--accent-primary: #8A63D2` (Primary accent, e.g., main action buttons, highlights)
*   `--accent-secondary: #6A4CAD` (Darker shade of primary accent, e.g., hover states)

**Other Colors:**
*   `--border-color: #444444` (Borders for containers and elements)
*   `--error-color: #FF6B6B` (Error messages, destructive action buttons)
*   `--event-default-color: #4A90E2` (Default background color for calendar events if no specific calendar color is set)

**Usage:**
Always use these CSS variables instead of hardcoding hex values to ensure consistency.
Example: `background-color: var(--bg-secondary);`

## 2. Typography

*   **Font Family**: `var(--font-family): -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;`
    *   A system font stack is used for native look and feel and performance.
*   **Base Text Color**: `var(--text-primary)`
*   **Font Sizes**:
    *   General body text: Implicitly 16px (browser default), scaled by relative units.
    *   Logo: `1.2em`, `font-weight: bold`
    *   Header current view info: `1.1em`
    *   Sidebar "New Event" button: `1em`
    *   Mini calendar day numbers: `0.9em`
    *   Calendar section titles: `0.9em`
    *   Month/Week event text: `0.8em`
    *   Form labels: `0.9em`
    *   Modal titles (`h2`): Default `h2` size, styled within `.modal-header`.

**General Guideline:** Use `em` or `rem` for font sizes to maintain scalability and accessibility.

## 3. Layout

The application uses a combination of Flexbox and CSS Grid for layout.

*   **Overall Structure (`body`, `.app-container`):**
    *   `body`: `display: flex; flex-direction: column; height: 100vh;`
    *   `.app-container`: `display: flex; flex-grow: 1;` (Contains sidebar and main content)
*   **Main Sections:**
    *   `.app-header`: `display: flex; align-items: center;`
    *   `.sidebar`: `display: flex; flex-direction: column; width: 280px;`
    *   `.main-content`: `display: flex; flex-direction: column; flex-grow: 1;`
*   **Calendar Views:**
    *   **Month View (`.month-view-grid`, `.month-view-header`):** `display: grid; grid-template-columns: repeat(7, 1fr);`
    *   **Week View:** Uses flexbox for header rows and main scroll area, and flexbox for day columns within the grid.
        *   `.week-view-header-row`: `display: flex;`
        *   `.week-view-all-day-section`: `display: flex;`
        *   `.week-view-main-scroll`: `display: flex;`
        *   `.week-view-days-grid`: `display: flex;`
*   **Overflow Handling:**
    *   `overflow: hidden;` is used on `body` and `.app-container` to prevent top-level scrolling.
    *   `overflow-y: auto;` is applied to scrollable sections like `.sidebar`, `.month-view-grid`, `.day-cell`, and `.week-view-main-scroll`.

## 4. Component Styling

### Buttons:
*   **General Buttons (`.app-header button`, form action buttons):**
    *   Background: `var(--bg-tertiary)`
    *   Text Color: `var(--text-primary)`
    *   Border: `1px solid var(--border-color)`
    *   Padding: `8px 12px` (header), `10px 15px` (form actions)
    *   Border Radius: `4px`
    *   Hover: `background-color: var(--bg-quaternary)`
*   **Primary Action Buttons (`.sidebar .new-event-btn`, `.form-actions .btn-primary`):**
    *   Background: `var(--accent-primary)`
    *   Text Color: `white`
    *   Hover: `background-color: var(--accent-secondary)`
*   **Danger Buttons (`.form-actions .btn-danger`):**
    *   Background: `var(--error-color)`
    *   Text Color: `white`

### Forms (`.form-group`, inputs, selects, textarea):
*   Labels: `display: block; margin-bottom: 5px; font-size: 0.9em; color: var(--text-secondary);`
*   Inputs/Selects/Textarea:
    *   Width: `calc(100% - 20px)` (to account for padding)
    *   Padding: `10px`
    *   Background: `var(--bg-tertiary)`
    *   Border: `1px solid var(--border-color)`
    *   Text Color: `var(--text-primary)`
    *   Border Radius: `3px`
*   Checkbox accent color: `var(--accent-primary)`

### Modals (`.modal`, `.modal-content`):
*   Overlay: `background-color: rgba(0,0,0,0.6);`
*   Content Box:
    *   Background: `var(--bg-secondary)`
    *   Padding: `20px`
    *   Border: `1px solid var(--border-color)`
    *   Border Radius: `5px`
    *   Max Width: `500px`
    *   Uses flex for centering: `display: flex; align-items: center; justify-content: center;` (on `.modal`)
*   Header: `display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);`

### Calendar Specific Elements:
*   **Mini Calendar (`.mini-calendar-grid`):** `display: grid; grid-template-columns: repeat(7, 1fr);`
    *   `.today`: `background-color: var(--accent-primary); color: white;`
    *   `.selected`: `outline: 2px solid var(--accent-secondary);`
*   **Month View Day Cells (`.day-cell`):**
    *   Borders: `border-right`, `border-bottom` with `var(--border-color)`
    *   `.today .day-number`: Styled as a circle with `var(--accent-primary)` background.
*   **Week View Time Slots/Hour Lines:**
    *   Time Gutter Slots: `height: 50px; border-bottom: 1px dashed var(--border-color);`
    *   Day Column Hour Lines: `height: 50px; border-bottom: 1px solid var(--border-color);`
*   **Event Items (`.month-event`, `.week-event`):**
    *   Default Background: `var(--bg-tertiary)` (overridden by calendar color via JS)
    *   Text Color: `var(--text-primary)` (adjusted by JS `isColorDark` function based on background)
    *   Border Radius: `3px`
    *   Padding: `2px 4px` (month), `3px 5px` (week)
    *   Overflow: `hidden`, `text-overflow: ellipsis` for long titles.
    *   Week events are absolutely positioned.

## 5. Naming Conventions

The project loosely follows a BEM-like (Block, Element, Modifier) naming convention.
*   **Block:** Represents a standalone component (e.g., `.app-header`, `.sidebar`, `.mini-calendar`, `.modal`).
*   **Element:** Represents a part of a block (e.g., `.app-header .logo`, `.mini-calendar-grid`, `.day-cell .day-number`). Elements are typically separated by a space in selectors (descendant selector) or can use double underscores if strictly BEM (e.g. `mini-calendar__grid`). Current code uses descendant selectors more often.
*   **Modifier:** Represents a different state or version of a block or element (e.g., `.day-cell.today`, `.mini-calendar-day.selected`, `.btn-primary`, `.hidden`). Modifiers are typically chained with the block or element class.

**Example:**
```css
/* Block */
.mini-calendar { /* ... */ }

/* Element within .mini-calendar */
.mini-calendar-grid { /* ... */ }
.mini-calendar-day-name { /* ... */ }

/* Modifier for .mini-calendar-day */
.mini-calendar-day.today { /* ... */ }
.mini-calendar-day.selected { /* ... */ }
```
When adding new elements, try to adhere to this pattern for clarity and maintainability.

## 6. CSS Variables (Custom Properties)

As mentioned in the Color Palette section, CSS variables are extensively used for:
*   Colors (backgrounds, text, borders, accents)
*   Font family

This is crucial for theming and makes global style changes easier. All new style rules involving colors or fonts should utilize these variables.

## 7. JavaScript Interaction with Styles

JavaScript plays a role in dynamically altering styles:

*   **Toggling Visibility:** The `.hidden` class (`display: none !important;`) is added/removed by JS to show/hide elements like modals and different calendar views.
*   **Dynamic Content Styling:**
    *   Event background colors are set dynamically based on the event's calendar color using `element.style.backgroundColor`.
    *   Event text color is dynamically adjusted (light/dark) based on the background color's brightness using the `isColorDark` function and `element.style.color`.
    *   The `.today` and `.selected` classes are dynamically added to date elements.
*   **Element Creation:** JS creates and appends DOM elements for calendar grids, event items, etc., assigning appropriate classes.

When JS needs to manipulate styles, prefer adding/removing classes over direct inline style manipulation, unless the style is truly dynamic and unique to that instance (like event colors).

## 8. File Structure

The frontend code is organized as follows:

*   `web-frontend/`
    *   `index.html`: Main HTML structure, includes CSS within `<style>` tags and JavaScript via `<script>` tag at the end of the body.
    *   `script.js`: Contains all JavaScript logic for the application. (Note: The provided `index.html` has the script embedded. If `script.js` is separate, it should be linked.)
    *   `style.css`: Contains all CSS rules. (Note: The provided `index.html` has the styles embedded. If `style.css` is separate, it should be linked.)
    *   `docs/`
        *   `style_guide.md`: This document.

For new components, if they become complex, consider if breaking down CSS or JS into more modular files would be beneficial, though the current structure is flat.

## 9. General Guidelines for New Elements

*   **Reuse Existing Styles:** Before writing new CSS, check if existing classes or utility classes (like `.hidden`) can be used.
*   **Use CSS Variables:** For colors and fonts, always use the defined CSS custom properties.
*   **Follow Naming Conventions:** Apply BEM-like naming for new classes.
*   **Responsive Considerations:** While not explicitly detailed, keep responsive design in mind. Use relative units and flex/grid properties that adapt well.
*   **Accessibility (A11y):**
    *   Use semantic HTML where appropriate.
    *   Ensure sufficient color contrast (the `isColorDark` function helps with event text).
    *   Provide ARIA attributes if creating custom interactive components.
*   **Consistency:** Strive to make new elements look and behave consistently with existing parts of the application.
