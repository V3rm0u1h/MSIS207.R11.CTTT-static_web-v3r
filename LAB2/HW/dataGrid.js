/**
 * Accessible Data-Grid — view layer
 *
 * PRD 1: renders an array of rows as a native <table> through the Mini-React
 * core. Inputs are validated before any VNode is created, and every cell value
 * is rendered as a text node; HTML strings are never parsed.
 * PRD 2: sortable columns render a native <button> inside their <th>, and the
 * active column exposes its direction through aria-sort.
 * PRD 3: when the grid shows one page of a larger set, aria-rowcount and
 * aria-rowindex tell screen readers each row's true position.
 *
 * This module is pure: it builds VNodes and never touches the DOM. Mounting
 * and state live in mountDataGrid.js and gridModel.js.
 */

import { createElement } from "./createElement.js";

export const COLUMN_TYPES = Object.freeze(["string", "number", "date"]);
export const SORT_DIRECTIONS = Object.freeze(["none", "ascending", "descending"]);
export const DEFAULT_EMPTY_MESSAGE = "No rows to display";

const COLUMN_PROPERTIES = new Set(["key", "label", "type", "sortable", "filterable"]);
const COLUMN_FLAGS = ["sortable", "filterable"];
const COLUMN_KEY_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const GRID_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
}

/**
 * Parse a calendar date written as YYYY-MM-DD. The date is pinned to UTC so
 * the rendered day never shifts with the viewer's time zone.
 */
export function parseIsoDate(value) {
    if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    // Reject impossible days such as 2024-02-30, which Date silently rolls over.
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
    return date;
}

export function validateColumns(columns) {
    if (!Array.isArray(columns) || columns.length === 0) {
        throw new TypeError("Data-Grid: columns must be a non-empty array.");
    }

    const seenKeys = new Set();
    columns.forEach((column, index) => {
        const path = `columns[${index}]`;
        if (!isPlainObject(column)) {
            throw new TypeError(`Data-Grid: ${path} must be a plain object.`);
        }
        for (const property of Object.keys(column)) {
            if (!COLUMN_PROPERTIES.has(property)) {
                throw new TypeError(`Data-Grid: ${path} has unknown property "${property}".`);
            }
        }
        if (typeof column.key !== "string" || !COLUMN_KEY_PATTERN.test(column.key)) {
            throw new TypeError(`Data-Grid: ${path}.key must be an identifier-like string.`);
        }
        if (seenKeys.has(column.key)) {
            throw new TypeError(`Data-Grid: duplicate column key "${column.key}".`);
        }
        seenKeys.add(column.key);
        if (!isNonEmptyString(column.label)) {
            throw new TypeError(`Data-Grid: ${path}.label must be a non-empty string.`);
        }
        if (!COLUMN_TYPES.includes(column.type)) {
            throw new TypeError(
                `Data-Grid: ${path}.type must be one of ${COLUMN_TYPES.join(", ")}; received ${String(column.type)}.`
            );
        }
        for (const flag of COLUMN_FLAGS) {
            if (column[flag] !== undefined && typeof column[flag] !== "boolean") {
                throw new TypeError(`Data-Grid: ${path}.${flag} must be true or false when provided.`);
            }
        }
    });
    return columns;
}

function validateCellValue(value, column, path) {
    // Missing values are allowed and render as an empty cell.
    if (value === null || value === undefined) return;

    if (column.type === "string" && typeof value !== "string") {
        throw new TypeError(`Data-Grid: ${path} must be a string.`);
    }
    if (column.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
        throw new TypeError(`Data-Grid: ${path} must be a finite number.`);
    }
    if (column.type === "date" && parseIsoDate(value) === null) {
        throw new TypeError(`Data-Grid: ${path} must be a valid YYYY-MM-DD date string.`);
    }
}

export function validateRows(rows, columns) {
    if (!Array.isArray(rows)) {
        throw new TypeError("Data-Grid: rows must be an array.");
    }
    rows.forEach((row, rowIndex) => {
        if (!isPlainObject(row)) {
            throw new TypeError(`Data-Grid: rows[${rowIndex}] must be a plain object.`);
        }
        for (const column of columns) {
            validateCellValue(row[column.key], column, `rows[${rowIndex}].${column.key}`);
        }
    });
    return rows;
}

export function validateLocale(locale) {
    if (locale !== undefined && !isNonEmptyString(locale)) {
        throw new TypeError("Data-Grid: locale must be a non-empty string when provided.");
    }
    return locale;
}

function validateSortProps(props) {
    const { sortKey = null, sortDirection = "none", onSort } = props;

    if (!SORT_DIRECTIONS.includes(sortDirection)) {
        throw new TypeError(`Data-Grid: sortDirection must be one of ${SORT_DIRECTIONS.join(", ")}.`);
    }
    if (sortKey !== null) {
        const column = props.columns.find((candidate) => candidate.key === sortKey);
        if (!column || column.sortable !== true) {
            throw new TypeError(`Data-Grid: sortKey "${String(sortKey)}" is not a sortable column.`);
        }
    }
    if ((sortKey === null) !== (sortDirection === "none")) {
        throw new TypeError("Data-Grid: sortKey and sortDirection must be set together.");
    }
    if (onSort !== undefined && typeof onSort !== "function") {
        throw new TypeError("Data-Grid: onSort must be a function when provided.");
    }
    return { sortKey, sortDirection, onSort };
}

