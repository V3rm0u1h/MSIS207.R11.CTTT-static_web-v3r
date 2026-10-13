/**
 * Accessible Data-Grid — PRD 3: pagination views
 *
 * Pure VNode builders for the pager <nav> and the rows-per-page <select>.
 * Every control is a native element, so Tab, Enter and Space work without
 * extra key handling.
 */

import { createElement } from "./createElement.js";

/** Pages beyond this count are shown as a window around the current page. */
export const MAX_PAGE_BUTTONS = 7;

/**
 * The page numbers to show, with "gap" where pages are skipped.
 * Always includes the first, last and current page, plus their neighbours.
 *   pageWindow(6, 12) -> [1, "gap", 5, 6, 7, "gap", 12]
 */
export function pageWindow(page, pageCount) {
    if (pageCount <= MAX_PAGE_BUTTONS) {
        return Array.from({ length: pageCount }, (_, index) => index + 1);
    }
    const pages = new Set([1, pageCount, page - 1, page, page + 1]);
    // Near either edge, widen the window so the button count stays steady.
    if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
    if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((value) => pages.add(value));

    const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((left, right) => left - right);
    const result = [];
    sorted.forEach((value, index) => {
        if (index > 0 && value - sorted[index - 1] > 1) result.push("gap");
        result.push(value);
    });
    return result;
}

function pagerButton({ action, label, target, disabled = false, onPage, extra = {} }) {
    return createElement("li", { className: "data-grid-pager__item" },
        createElement("button", {
            type: "button",
            className: "data-grid-pager__button",
            "data-page-action": action,
            disabled,
            onClick: () => onPage(target),
            ...extra
        }, label)
    );
}

/** The pager landmark. With 0 pages it keeps its edge buttons, all disabled. */
export function Pager({ caption, page, pageCount, onPage }) {
    const atStart = page <= 1;
    const atEnd = page >= pageCount;

    const numbered = pageWindow(page, pageCount).map((entry) => {
        if (entry === "gap") {
            return createElement("li", { className: "data-grid-pager__gap", "aria-hidden": "true" }, "…");
        }
        return pagerButton({
            action: `page-${entry}`,
            label: String(entry),
            target: entry,
            onPage,
            extra: {
                // "Page 3" keeps the visible "3" in the accessible name (WCAG 2.5.3).
                "aria-label": `Page ${entry}`,
                "aria-current": entry === page ? "page" : null
            }
        });
    });

    return createElement("nav", { className: "data-grid-pager", "aria-label": `${caption} pages` },
        createElement("ul", { className: "data-grid-pager__list" },
            pagerButton({ action: "first", label: "First", target: 1, disabled: atStart, onPage }),
            pagerButton({ action: "previous", label: "Previous", target: page - 1, disabled: atStart, onPage }),
            numbered,
            pagerButton({ action: "next", label: "Next", target: page + 1, disabled: atEnd, onPage }),
            pagerButton({ action: "last", label: "Last", target: pageCount, disabled: atEnd, onPage })
        )
    );
}

/** Rows-per-page control. Rendered once; the select keeps its own value. */
export function PageSizeSelect({ id, pageSize, options, onChange }) {
    const selectId = `${id}-page-size`;
    return createElement("p", { className: "data-grid-page-size" },
        createElement("label", { for: selectId, className: "data-grid-page-size__label" }, "Rows per page"),
        createElement("select", {
            id: selectId,
            name: "pageSize",
            className: "data-grid-page-size__select",
            "aria-controls": id,
            // Select fires "input" on every change, so the delegated input handler covers it.
            onInput: onChange
        },
            options.map((size) => createElement("option", { value: String(size), selected: size === pageSize }, String(size)))
        )
    );
}
