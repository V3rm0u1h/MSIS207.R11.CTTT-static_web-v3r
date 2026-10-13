/**
 * Accessible Data-Grid — sorting, filtering (PRD 2), pagination (PRD 3) and
 * row selection (PRD 4) model
 *
 * DOM-free state for the grid. Data flows one way:
 *   rows -> filterRows -> sortRows -> paginate -> view
 * Each row gets a stable id (its index in the original rows), so selection
 * survives sorting, filtering and paging.
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

export const DEFAULT_PAGE_SIZE_OPTIONS = Object.freeze([10, 25, 50]);

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
/**
 * Keep rows where any filterable column's displayed text contains the query.
 * getRow lets callers filter wrapped items (such as { id, row }) directly.
 */
export function filterRows(rows, columns, filterText, formatters, locale, getRow = (item) => item) {
    const query = normalizeSearchText(filterText.trim(), locale);
    const searchable = columns.filter((column) => column.filterable === true);
    if (query === "" || searchable.length === 0) return rows.slice();

    return rows.filter((item) => searchable.some((column) =>
        normalizeSearchText(formatCellText(getRow(item)[column.key], column, formatters), locale).includes(query)
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
export function sortRows(rows, column, direction, collator, getRow = (item) => item) {
    if (!column || direction === "none") return rows.slice();
    const factor = direction === "descending" ? -1 : 1;

    return rows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
            const leftValue = getRow(left.row)[column.key];
            const rightValue = getRow(right.row)[column.key];
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

/** Number of pages for a row count; 0 rows means 0 pages. */
export function pageCountFor(rowCount, pageSize) {
    return Math.ceil(rowCount / pageSize);
}

/** "Rows 11–20 of 47." plus the unfiltered total when a filter hides rows. */
export function rowRangeText({ visibleCount, totalCount, firstRowIndex, rows }) {
    if (visibleCount === 0) return `0 of ${totalCount} ${totalCount === 1 ? "row" : "rows"} shown.`;
    const range = `Rows ${firstRowIndex + 1}–${firstRowIndex + rows.length} of ${visibleCount}`;
    return visibleCount === totalCount ? `${range}.` : `${range}, filtered from ${totalCount}.`;
}

/** The live-region message for a snapshot, based on what last changed. */
export function describeSnapshot(snapshot, columns) {
    const counts = rowRangeText(snapshot);
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
    if (change === "page") return `Page ${snapshot.page} of ${snapshot.pageCount}. ${counts}`;
    if (change === "pageSize") return `${snapshot.pageSize} rows per page. ${counts}`;
    if (change === "selection") {
        const count = snapshot.selectedIds.length;
        return count === 0 ? "No rows selected." : `${count} ${count === 1 ? "row" : "rows"} selected.`;
    }
    return counts;
}

function validatePageSizeOptions(options) {
    if (!Array.isArray(options) || options.length === 0 ||
        !options.every((size) => Number.isSafeInteger(size) && size > 0) ||
        new Set(options).size !== options.length) {
        throw new TypeError("Data-Grid: pageSizeOptions must be a non-empty array of unique positive integers.");
    }
    return Object.freeze([...options].sort((left, right) => left - right));
}

/** Create the grid's single source of truth for sort, filter and page state. */
export function createGridController(props) {
    if (!isPlainObject(props)) {
        throw new TypeError("Data-Grid: controller props must be a plain object.");
    }
    const columns = validateColumns(props.columns);
    const rows = validateRows(props.rows, columns).slice();
    const entries = rows.map((row, id) => Object.freeze({ id, row }));
    const getRow = (entry) => entry.row;
    const locale = validateLocale(props.locale);
    const formatters = createFormatters(locale);
    const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
    const pageSizeOptions = validatePageSizeOptions(props.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS);
    const initialPageSize = props.pageSize ?? pageSizeOptions[0];
    if (!pageSizeOptions.includes(initialPageSize)) {
        throw new TypeError(`Data-Grid: pageSize must be one of ${pageSizeOptions.join(", ")}.`);
    }
    const subscribers = new Set();

    let state = Object.freeze({
        sortKey: null, sortDirection: "none", filterText: "",
        page: 1, pageSize: initialPageSize, selectedIds: Object.freeze([]), lastChange: null
    });
    let snapshot = buildSnapshot();

    function buildSnapshot() {
        const filtered = filterRows(entries, columns, state.filterText, formatters, locale, getRow);
        const sortColumn = columns.find((column) => column.key === state.sortKey);
        const sorted = sortRows(filtered, sortColumn, state.sortDirection, collator, getRow);

        const pageCount = pageCountFor(sorted.length, state.pageSize);
        // Clamp so a filter that shrinks the result never leaves us past the last page.
        const page = Math.min(state.page, Math.max(pageCount, 1));
        if (page !== state.page) state = Object.freeze({ ...state, page });
        const firstRowIndex = (page - 1) * state.pageSize;
        const pageEntries = sorted.slice(firstRowIndex, firstRowIndex + state.pageSize);

        return Object.freeze({
            ...state,
            rows: Object.freeze(pageEntries.map(getRow)),
            rowIds: Object.freeze(pageEntries.map((entry) => entry.id)),
            visibleCount: sorted.length,
            totalCount: rows.length,
            pageCount,
            firstRowIndex,
            pageSizeOptions
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
        commit({ filterText, page: 1, lastChange: "filter" });
    }

    function setPage(page) {
        if (!Number.isSafeInteger(page)) {
            throw new TypeError("Data-Grid: page must be an integer.");
        }
        if (page < 1 || page > Math.max(snapshot.pageCount, 1)) {
            throw new RangeError(`Data-Grid: page ${page} is outside 1–${Math.max(snapshot.pageCount, 1)}.`);
        }
        if (page === state.page) return;
        commit({ page, lastChange: "page" });
    }

    function setPageSize(pageSize) {
        if (!pageSizeOptions.includes(pageSize)) {
            throw new TypeError(`Data-Grid: pageSize must be one of ${pageSizeOptions.join(", ")}.`);
        }
        if (pageSize === state.pageSize) return;
        commit({ pageSize, page: 1, lastChange: "pageSize" });
    }

    function validateRowId(id) {
        if (!Number.isSafeInteger(id)) {
            throw new TypeError("Data-Grid: row id must be an integer.");
        }
        if (id < 0 || id >= rows.length) {
            throw new RangeError(`Data-Grid: row id ${id} does not exist.`);
        }
    }

    function commitSelection(nextIds) {
        const sorted = Object.freeze([...nextIds].sort((left, right) => left - right));
        const unchanged = sorted.length === state.selectedIds.length &&
            sorted.every((id, index) => id === state.selectedIds[index]);
        // No change means no announcement.
        if (!unchanged) commit({ selectedIds: sorted, lastChange: "selection" });
    }

    /** Space: add or remove one row from the selection. */
    function toggleRow(id) {
        validateRowId(id);
        const next = new Set(state.selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        commitSelection(next);
    }

    /** Enter: make this row the only selected row. */
    function selectOnly(id) {
        validateRowId(id);
        commitSelection([id]);
    }

    /** Select or deselect several rows at once (the page's select-all box). */
    function setRowsSelected(ids, selected) {
        if (!Array.isArray(ids) || typeof selected !== "boolean") {
            throw new TypeError("Data-Grid: setRowsSelected expects an id array and a boolean.");
        }
        ids.forEach(validateRowId);
        const next = new Set(state.selectedIds);
        for (const id of ids) {
            if (selected) next.add(id);
            else next.delete(id);
        }
        commitSelection(next);
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
        setPage,
        setPageSize,
        toggleRow,
        selectOnly,
        setRowsSelected,
        subscribe,
        getSnapshot: () => snapshot,
        describe: (current = snapshot) => describeSnapshot(current, columns)
    });
}
