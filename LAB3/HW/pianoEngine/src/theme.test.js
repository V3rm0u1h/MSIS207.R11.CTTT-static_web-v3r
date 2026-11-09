import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import INDEX_HTML from "../index.html?raw";

// Read as text: the Vitest CSS-Modules setting turns `?raw` imports of *.module.css into class maps.
const STYLES = readFileSync("src/components/Piano.module.css", "utf8");

// T-02A — key colours meet WCAG 2.2 AA (1.4.3 text, 1.4.11 non-text), computed from the real tokens.

function luminance(hex) {
    const [r, g, b] = hex.slice(1).match(/../g).map((pair) => {
        const channel = parseInt(pair, 16) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
}

const T = Object.fromEntries(
    [...INDEX_HTML.matchAll(/--piano-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [name, value.toLowerCase()])
);

describe("design tokens", () => {
    test("the contrast maths matches the WCAG reference values", () => {
        expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
        expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    });

    test("the stylesheet uses tokens, not hard-coded colours", () => {
        const code = STYLES.replace(/\/\*[\s\S]*?\*\//g, "");
        expect(code).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        ["white-key", "black-key", "focus", "key-border"].forEach((token) => expect(code).toContain(`var(--piano-${token})`));
    });

    test.each([
        ["page text", "text", "background"],
        ["muted text", "muted", "background"],
        ["white-key label", "white-text", "white-key"],
        ["black-key label", "black-text", "black-key"]
    ])("1.4.3: %s is at least 4.5:1", (_, fg, bg) => {
        expect(contrast(T[fg], T[bg])).toBeGreaterThanOrEqual(4.5);
    });

    test.each([
        ["white-key edge on the white key", "key-border", "white-key"],
        ["white-key edge on the page", "key-border", "background"],
        ["black key against the white keys", "black-key", "white-key"],
        ["focus ring on a white key", "focus", "white-key"],
        ["focus ring on a black key", "focus", "black-key"],
        ["focus ring on the page", "focus", "background"]
    ])("1.4.11: %s is at least 3:1", (_, fg, bg) => {
        expect(contrast(T[fg], T[bg])).toBeGreaterThanOrEqual(3);
    });
});
