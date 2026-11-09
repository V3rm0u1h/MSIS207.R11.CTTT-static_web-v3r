import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import INDEX_HTML from "../index.html?raw";

// Read as text (relative to the Vitest root, the project folder): the Vitest CSS-Modules
// setting turns `?raw` imports of *.module.css into class maps.
const STYLES = readFileSync("src/components/DrumKit.module.css", "utf8");

// T-01D — design tokens and WCAG 2.2 AA contrast (1.4.3 text, 1.4.11 non-text), checked
// against the real values instead of assumed.

/** Relative luminance of a #rrggbb colour (WCAG 2.x definition). */
export function luminance(hex) {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!match) throw new TypeError(`luminance: expected #rrggbb, received ${JSON.stringify(hex)}`);
    const [r, g, b] = match[1].match(/../g).map((pair) => {
        const channel = parseInt(pair, 16) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, 1..21. */
export function contrast(a, b) {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
}

/** The --studio-* colour tokens declared in index.html. */
function readTokens() {
    const tokens = {};
    for (const [, name, value] of INDEX_HTML.matchAll(/--studio-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
        tokens[name] = value.toLowerCase();
    }
    return tokens;
}

const T = readTokens();
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe("design tokens", () => {
    test("declare the studio palette as CSS custom properties on :root", () => {
        expect(Object.keys(T)).toEqual(expect.arrayContaining([
            "background", "surface", "text", "muted", "accent", "border", "focus"
        ]));
        expect(INDEX_HTML).toMatch(/:root\s*\{[^}]*--studio-background/);
    });

    test("the stylesheet uses the tokens instead of hard-coded colours", () => {
        const code = STYLES.replace(/\/\*[\s\S]*?\*\//g, "");
        expect(code).toMatch(/var\(--studio-background\)|var\(--studio-surface\)/);
        expect(code).toMatch(/var\(--studio-focus\)/);
        expect(code).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    });

    test("the contrast maths matches the WCAG reference values", () => {
        expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
        expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
        expect(() => luminance("red")).toThrow(TypeError);
    });
});

describe("WCAG 2.2 AA contrast", () => {
    test.each([
        ["text", "background"],
        ["text", "surface"],
        ["text", "active"],
        ["text", "surface-deep"],
        ["muted", "background"],
        ["muted", "surface"]
    ])("1.4.3 text: --studio-%s on --studio-%s is at least 4.5:1", (fg, bg) => {
        expect(contrast(T[fg], T[bg])).toBeGreaterThanOrEqual(AA_TEXT);
    });

    test.each([
        ["border", "surface"],          // pad boundary against its own fill
        ["border", "background"],       // pad boundary against the page
        ["accent", "surface"],          // hover / active border
        ["accent", "active"],           // active border against the active fill
        ["accent", "background"],
        ["focus", "background"],        // focus ring (2.4.7) against the page
        ["focus", "surface"],
        ["meter-low", "surface"],
        ["meter-mid", "surface"],
        ["meter-high", "surface"]
    ])("1.4.11 non-text: --studio-%s on --studio-%s is at least 3:1", (fg, bg) => {
        expect(contrast(T[fg], T[bg])).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });

    test("the PRD's example border (#475569) would have failed 1.4.11, which is why it was replaced", () => {
        expect(contrast("#475569", T.surface)).toBeLessThan(AA_NON_TEXT);
        expect(T.border).not.toBe("#475569");
    });

    test("the active pad is distinguishable from an idle pad without motion (fill and border both change)", () => {
        expect(contrast(T.active, T.surface)).toBeGreaterThan(1.5);
        expect(T.accent).not.toBe(T.border);
        const code = STYLES.replace(/\/\*[\s\S]*?\*\//g, "");
        const active = /\.pad\[aria-pressed="true"\]\s*\{([^}]*)\}/.exec(code)[1];
        expect(active).toMatch(/background:\s*var\(--studio-active\)/);
        expect(active).toMatch(/border-color:\s*var\(--studio-accent\)/);
    });
});

describe("reduced motion and focus", () => {
    test("the stylesheet honours prefers-reduced-motion with the required overrides", () => {
        const block = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(STYLES);
        expect(block).not.toBeNull();
        expect(block[1]).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
        expect(block[1]).toMatch(/animation-iteration-count:\s*1\s*!important/);
        expect(block[1]).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
        expect(block[1]).toMatch(/scroll-behavior:\s*auto\s*!important/);
    });

    test("pads have a visible, offset focus-visible ring (2.4.7) and a touch-friendly size (2.5.8)", () => {
        expect(STYLES).toMatch(/\.pad:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--studio-focus\)/);
        expect(STYLES).toMatch(/\.pad:focus-visible\s*\{[^}]*outline-offset/);
        expect(STYLES).toMatch(/\.pad\s*\{[^}]*min-height:\s*6rem/);
        expect(STYLES).toMatch(/touch-action:\s*manipulation/);
    });

    test("the pad grid adapts: 2 columns by default, 4 on tablets, 7 on desktop", () => {
        expect(STYLES).toMatch(/\.pads\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
        expect(STYLES).toMatch(/@media \(min-width: 600px\)\s*\{\s*\.pads\s*\{[^}]*repeat\(4,/);
        expect(STYLES).toMatch(/@media \(min-width: 900px\)\s*\{\s*\.pads\s*\{[^}]*repeat\(7,/);
    });
});
