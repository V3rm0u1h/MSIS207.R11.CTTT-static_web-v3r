import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// T-02A — the generated keyboard in a real browser (Microsoft Edge): count, alignment,
// labels, horizontal scrolling and WCAG 2.2 AA. Default viewport 375 × 812.

const VIEWPORTS = [
    ["phone", { width: 375, height: 812 }],
    ["tablet", { width: 768, height: 1024 }],
    ["desktop", { width: 1280, height: 800 }]
];

let consoleErrors;

test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("region", { name: "88-key piano" })).toBeVisible();
});

test.afterEach(() => {
    expect(consoleErrors, "no JavaScript errors or warnings in the console").toEqual([]);
});

/** Bounding boxes of every key, in DOM order, measured in the keyboard's scroll coordinates. */
function measureKeys(page) {
    return page.evaluate(() => {
        const list = document.querySelector("ol");
        const origin = list.getBoundingClientRect();
        return [...list.querySelectorAll("li > button")].map((button) => {
            const box = button.getBoundingClientRect();
            return {
                midi: Number(button.dataset.midi),
                type: button.dataset.noteType,
                left: box.left - origin.left + list.scrollLeft,
                right: box.right - origin.left + list.scrollLeft,
                top: box.top,
                bottom: box.bottom,
                width: box.width,
                height: box.height,
                clipped: button.scrollWidth > button.clientWidth + 1 || button.scrollHeight > button.clientHeight + 1
            };
        });
    });
}

test("renders 88 keys, 52 white and 36 black, MIDI 21–108 in order", async ({ page }) => {
    const keys = await measureKeys(page);
    expect(keys).toHaveLength(88);
    expect(keys.filter((key) => key.type === "white")).toHaveLength(52);
    expect(keys.filter((key) => key.type === "black")).toHaveLength(36);
    expect(keys.map((key) => key.midi)).toEqual(Array.from({ length: 88 }, (_, i) => 21 + i));
    await expect(page.getByRole("button", { name: "A4 white key" })).toHaveAttribute("data-freq-hz", "440.00");
});

test("white keys sit edge to edge; each black key is shorter, narrower and centred on a white-key boundary", async ({ page }) => {
    const keys = await measureKeys(page);
    const whites = keys.filter((key) => key.type === "white");
    for (let i = 1; i < whites.length; i += 1) {
        expect(Math.abs(whites[i].left - whites[i - 1].right)).toBeLessThan(1);
    }
    keys.forEach((key, i) => {
        if (key.type !== "black") return;
        const left = keys[i - 1];
        const right = keys[i + 1];
        expect(left.type).toBe("white");
        expect(right.type).toBe("white");
        expect(Math.abs((key.left + key.right) / 2 - right.left)).toBeLessThan(1);
        expect(key.height).toBeLessThan(left.height * 0.75);
        expect(key.width).toBeLessThan(left.width);
    });
});

test("black keys are painted above the white keys they overlap", async ({ page }) => {
    const hit = await page.evaluate(() => {
        const black = document.querySelector("button[data-midi='61']");     // C#4
        black.scrollIntoView({ inline: "center" });
        const box = black.getBoundingClientRect();
        return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2).closest("button").dataset.midi;
    });
    expect(hit).toBe("61");
});

test("white and black keys look different", async ({ page }) => {
    const colours = await page.evaluate(() => ["21", "22"].map((midi) => {
        const style = getComputedStyle(document.querySelector(`button[data-midi='${midi}']`));
        return { background: style.backgroundColor, color: style.color };
    }));
    expect(colours[0].background).toBe("rgb(248, 250, 252)");
    expect(colours[1].background).toBe("rgb(17, 24, 39)");
    expect(colours[0].color).not.toBe(colours[1].color);
});

test("2.4.11: a key focused off-screen scrolls into view inside the keyboard", async ({ page }) => {
    const c8 = page.getByRole("button", { name: "C8 white key" });
    await c8.focus();
    await expect(c8).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.querySelector("ol").scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
});

test("2.4.7: keyboard focus shows a 3px ring", async ({ page }) => {
    // Tab order: Release All Notes (Voices panel), then the first key, A0.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Release All Notes" })).toBeFocused();
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement);
        return { midi: document.activeElement.dataset.midi, style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(ring).toEqual({ midi: "21", style: "solid", width: 3 });
});

for (const [label, viewport] of VIEWPORTS) {
    test(`${label} (${viewport.width}px): page never scrolls sideways, the keyboard does; labels fit; axe WCAG 2.2 AA clean`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.reload();
        await expect(page.getByRole("region", { name: "88-key piano" })).toBeVisible();

        const overflow = await page.evaluate(() => ({
            page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            keyboard: (({ scrollWidth, clientWidth }) => scrollWidth - clientWidth)(document.querySelector("ol"))
        }));
        expect(overflow.page).toBeLessThanOrEqual(0);
        expect(overflow.keyboard).toBeGreaterThan(0);

        const keys = await measureKeys(page);
        keys.forEach((key) => {
            expect(key.clipped, `MIDI ${key.midi} label fits its key`).toBe(false);
            expect(key.width).toBeGreaterThanOrEqual(24);   // 2.5.8 target size
            expect(key.height).toBeGreaterThanOrEqual(24);
        });

        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
            .analyze();
        expect(results.violations).toEqual([]);
    });
}