function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function validateRowPosition(props) {
    const { rowCount, firstRowIndex = 0 } = props;
    if (rowCount === undefined) {
        if (props.firstRowIndex !== undefined) {
            throw new TypeError("Data-Grid: firstRowIndex requires rowCount.");
        }
        return { rowCount: null, firstRowIndex: 0 };
    }
    if (!isNonNegativeInteger(rowCount) || !isNonNegativeInteger(firstRowIndex)) {
        throw new TypeError("Data-Grid: rowCount and firstRowIndex must be non-negative integers.");
    }
    if (firstRowIndex + props.rows.length > rowCount) {
        throw new TypeError("Data-Grid: rows do not fit inside rowCount at firstRowIndex.");
    }
    return { rowCount, firstRowIndex };
}

function validateGridProps(props) {
    if (!isPlainObject(props)) {
        throw new TypeError("Data-Grid: props must be a plain object.");
    }
    const { id = "data-grid", caption, locale, emptyMessage = DEFAULT_EMPTY_MESSAGE } = props;

    if (typeof id !== "string" || !GRID_ID_PATTERN.test(id)) {
        throw new TypeError("Data-Grid: id must start with a letter and contain only letters, digits, - or _.");
    }
    if (!isNonEmptyString(caption)) {
        throw new TypeError("Data-Grid: caption must be a non-empty string.");
    }
    validateLocale(locale);
    if (!isNonEmptyString(emptyMessage)) {
        throw new TypeError("Data-Grid: emptyMessage must be a non-empty string.");
    }
    validateColumns(props.columns);
    validateRows(props.rows, props.columns);

    return {
        id, caption, locale, emptyMessage, columns: props.columns, rows: props.rows,
        position: validateRowPosition(props),
        sort: validateSortProps(props)
    };
}

export function createFormatters(locale) {
    return {
        number: new Intl.NumberFormat(locale),
        date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" })
    };
}

function cellClassName(column) {
    return `data-grid__cell data-grid__cell--${column.type}`;
}

/** The text a cell shows. Also used by the filter, so users match what they see. */
export function formatCellText(value, column, formatters) {
    if (value === null || value === undefined) return "";
    if (column.type === "number") return formatters.number.format(value);
    if (column.type === "date") return formatters.date.format(parseIsoDate(value));
    return value;
}

function renderCellContent(value, column, formatters) {
    const text = formatCellText(value, column, formatters);
    if (column.type === "date" && text !== "") {
        return createElement("time", { datetime: value }, text);
    }
    return text;
}

function renderHeaderCell(column, sort) {
    const className = cellClassName(column);
    if (column.sortable !== true || !sort.onSort) {
        return createElement("th", { scope: "col", className }, column.label);
    }

    // Only the active column carries aria-sort; the direction icon is CSS-only,
    // so the button's accessible name stays the plain column label.
    const isActive = sort.sortKey === column.key;
    return createElement("th", {
        scope: "col",
        className: `${className} data-grid__cell--sortable`,
        "aria-sort": isActive ? sort.sortDirection : null
    },
        createElement("button", {
            type: "button",
            className: "data-grid__sort",
            "data-sort-key": column.key,
            onClick: () => sort.onSort(column.key)
        }, column.label)
    );
}

function renderHeaderRow(columns, sort, ariaRowIndex) {
    return createElement("tr", { "aria-rowindex": ariaRowIndex },
        columns.map((column) => renderHeaderCell(column, sort)));
}

function renderBodyRow(row, columns, formatters, ariaRowIndex) {
    return createElement("tr", { "aria-rowindex": ariaRowIndex },
        columns.map((column, columnIndex) => {
            const content = renderCellContent(row[column.key], column, formatters);
            // The first column names the row, so it is announced with every cell in that row.
            return columnIndex === 0
                ? createElement("th", { scope: "row", className: cellClassName(column) }, content)
                : createElement("td", { className: cellClassName(column) }, content);
        })
    );
}

function renderEmptyRow(columns, message) {
    return createElement("tr", null,
        createElement("td", { colspan: columns.length, className: "data-grid__empty" }, message)
    );
}

/** Build the Data-Grid VNode tree. Throws TypeError before building anything if props are invalid. */
export function DataGrid(props) {
    const { id, caption, locale, emptyMessage, columns, rows, position, sort } = validateGridProps(props);
    const formatters = createFormatters(locale);
    const captionId = `${id}-caption`;

    // aria-rowindex is 1-based and counts the header row, so data rows start at 2.
    // An empty page has no data rows to position, so the attributes are omitted.
    const positioned = position.rowCount !== null && rows.length > 0;
    const rowIndex = (index) => (positioned ? position.firstRowIndex + index + 2 : null);

    // The wrapper scrolls horizontally on narrow screens, so it is a labelled,
    // focusable region that keyboard users can scroll.
    return createElement("section", { id, className: "data-grid", "aria-labelledby": captionId, tabindex: 0 },
        createElement("table", {
            className: "data-grid__table",
            "aria-rowcount": positioned ? position.rowCount + 1 : null
        },
            createElement("caption", { id: captionId, className: "data-grid__caption" }, caption),
            createElement("thead", null, renderHeaderRow(columns, sort, positioned ? 1 : null)),
            createElement("tbody", null,
                rows.length === 0
                    ? renderEmptyRow(columns, emptyMessage)
                    : rows.map((row, index) => renderBodyRow(row, columns, formatters, rowIndex(index)))
            )
        )
    );
}
