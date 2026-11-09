import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import INDEX_HTML from "../index.html?raw";

// Read as text: the Vitest CSS-Modules setting turns `?raw` imports of *.module.css into class maps.
const STYLES = readFileSync("src/components/AirdropCountdown.module.css", "utf8");

// WCAG 2.2 AA contrast (1.4.3 text, 1.4.11 non-text) computed from the real --arena-* tokens.

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
    [...INDEX_HTML.matchAll(/--arena-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [name, value.toLowerCase()])
);

describe("design tokens", () => {
    test("the contrast maths matches the WCAG reference values", () => {
        expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
        expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    });

    test("the stylesheet uses tokens, not hard-coded colours", () => {
        expect(STYLES.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    });

    test.each([
        ["text on the page", "text", "background"],
        ["text on a card", "text", "surface"],
        ["muted text on a card", "muted", "surface"],
        ["countdown digits on a card", "accent", "surface"],
        ["eyebrow on the page", "accent", "background"],
        ["live badge text", "background", "live"]
    ])("1.4.3: %s is at least 4.5:1", (_, fg, bg) => {
        expect(contrast(T[fg], T[bg])).toBeGreaterThanOrEqual(4.5);
    });

    test.each([
        ["card border on the page", "border", "background"],
        ["card border on the card", "border", "surface"],
        ["focus ring on the page", "focus", "background"],
        ["focus ring on a card", "focus", "surface"]
    ])("1.4.11: %s is at least 3:1", (_, fg, bg) => {
        expect(contrast(T[fg], T[bg])).toBeGreaterThanOrEqual(3);
    });
});
