/**
 * Accessible Data-Grid — mount and interaction wiring (PRD 2)
 *
 * Layout inside the mount root:
 *   <form role="search">  filter field, rendered once and never rebuilt
 *   <p role="status">     live region, text updated once per change
 *   <section>             the grid, re-rendered on every state change
 *
 * Keeping the filter field out of the re-rendered subtree means typing never
 * loses focus or caret position. Events go through the root delegation system.
 */

import { createElement } from "./createElement.js";
import { renderToDOM } from "./renderToDOM.js";
import { attachRootEventDelegation } from "./events.js";
import { DataGrid, DEFAULT_EMPTY_MESSAGE } from "./dataGrid.js";
import { createGridController } from "./gridModel.js";

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

    const controller = createGridController({ columns: props.columns, rows: props.rows, locale: props.locale });
    const id = props.id ?? "data-grid";
    const emptyMessage = props.emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
    const filterableColumns = controller.columns.filter((column) => column.filterable === true);

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
            onSort: (key) => controller.toggleSort(key)
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

    attachRootEventDelegation(root, ["click", "submit", "input"]);
    root.replaceChildren(...[filterElement, statusElement, gridElement].filter(Boolean));

    function rerender(snapshot) {
        const active = root.ownerDocument.activeElement;
        const focusedSortKey = active && gridElement.contains(active) ? active.getAttribute("data-sort-key") : null;
        const regionWasFocused = active === gridElement;
        const scrollLeft = gridElement.scrollLeft;

        const nextGrid = renderToDOM(gridVNode(snapshot));
        gridElement.replaceWith(nextGrid);
        gridElement = nextGrid;
        gridElement.scrollLeft = scrollLeft;

        // The pressed sort button was replaced; move focus to its new copy.
        if (focusedSortKey !== null) {
            gridElement.querySelector(`[data-sort-key="${CSS.escape(focusedSortKey)}"]`)?.focus();
        } else if (regionWasFocused) {
            gridElement.focus();
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
