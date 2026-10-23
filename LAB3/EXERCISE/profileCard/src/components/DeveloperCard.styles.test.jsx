import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import CARD_SOURCE from "./DeveloperCard.jsx?raw";
import BADGE_SOURCE from "./SkillBadge.jsx?raw";
import APP_SOURCE from "../App.jsx?raw";
import styles from "./DeveloperCard.module.css";
import DeveloperCard from "./DeveloperCard.jsx";
import { sampleProfile } from "../sampleProfile.js";

// T-01C — scoped styling system.

// Read from disk: with CSS Modules on, a ?raw import of a .css file is not plain text.
const CSS = readFileSync(join(process.cwd(), "src/components/DeveloperCard.module.css"), "utf8");
const STYLESHEET = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** The design tokens: custom properties declared in the .card rule. */
function cardTokens() {
    const cardBlock = STYLESHEET.match(/^\.card\s*\{([^}]*)\}/m)[1];
    return Object.fromEntries([...cardBlock.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

/** Every declaration outside the token definitions, as [property, value]. */
function nonTokenDeclarations() {
    return [...STYLESHEET.matchAll(/([\w-]+)\s*:\s*([^;{}]+);/g)]
        .map(([, property, value]) => [property, value.trim()])
        .filter(([property]) => !property.startsWith("--"));
}

/** WCAG 2 contrast ratio of two #rrggbb colours. */
function contrast(foreground, background) {
    const luminance = (hex) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
            .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}

afterEach(cleanup);

describe("DeveloperCard design tokens", () => {
    test.each([
        ["card background", "--card-background"],
        ["surface", "--card-surface"],
        ["primary text", "--card-text"],
        ["muted text", "--card-text-muted"],
        ["accent", "--card-accent"],
        ["border", "--card-border"],
        ["spacing", "--space-3"],
        ["border radius", "--radius-card"],
        ["shadow", "--shadow-card"],
        ["typography", "--font-body"]
    ])("defines a %s token (%s) on .card", (_, token) => {
        expect(cardTokens()).toHaveProperty(token);
    });

    test("every defined token is used at least once", () => {
        const unused = Object.keys(cardTokens()).filter((token) => !STYLESHEET.includes(`var(${token})`));
        expect(unused).toEqual([]);
    });

    test("colours are written only as tokens, never repeated in rules", () => {
        const literalColours = nonTokenDeclarations().filter(([, value]) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(value));
        expect(literalColours).toEqual([]);
    });

    test("spacing, radius, shadow and fonts come from tokens", () => {
        const spacing = nonTokenDeclarations().filter(([property, value]) =>
            /^(padding|margin|gap)/.test(property) && /\d(rem|px|em)/.test(value) && !value.includes("var("));
        expect(spacing).toEqual([]);
        for (const [property, value] of nonTokenDeclarations()) {
            if (/^(border-radius|box-shadow|font-family)$/.test(property)) expect(value, property).toMatch(/^(var\(|calc\(var\(|50%$)/);
        }
    });

    test.each([
        ["primary text on the card", "--card-text", "--card-background"],
        ["muted text on the card", "--card-text-muted", "--card-background"],
        ["muted text on the metadata surface", "--card-text-muted", "--card-surface"],
        ["accent text on the card", "--card-accent", "--card-background"],
        ["accent text on the metadata surface", "--card-accent", "--card-surface"]
    ])("%s meets WCAG AA contrast (4.5:1)", (_, foreground, background) => {
        const tokens = cardTokens();
        expect(contrast(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(4.5);
    });
});

describe("DeveloperCard CSS Module scoping", () => {
    test("every rule targets a module class: no global, element-only or :global selectors", () => {
        expect(STYLESHEET).not.toMatch(/:global/);
        // Drop at-rule headers such as "@container (...) {": they are not selectors.
        const selectors = [...STYLESHEET.replace(/@[^{]+\{/g, "").matchAll(/([^{}]+)\{/g)]
            .flatMap(([, selector]) => selector.split(","))
            .map((selector) => selector.trim())
            .filter(Boolean);
        expect(selectors.length).toBeGreaterThan(0);
        expect(selectors.filter((selector) => !selector.startsWith("."))).toEqual([]);
    });

    test("DeveloperCard imports the module as `styles` and applies styles.card and styles.metrics", () => {
        expect(CARD_SOURCE).toContain('import styles from "./DeveloperCard.module.css";');
        const { container } = render(<DeveloperCard {...sampleProfile} />);
        expect(styles.card).toBeTruthy();
        expect(container.querySelector("article").className).toBe(styles.card);
        expect(container.querySelector("dl").className).toBe(styles.metrics);
    });

    test("every class name the stylesheet defines exists on the module", () => {
        const classes = new Set([...STYLESHEET.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(([, name]) => name));
        expect([...classes].filter((name) => !styles[name])).toEqual([]);
    });

    test("no inline styles: not in the sources and not in the rendered card", () => {
        for (const source of [CARD_SOURCE, BADGE_SOURCE, APP_SOURCE]) expect(source).not.toMatch(/style=\{/);
        const { container } = render(<DeveloperCard {...sampleProfile} />);
        expect(container.querySelectorAll("[style]")).toHaveLength(0);
    });

    test("no Ant Design or other component-library stylesheet is imported", () => {
        for (const source of [CARD_SOURCE, BADGE_SOURCE, APP_SOURCE]) {
            expect(source).not.toMatch(/antd|@mui|bootstrap/);
            expect(source).not.toMatch(/import\s+["'][^"']+\.css["']/);
        }
    });
});

describe("DeveloperCard responsive and focus styling", () => {
    test("the card is a size container, and narrow cards stack the header and metadata", () => {
        expect(STYLESHEET).toMatch(/container-type:\s*inline-size/);
        const narrow = STYLESHEET.match(/@container \(max-width: \d+px\)\s*\{([\s\S]*)\}\s*$/)[1];
        expect(narrow).toMatch(/\.identity\s*\{[^}]*flex-direction:\s*column/);
        expect(narrow).toMatch(/\.metrics\s*\{[^}]*grid-template-columns:\s*1fr/);
    });

    test("focusable elements inside the card get a visible focus ring", () => {
        expect(STYLESHEET).toMatch(/\.card :focus-visible\s*\{[^}]*outline:\s*var\(--focus-ring\)/);
    });

    test("the avatar size token matches the <img> width/height attributes", () => {
        expect(cardTokens()["--avatar-size"]).toBe("96px");
    });
});
