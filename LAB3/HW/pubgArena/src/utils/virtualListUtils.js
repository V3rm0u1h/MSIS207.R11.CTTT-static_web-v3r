/**
 * KRAFTON x PUBG Vietnam Championship — T-03C virtual list maths (DOM-free)
 *
 * NOTE: the PRD asks to reuse "Lab 2 HW 3's Virtual Scroller". No virtual
 * scroller exists in this repository's Lab 2 work (the Lab 2 data grid uses
 * pagination, and Lab 2 HW 3 is the mega-sale countdown), so this one is new.
 * It keeps the Lab 2 data-grid architecture: a pure, validated model
 * (this file, like LAB2/HW/source/gridModel.js) and a thin view
 * (components/VirtualList.jsx) that only renders what the model says.
 *
 * For fixed-height rows:
 *   startIndex = max(0, floor(scrollTop / rowHeight) − overscan)
 *   endIndex   = min(count, ceil((scrollTop + viewportHeight) / rowHeight) + overscan)
 * and the rows outside [startIndex, endIndex) are replaced by spacers of
 * exactly their total height, so the scrollable height (and the scrollbar)
 * always matches the full list.
 *
 * scrollTop is clamped to the real scroll range first: when the list shrinks
 * (a filter) while scrolled far down, an unclamped scrollTop would point past
 * the end and render nothing.
 */

function assertCount(value, name, { positive = false } = {}) {
    if (!Number.isSafeInteger(value) || value < 0 || (positive && value === 0)) {
        throw new TypeError(`virtualList: ${name} must be ${positive ? "a positive" : "a non-negative"} integer, received ${JSON.stringify(value)}`);
    }
}

export function computeVisibleRange({ itemCount, rowHeight, viewportHeight, scrollTop, overscan = 0 }) {
    assertCount(itemCount, "itemCount");
    assertCount(rowHeight, "rowHeight", { positive: true });
    assertCount(viewportHeight, "viewportHeight", { positive: true });
    assertCount(overscan, "overscan");
    if (typeof scrollTop !== "number" || !Number.isFinite(scrollTop)) {
        throw new TypeError(`virtualList: scrollTop must be a finite number, received ${JSON.stringify(scrollTop)}`);
    }

    const totalHeight = itemCount * rowHeight;
    const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
    const top = Math.min(Math.max(0, scrollTop), maxScrollTop);

    const startIndex = Math.max(0, Math.floor(top / rowHeight) - overscan);
    const endIndex = Math.min(itemCount, Math.ceil((top + viewportHeight) / rowHeight) + overscan);

    return Object.freeze({
        startIndex,
        endIndex,
        spacerBefore: startIndex * rowHeight,
        spacerAfter: (itemCount - endIndex) * rowHeight,
        totalHeight
    });
}

/**
 * Lower-case and strip diacritics so "nguyen" matches "Nguyễn"; "đ" has no
 * Unicode decomposition, so it is mapped explicitly. Ported unchanged from
 * Lab 2 (LAB2/HW/source/gridModel.js, normalizeSearchText).
 */
export function normalizeSearchText(text) {
    return String(text)
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/đ/g, "d");
}
