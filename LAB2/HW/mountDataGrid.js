/**
 * Accessible Data-Grid — mount and interaction wiring (PRD 2, PRD 3, PRD 4)
 *
 * Layout inside the mount root:
 *   <form role="search">  filter field, rendered once and never rebuilt
 *   <p role="status">     live region, text updated once per change
 *   <section>             the grid, re-rendered on every state change
 *   <p>                   rows-per-page select, rendered once
 *   <nav>                 pager, re-rendered on every state change
 *
 * Form controls live outside the re-rendered subtrees, so using them never
 * loses focus or caret position. Re-rendered buttons get focus back after
 * each render. Events go through the root delegation system.
 *
 * Keyboard model (WAI-ARIA APG grid pattern, PRD 4): the grid is one Tab stop
 * with a roving tabindex. Arrow keys, Home/End and Ctrl+Home/End move between
 * cells without re-rendering; Page Up/Down change page; Enter selects only the
 * focused row and Space toggles it. Native buttons and checkboxes keep their
 * own Enter/Space behaviour.
 */

import { createElement } from "./createElement.js";
import { renderToDOM } from "./renderToDOM.js";
import { attachRootEventDelegation } from "./events.js";
import { DataGrid, DEFAULT_EMPTY_MESSAGE } from "./dataGrid.js";
import { createGridController } from "./gridModel.js";
import { Pager, PageSizeSelect } from "./pager.js";

