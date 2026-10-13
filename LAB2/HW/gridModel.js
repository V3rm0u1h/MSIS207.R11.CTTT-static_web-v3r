/**
 * Accessible Data-Grid — PRD 2: sorting and filtering model
 *
 * DOM-free state for the grid. Data flows one way:
 *   rows -> filterRows -> sortRows -> view
 * Every state change goes through the controller and notifies subscribers
 * once, with a description of what changed for the live region.
 */

import {
    SORT_DIRECTIONS,
    createFormatters,
    formatCellText,
    parseIsoDate,
    validateColumns,
    validateLocale,
    validateRows
} from "./dataGrid.js";

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/** Sort cycle for one column: none -> ascending -> descending -> none. */
export function nextSortDirection(direction) {
    const index = SORT_DIRECTIONS.indexOf(direction);
    if (index === -1) {
        throw new TypeError(`Data-Grid: unknown sort direction "${String(direction)}".`);
    }
    return SORT_DIRECTIONS[(index + 1) % SORT_DIRECTIONS.length];
}

/**
 * Lower-case and strip diacritics so "nguyen" matches "Nguyễn".
 * "đ" has no decomposition in Unicode, so it is mapped explicitly.
 */
export function normalizeSearchText(text, locale) {
    return String(text)
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLocaleLowerCase(locale)
        .replace(/đ/g, "d");
}

/** Keep rows where any filterable column's displayed text contains the query. */
export function filterRows(rows, columns, filterText, formatters, locale) {
    const query = normalizeSearchText(filterText.trim(), locale);
    const searchable = columns.filter((column) => column.filterable === true);
    if (query === "" || searchable.length === 0) return rows.slice();

    return rows.filter((row) => searchable.some((column) =>
        normalizeSearchText(formatCellText(row[column.key], column, formatters), locale).includes(query)
    ));
}

function compareValues(left, right, column, collator) {
    if (column.type === "number") return left - right;
    if (column.type === "date") return parseIsoDate(left).getTime() - parseIsoDate(right).getTime();
    return collator.compare(left, right);
}

/**
 * Stable, type-aware sort. Empty values always go last, whatever the
 * direction, so they never push real data off the first page.
 */
export function sortRows(rows, column, direction, collator) {
    if (!column || direction === "none") return rows.slice();
    const factor = direction === "descending" ? -1 : 1;

    return rows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
            const leftValue = left.row[column.key];
            const rightValue = right.row[column.key];
            const leftEmpty = leftValue === null || leftValue === undefined;
            const rightEmpty = rightValue === null || rightValue === undefined;

            if (leftEmpty || rightEmpty) {
                if (leftEmpty && rightEmpty) return left.index - right.index;
                return leftEmpty ? 1 : -1;
            }
            const order = compareValues(leftValue, rightValue, column, collator) * factor;
            // Ties keep their original order.
            return order !== 0 ? order : left.index - right.index;
        })
        .map(({ row }) => row);
}

function rowCountText(visibleCount, totalCount) {
    return `${visibleCount} of ${totalCount} ${totalCount === 1 ? "row" : "rows"} shown.`;
}

/** The live-region message for a snapshot, based on what last changed. */
export function describeSnapshot(snapshot, columns) {
    const counts = rowCountText(snapshot.visibleCount, snapshot.totalCount);
    const change = snapshot.lastChange;

    if (change === "sort") {
        if (snapshot.sortDirection === "none") return `Sorting cleared. ${counts}`;
        const label = columns.find((column) => column.key === snapshot.sortKey).label;
        return `Sorted by ${label}, ${snapshot.sortDirection}. ${counts}`;
    }
    if (change === "filter") {
        const query = snapshot.filterText.trim();
        return query === "" ? `Filter cleared. ${counts}` : `Filtered by “${query}”. ${counts}`;
    }
    return counts;
}

/** Create the grid's single source of truth for sort and filter state. */
export function createGridController(props) {
    if (!isPlainObject(props)) {
        throw new TypeError("Data-Grid: controller props must be a plain object.");
    }
    const columns = validateColumns(props.columns);
    const rows = validateRows(props.rows, columns).slice();
    const locale = validateLocale(props.locale);
    const formatters = createFormatters(locale);
    const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
    const subscribers = new Set();

    let state = Object.freeze({ sortKey: null, sortDirection: "none", filterText: "", lastChange: null });
    let snapshot = buildSnapshot();

    function buildSnapshot() {
        const filtered = filterRows(rows, columns, state.filterText, formatters, locale);
        const sortColumn = columns.find((column) => column.key === state.sortKey);
        const visibleRows = Object.freeze(sortRows(filtered, sortColumn, state.sortDirection, collator));
        return Object.freeze({
            ...state,
            rows: visibleRows,
            visibleCount: visibleRows.length,
            totalCount: rows.length
        });
    }

    function commit(patch) {
        state = Object.freeze({ ...state, ...patch });
        snapshot = buildSnapshot();
        for (const subscriber of [...subscribers]) subscriber(snapshot);
    }

    function toggleSort(key) {
        const column = columns.find((candidate) => candidate.key === key);
        if (!column || column.sortable !== true) {
            throw new TypeError(`Data-Grid: "${String(key)}" is not a sortable column.`);
        }
        // A new column starts at ascending; the same column continues its cycle.
        const sortDirection = key === state.sortKey ? nextSortDirection(state.sortDirection) : "ascending";
        commit({
            sortKey: sortDirection === "none" ? null : key,
            sortDirection,
            lastChange: "sort"
        });
    }

    function setFilter(filterText) {
        if (typeof filterText !== "string") {
            throw new TypeError("Data-Grid: filter text must be a string.");
        }
        // Unchanged text is not a change, so it must not produce a second announcement.
        if (filterText.trim() === state.filterText.trim()) return;
        commit({ filterText, lastChange: "filter" });
    }

    function subscribe(subscriber) {
        if (typeof subscriber !== "function") {
            throw new TypeError("Data-Grid: subscriber must be a function.");
        }
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
    }

    return Object.freeze({
        columns,
        toggleSort,
        setFilter,
        subscribe,
        getSnapshot: () => snapshot,
        describe: (current = snapshot) => describeSnapshot(current, columns)
    });
}
