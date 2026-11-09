import { describe, expect, test } from "vitest";
import { computeVisibleRange, normalizeSearchText } from "./virtualListUtils.js";

// T-03C — virtual list maths (PRD 3 section 7).

const base = { itemCount: 1000, rowHeight: 64, viewportHeight: 384, overscan: 5 };

describe("computeVisibleRange", () => {
    test("at the top: the 6 visible rows plus 5 overscan below, none above", () => {
        expect(computeVisibleRange({ ...base, scrollTop: 0 })).toEqual({
            startIndex: 0, endIndex: 11, spacerBefore: 0, spacerAfter: 989 * 64, totalHeight: 64000
        });
    });

    test("in the middle: overscan on both sides, spacers replace every unrendered row", () => {
        const range = computeVisibleRange({ ...base, scrollTop: 640 });              // row 10 at the top
        expect(range).toMatchObject({ startIndex: 5, endIndex: 21 });
        expect(range.spacerBefore + (range.endIndex - range.startIndex) * 64 + range.spacerAfter).toBe(range.totalHeight);
    });

    test("a row cut by the viewport edge still counts as visible", () => {
        const range = computeVisibleRange({ ...base, overscan: 0, scrollTop: 32 });   // half of row 0 shows
        expect(range).toMatchObject({ startIndex: 0, endIndex: 7 });                  // rows 0..6 (6 is half visible)
    });

    test("at the bottom: the last row is rendered, spacer after is 0", () => {
        const range = computeVisibleRange({ ...base, scrollTop: 64000 - 384 });
        expect(range).toMatchObject({ endIndex: 1000, spacerAfter: 0, startIndex: 1000 - 6 - 5 });
    });

    test("never renders more than viewport rows + 1 partial + 2 × overscan, whatever the list size", () => {
        for (const scrollTop of [0, 100, 5000, 33333, 63616]) {
            const { startIndex, endIndex } = computeVisibleRange({ ...base, scrollTop });
            expect(endIndex - startIndex).toBeLessThanOrEqual(6 + 1 + 2 * 5);
        }
    });

    test("clamps a stale scrollTop past the end (list shrank after filtering) instead of rendering nothing", () => {
        const range = computeVisibleRange({ ...base, itemCount: 20, scrollTop: 50000 });
        expect(range.endIndex).toBe(20);
        expect(range.endIndex - range.startIndex).toBeGreaterThan(0);
        expect(computeVisibleRange({ ...base, scrollTop: -200 }).startIndex).toBe(0);  // overscroll bounce
    });

    test("short lists render everything", () => {
        expect(computeVisibleRange({ ...base, itemCount: 3, scrollTop: 0 })).toMatchObject({ startIndex: 0, endIndex: 3, spacerAfter: 0 });
        expect(computeVisibleRange({ ...base, itemCount: 0, scrollTop: 0 })).toMatchObject({ startIndex: 0, endIndex: 0, totalHeight: 0 });
    });

    test.each([
        ["a zero row height", { rowHeight: 0 }],
        ["a negative overscan", { overscan: -1 }],
        ["a fractional count", { itemCount: 1.5 }],
        ["a NaN scrollTop", { scrollTop: NaN }]
    ])("rejects %s (Rule 2)", (_, override) => {
        expect(() => computeVisibleRange({ ...base, scrollTop: 0, ...override })).toThrow(TypeError);
    });
});

describe("normalizeSearchText (ported from Lab 2)", () => {
    test("is case- and diacritic-insensitive, including đ", () => {
        expect(normalizeSearchText("Đội Tuyển Việt Nam")).toBe("doi tuyen viet nam");
        expect(normalizeSearchText("CES")).toBe("ces");
    });
});