export const DEFAULT_FILTER_DEBOUNCE_MS = 200;

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function listLabels(columns) {
    const labels = columns.map((column) => column.label);
    if (labels.length <= 1) return labels.join("");
    return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function createFilterForm({ id, caption, filterableColumns, onInput, onSubmit }) {
    const inputId = `${id}-filter`;
    const hintId = `${id}-filter-hint`;
    return createElement("form", {
        role: "search",
        className: "data-grid-filter",
        "aria-label": `Filter ${caption}`,
        onSubmit
    },
        createElement("label", { for: inputId, className: "data-grid-filter__label" }, "Filter rows"),
        createElement("input", {
            id: inputId,
            type: "search",
            name: "filter",
            autocomplete: "off",
            className: "data-grid-filter__input",
            "aria-controls": id,
            "aria-describedby": hintId,
            onInput
        }),
        createElement("p", { id: hintId, className: "data-grid-filter__hint" },
            `Searches ${listLabels(filterableColumns)}.`)
    );
}

/**
 * Mount an interactive Data-Grid into root.
 * Everything is validated and rendered before root is touched.
 */
export function mountDataGrid(root, props, options = {}) {
    if (!root || root.nodeType !== 1 || typeof root.replaceChildren !== "function") {
        throw new TypeError("Data-Grid: mount root must be a valid DOM element.");
    }
    if (!isPlainObject(props)) {
        throw new TypeError("Data-Grid: props must be a plain object.");
    }
    if (!isPlainObject(options)) {
        throw new TypeError("Data-Grid: options must be a plain object.");
    }
    const { filterDebounceMs = DEFAULT_FILTER_DEBOUNCE_MS } = options;
    if (typeof filterDebounceMs !== "number" || !Number.isFinite(filterDebounceMs) || filterDebounceMs < 0) {
        throw new TypeError("Data-Grid: filterDebounceMs must be a non-negative number.");
    }

    const controller = createGridController({
        columns: props.columns,
        rows: props.rows,
        locale: props.locale,
        pageSize: props.pageSize,
        pageSizeOptions: props.pageSizeOptions
    });
    const id = props.id ?? "data-grid";
    const emptyMessage = props.emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
    const filterableColumns = controller.columns.filter((column) => column.filterable === true);
    // Column 0 is the selection checkbox column; row 0 is the header row.
    const columnCount = controller.columns.length + 1;
    let activeCell = { row: 0, col: 0 };

    function clampCell(cell, rowCount) {
        return {
            row: Math.min(Math.max(cell.row, 0), rowCount),
            col: Math.min(Math.max(cell.col, 0), columnCount - 1)
        };
    }

    function gridVNode(snapshot) {
        const query = snapshot.filterText.trim();
        return DataGrid({
            id,
            caption: props.caption,
            locale: props.locale,
            columns: controller.columns,
            rows: [...snapshot.rows],
            emptyMessage: query === "" ? emptyMessage : `No rows match “${query}”.`,
            sortKey: snapshot.sortKey,
            sortDirection: snapshot.sortDirection,
            onSort: (key) => controller.toggleSort(key),
            rowCount: snapshot.visibleCount,
            firstRowIndex: snapshot.firstRowIndex,
            interaction: {
                activeCell,
                rowIds: [...snapshot.rowIds],
                selectedIds: [...snapshot.selectedIds],
                onToggleRow: (rowId) => controller.toggleRow(rowId),
                onTogglePage: togglePageSelection,
                onKeyDown: handleGridKeyDown,
                onFocusIn: handleGridFocusIn
            }
        });
    }

    // --- Selection ---
    function togglePageSelection() {
        const { rowIds, selectedIds } = controller.getSnapshot();
        const allSelected = rowIds.length > 0 && rowIds.every((rowId) => selectedIds.includes(rowId));
        controller.setRowsSelected([...rowIds], !allSelected);
    }

    /** The select-all box is "mixed" when only some rows on the page are selected. */
    function syncSelectAll(snapshot) {
        const box = gridElement.querySelector("thead input[type=checkbox]");
        const selectedOnPage = snapshot.rowIds.filter((rowId) => snapshot.selectedIds.includes(rowId)).length;
        box.indeterminate = selectedOnPage > 0 && selectedOnPage < snapshot.rowIds.length;
    }

    // --- Roving tabindex and keyboard navigation ---
    function focusTargetAt(row, col) {
        const cell = gridElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return null;
        // A cell holding a native control hands focus to the control.
        return cell.querySelector("button, input") ?? cell;
    }

    /** Move the single tabindex="0" to (row, col) without re-rendering. */
    function setActiveCell(row, col, { focus = true } = {}) {
        const next = focusTargetAt(row, col);
        if (!next) return;
        const previous = focusTargetAt(activeCell.row, activeCell.col);
        if (previous && previous !== next) previous.tabIndex = -1;
        next.tabIndex = 0;
        activeCell = { row, col };
        if (focus) next.focus();
    }

    function handleGridFocusIn(event) {
        // Mouse clicks and programmatic focus keep the roving tabindex in step.
        const cell = event.target.closest("[data-row]");
        if (cell && gridElement.contains(cell)) {
            setActiveCell(Number(cell.dataset.row), Number(cell.dataset.col), { focus: false });
        }
    }

    function handleEnter(event, row, col) {
        // A focused sort button sorts natively on Enter.
        if (event.target.tagName === "BUTTON") return;
        event.preventDefault();
        if (row === 0) {
            if (col === 0) togglePageSelection();
            return;
        }
        controller.selectOnly(controller.getSnapshot().rowIds[row - 1]);
    }

    function handleSpace(event, row) {
        // Buttons and checkboxes already turn Space into a click.
        if (event.target.tagName === "BUTTON" || event.target.type === "checkbox") return;
        event.preventDefault(); // never scroll the page from inside the grid
        if (row > 0) controller.toggleRow(controller.getSnapshot().rowIds[row - 1]);
    }

    function handleGridKeyDown(event) {
        const cell = event.target.closest("[data-row]");
        if (!cell || !gridElement.contains(cell)) return;
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        const snapshot = controller.getSnapshot();
        const lastRow = snapshot.rows.length;
        const lastCol = columnCount - 1;
        const jump = event.ctrlKey || event.metaKey;
        let target;

        switch (event.key) {
            case "ArrowUp": target = [row - 1, col]; break;
            case "ArrowDown": target = [row + 1, col]; break;
            case "ArrowLeft": target = [row, col - 1]; break;
            case "ArrowRight": target = [row, col + 1]; break;
            case "Home": target = jump ? [0, 0] : [row, 0]; break;
            case "End": target = jump ? [lastRow, lastCol] : [row, lastCol]; break;
            case "PageUp":
            case "PageDown": {
                event.preventDefault();
                const page = snapshot.page + (event.key === "PageDown" ? 1 : -1);
                // Focus stays in the same row and column; rerender restores it.
                if (page >= 1 && page <= snapshot.pageCount) controller.setPage(page);
                return;
            }
            case "Enter": handleEnter(event, row, col); return;
            case " ": handleSpace(event, row); return;
            default: return;
        }

        event.preventDefault(); // arrows must not scroll the page
        // Clamping stops at the edges instead of wrapping.
        const next = clampCell({ row: target[0], col: target[1] }, lastRow);
        setActiveCell(next.row, next.col);
    }

    function pagerVNode(snapshot) {
        return Pager({
            caption: props.caption,
            page: snapshot.page,
            pageCount: snapshot.pageCount,
            onPage: (page) => controller.setPage(page)
        });
    }

    // --- Debounced filter input ---
    let pendingFilter = null;
    let filterTimer = null;
    function flushFilter() {
        clearTimeout(filterTimer);
        filterTimer = null;
        if (pendingFilter === null) return;
        const value = pendingFilter;
        pendingFilter = null;
        controller.setFilter(value);
    }
    function handleFilterInput(event) {
        pendingFilter = event.target.value;
        clearTimeout(filterTimer);
        filterTimer = setTimeout(flushFilter, filterDebounceMs);
    }
    function handleFilterSubmit(event) {
        // Enter in the field applies the filter now instead of reloading the page.
        event.preventDefault();
        flushFilter();
    }

    // Build every node first: a validation error leaves root untouched.
    const initial = controller.getSnapshot();
    let gridElement = renderToDOM(gridVNode(initial));
    let pagerElement = renderToDOM(pagerVNode(initial));
    const pageSizeElement = renderToDOM(PageSizeSelect({
        id,
        pageSize: initial.pageSize,
        options: initial.pageSizeOptions,
        onChange: (event) => controller.setPageSize(Number(event.target.value))
    }));
    const statusElement = renderToDOM(createElement("p", {
        id: `${id}-status`,
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        className: "data-grid__status"
    }, controller.describe(initial)));
    const filterElement = filterableColumns.length > 0
        ? renderToDOM(createFilterForm({
            id,
            caption: props.caption,
            filterableColumns,
            onInput: handleFilterInput,
            onSubmit: handleFilterSubmit
        }))
        : null;

    attachRootEventDelegation(root, ["click", "submit", "input", "keydown", "focusin"]);
    root.replaceChildren(...[filterElement, statusElement, gridElement, pageSizeElement, pagerElement].filter(Boolean));
    syncSelectAll(initial);

    function restorePagerFocus(action) {
        const same = pagerElement.querySelector(`[data-page-action="${CSS.escape(action)}"]`);
        // A button that just became disabled (Next on the last page) cannot hold
        // focus, so fall back to the current page, then to the grid.
        const target = same && !same.disabled ? same
            : pagerElement.querySelector("[aria-current=page]") ?? focusTargetAt(activeCell.row, activeCell.col);
        target.focus();
    }

    function rerender(snapshot) {
        const active = root.ownerDocument.activeElement;
        const gridHadFocus = Boolean(active) && gridElement.contains(active);
        const focusedPageAction = active && pagerElement.contains(active) ? active.getAttribute("data-page-action") : null;
        const scrollLeft = gridElement.scrollLeft;

        // Fewer rows after a filter or page change: keep the active cell inside the grid.
        activeCell = clampCell(activeCell, snapshot.rows.length);
        const nextGrid = renderToDOM(gridVNode(snapshot));
        gridElement.replaceWith(nextGrid);
        gridElement = nextGrid;
        gridElement.scrollLeft = scrollLeft;

        const nextPager = renderToDOM(pagerVNode(snapshot));
        pagerElement.replaceWith(nextPager);
        pagerElement = nextPager;

        syncSelectAll(snapshot);

        // Focused elements were replaced; move focus to their new copies.
        if (gridHadFocus) {
            focusTargetAt(activeCell.row, activeCell.col)?.focus();
        } else if (focusedPageAction !== null) {
            restorePagerFocus(focusedPageAction);
        }
        statusElement.textContent = controller.describe(snapshot);
    }

    let mounted = true;
    const unsubscribe = controller.subscribe((snapshot) => {
        if (mounted) rerender(snapshot);
    });

    return Object.freeze({
        controller,
        get element() { return gridElement; },
        get pager() { return pagerElement; },
        get activeCell() { return { ...activeCell }; },
        flushFilter,
        dispose() {
            if (!mounted) return;
            mounted = false;
            clearTimeout(filterTimer);
            unsubscribe();
            root.replaceChildren();
        }
    });
}
