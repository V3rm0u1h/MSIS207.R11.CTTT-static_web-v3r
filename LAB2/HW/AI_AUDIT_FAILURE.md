# AI Failure Audit — Accessible Data-Grid

Defects found in the AI-generated plan (the four PRDs) and the code produced
from it while building the Data-Grid on the Mini-React core.

## Defect 1 — Grid State Planned on a Global `useState` Store

### Defect Description

PRD 2 specified that the grid's sort and filter state would be held with
the existing `useState` hook. That hook stores every value in one
module-level array shared by the whole page:

export const stateStore = [];

Two grids on one page would read and write the same slots. The store is
never cleared, so each test that mounted a new grid would also inherit the
previous grid's state.

### Diagnostic Method

`state.js` and `useState.js` were reviewed before writing the sorting code.
The hook claims slots by a global cursor (`stateCursor`), so state belongs
to call order rather than to a component instance.

The design was compared against the pattern already used in
`asyncDataComponent.js`, which keeps state inside a controller instance.

### Refactored Solution

State moved into a DOM-free controller created per grid in `gridModel.js`:

createGridController({ columns, rows, locale })

Each controller keeps its own state in a closure. All changes go through
`toggleSort`, `setFilter`, `setPage`, `setPageSize` and the selection
methods, and subscribers are notified once per change. The PRD 2 text was
corrected to match.

---

## Defect 2 — Renderer and Event System Rejected Grid Features

### Defect Description

The Mini-React core copied from `EXERCISE/sources` could not render or wire
up the grid's required features:

- `renderToDOM.js` throws `unsupported prop "scope"` for table attributes
  that are not on its allow-list (`scope`, `colspan`, `datetime`, and others).
- `events.js` only delegated `click` and `submit`, so the filter field
  (`input`) and arrow-key navigation (`keydown`, `focusin`) had no event
  path.

### Diagnostic Method

`applyProps` in `renderToDOM.js` and `SUPPORTED_EVENT_TYPES` in `events.js`
were read before implementation and checked against every attribute and
event the PRDs required.

### Refactored Solution

The HW copies of the core were extended without changing their safety rules:

- Allow-list: added `scope`, `colspan`, `rowspan`, `headers`, `abbr` and
  `datetime`.
- Delegated events: added `input`, `keydown` and `focusin`, with matching
  `onInput`, `onKeyDown` and `onFocusIn` props.

Unknown props are still rejected, `innerHTML` is still blocked, and the
originals in `EXERCISE/sources` are unchanged.

---

## Defect 3 — Submit Test Read the Event Too Early

### Defect Description

The test for "Enter in the filter applies it and does not reload the page"
attached its own `submit` listener to the `<form>`. It reported that the
default action was not prevented, even though the grid prevents it.

### Diagnostic Method

The first headless Chrome run of the PRD 2 suite gave 53/54 passing:

FAIL: submitting the filter applies it immediately and prevents navigation — Default submit prevented

The event path was traced. During bubbling, the form's own listener runs
before the root's delegated listener, which is where `preventDefault()`
is called. The production code was correct; the test checked
`defaultPrevented` before the handler had run.

### Refactored Solution

The test now listens on an ancestor of the delegation root, so it reads the
event after the grid's handler:

sandbox().addEventListener("submit", ..., { once: true });

The suite then passed 54/54.

---

## Defect 4 — `aria-rowcount` Off by One in the PRD

### Defect Description

PRD 3 said the table's `aria-rowcount` should equal the number of filtered
rows. ARIA counts every row in the table, including the header row. Following
the PRD would have made screen readers announce wrong row positions,
such as "row 11 of 47" instead of "row 12 of 48".

### Diagnostic Method

The PRD wording was checked against the ARIA definitions of `aria-rowcount`
and `aria-rowindex`, both of which are 1-based and include header rows.

### Refactored Solution

`dataGrid.js` counts the header row:

- table: `aria-rowcount = rowCount + 1`
- header row: `aria-rowindex = 1`
- data rows: `aria-rowindex = firstRowIndex + index + 2`

Both attributes are left out when the page has no data rows. The test
"DataGrid sets aria-rowcount and aria-rowindex for a page" checks
47 rows → `aria-rowcount="48"`.

---

## Defect 5 — Two Tab Stops for One Grid

### Defect Description

PRD 1 gave the grid's scroll wrapper `tabindex="0"`, so keyboard users could
scroll a wide table. PRD 4 then added a roving tabindex inside the table.
Together they created two Tab stops for one widget (the wrapper and the
active cell), which breaks the "grid is one Tab stop" rule of the WAI-ARIA
grid pattern.

### Diagnostic Method

The Tab order was reviewed while designing PRD 4's roving tabindex. A test
now asserts the rule directly: exactly one element in the grid has
`tabindex="0"`, and the scroll region has no `tabindex`.

### Refactored Solution

The wrapper is only focusable when the table is static:

tabindex: grid ? null : 0

In grid mode, focusing a cell scrolls it into view, so the region stays
keyboard-scrollable. axe-core reports no `scrollable-region-focusable`
violation, and Lighthouse Accessibility scores 100 on mobile and desktop.
