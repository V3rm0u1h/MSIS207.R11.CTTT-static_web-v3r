/**
 * Accessible Data-Grid — PRD 1: Semantic table and accessible theme
 *
 * Renders an array of rows as a native <table> through the Mini-React core.
 * Inputs are validated before any VNode is created, and every cell value is
 * rendered as a text node; HTML strings are never parsed.
 */

import { createElement } from "./createElement.js";
import { mountVNode } from "./renderToDOM.js";

export const COLUMN_TYPES = Object.freeze(["string", "number", "date"]);
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
    if (locale !== undefined && !isNonEmptyString(locale)) {
        throw new TypeError("Data-Grid: locale must be a non-empty string when provided.");
    }
    if (!isNonEmptyString(emptyMessage)) {
        throw new TypeError("Data-Grid: emptyMessage must be a non-empty string.");
    }
    validateColumns(props.columns);
    validateRows(props.rows, props.columns);

    return { id, caption, locale, emptyMessage, columns: props.columns, rows: props.rows };
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

function renderCellContent(value, column, formatters) {
    if (value === null || value === undefined) return "";
    if (column.type === "number") return formatters.number.format(value);
    if (column.type === "date") {
        return createElement("time", { datetime: value }, formatters.date.format(parseIsoDate(value)));
    }
    return value;
}

function renderHeaderRow(columns) {
    return createElement("tr", null,
        columns.map((column) => createElement("th", { scope: "col", className: cellClassName(column) }, column.label))
    );
}

function renderBodyRow(row, columns, formatters) {
    return createElement("tr", null,
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
    const { id, caption, locale, emptyMessage, columns, rows } = validateGridProps(props);
    const formatters = createFormatters(locale);
    const captionId = `${id}-caption`;

    // The wrapper scrolls horizontally on narrow screens, so it is a labelled,
    // focusable region that keyboard users can scroll.
    return createElement("section", { id, className: "data-grid", "aria-labelledby": captionId, tabindex: 0 },
        createElement("table", { className: "data-grid__table" },
            createElement("caption", { id: captionId, className: "data-grid__caption" }, caption),
            createElement("thead", null, renderHeaderRow(columns)),
            createElement("tbody", null,
                rows.length === 0
                    ? renderEmptyRow(columns, emptyMessage)
                    : rows.map((row) => renderBodyRow(row, columns, formatters))
            )
        )
    );
}

/** Validate, render and mount a Data-Grid into root. Root is untouched if validation fails. */
export function mountDataGrid(root, props) {
    return mountVNode(root, DataGrid(props));
}
