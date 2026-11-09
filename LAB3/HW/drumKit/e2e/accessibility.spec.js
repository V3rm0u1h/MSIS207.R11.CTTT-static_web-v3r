import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// T-01D — WCAG 2.2 AA, keyboard-only operation, responsive layout and reduced motion,
// in Microsoft Edge. The default viewport is 375 × 812 (playwright.config.js).

const PADS = [
    ["W", "Kick"], ["A", "Snare"], ["S", "Hi-Hat"], ["D", "Clap"],
    ["J", "Tom"], ["K", "Cymbal"], ["L", "Open Hi-Hat"]
];
const padName = ([key, name]) => `${name} ${key} key, drum pad`;
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
    await expect(page.getByRole("heading", { level: 1, name: "Production Studio" })).toBeVisible();
});

test.afterEach(() => {
    expect(consoleErrors, "no JavaScript errors or warnings in the console").toEqual([]);
});

test("2.1.1 / 2.4.3: Tab reaches all seven pads in reading order, then leaves the kit", async ({ page }) => {
    const visited = [];
    for (let n = 0; n < PADS.length; n += 1) {
        await page.keyboard.press("Tab");
        visited.push(await page.evaluate(() => document.activeElement.dataset.padId ?? null));
    }
    expect(visited).toEqual(["kick", "snare", "hihat", "clap", "tom", "cymbal", "open-hihat"]);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement.tagName)).not.toBe("BUTTON");
});

test("2.1.1: Enter and Space activate the focused pad, each as one hit", async ({ page }) => {
    const status = page.getByRole("region", { name: "Hit Log" }).locator("output");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: padName(PADS[0]) })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(status).toHaveText("Kick triggered, hit 1");
    await page.keyboard.press("Space");
    await expect(status).toHaveText("Kick triggered, hit 2");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(status).toHaveText("Snare triggered, hit 3");
    await expect(page.getByRole("region", { name: "Hit Log" }).getByRole("listitem")).toHaveCount(3);
});

test("2.4.7 / 1.4.11: keyboard focus shows a thick, offset, high-contrast ring; mouse focus does not", async ({ page }) => {
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset), color: style.outlineColor };
    });
    expect(ring.style).toBe("solid");
    expect(ring.width).toBeGreaterThanOrEqual(3);
    expect(ring.offset).toBeGreaterThanOrEqual(2);
    expect(ring.color).toBe("rgb(250, 204, 21)"); // --studio-focus

    await page.getByRole("button", { name: padName(PADS[2]) }).click();
    const afterClick = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    expect(afterClick).toBe("none");
});

test("2.4.11: a focused pad is never obscured; every pad scrolls into view when focused", async ({ page }) => {
    for (const pad of PADS) {
        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: padName(pad) })).toBeInViewport({ ratio: 1 });
    }
});

test("2.5.8: every interactive target is far above 24 × 24 CSS px", async ({ page }) => {
    for (const pad of PADS) {
        const box = await page.getByRole("button", { name: padName(pad) }).boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
    }
});

test("shortcuts never override typing: letters typed into a text field stay in the field", async ({ page }) => {
    // The kit itself has no form, so one is injected for the check.
    await page.evaluate(() => {
        const field = document.createElement("input");
        field.id = "qa-notes";
        field.setAttribute("aria-label", "QA notes");
        document.body.append(field);
    });
    const field = page.locator("#qa-notes");
    await field.focus();
    await page.keyboard.type("wasdjkl");
    await expect(field).toHaveValue("wasdjkl");
    await expect(page.getByRole("region", { name: "Hit Log" }).locator("output")).toHaveText("No drum hits yet");
    expect(await page.locator("button[aria-pressed='true']").count()).toBe(0);
});

test("4.1.2 / 4.1.3: pads are toggle buttons with live state; hits are announced through one polite status", async ({ page }) => {
    const kick = page.getByRole("button", { name: padName(PADS[0]) });
    await expect(kick).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.down("KeyW");
    await expect(kick).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.up("KeyW");
    await expect(kick).toHaveAttribute("aria-pressed", "false");
    const live = page.locator("[aria-live]:not([aria-live='off'])");
    await expect(live).toHaveCount(1);
    await expect(live).toHaveAttribute("aria-live", "polite");
    await expect(live).toHaveText("Kick triggered, hit 1");
});

test("reduced motion: animations and transitions collapse, yet the active state stays visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const kick = page.getByRole("button", { name: padName(PADS[0]) });
    const idle = await kick.evaluate((node) => getComputedStyle(node).backgroundColor);
    await page.keyboard.down("KeyW");
    await expect(kick).toHaveAttribute("aria-pressed", "true");
    const active = await kick.evaluate((node) => {
        const style = getComputedStyle(node);
        return { background: style.backgroundColor, border: style.borderTopColor, animation: style.animationDuration, transition: style.transitionDuration, transform: style.transform };
    });
    await page.keyboard.up("KeyW");
    // Chromium serialises 0.01ms as "1e-05s"; compare numerically in milliseconds.
    const toMs = (value) => (value.trim().endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000);
    expect(toMs(active.animation)).toBeLessThanOrEqual(0.01);
    expect(active.transition.split(",").every((value) => toMs(value) <= 0.01)).toBe(true);
    expect(active.transform).toBe("none");
    expect(active.background).not.toBe(idle);
    expect(active.border).toBe("rgb(56, 189, 248)"); // --studio-accent
});

for (const [label, viewport] of VIEWPORTS) {
    test(`${label} (${viewport.width}px): no horizontal overflow, readable labels, axe WCAG 2.2 AA clean`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.reload();
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);

        for (const pad of PADS) {
            const button = page.getByRole("button", { name: padName(pad) });
            await expect(button).toBeVisible();
            const clipped = await button.evaluate((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1);
            expect(clipped, `${pad[1]} label fits its pad`).toBe(false);
        }

        // Pads per row: 2 on phones, 4 on tablets, 7 on desktop.
        const rows = await page.evaluate(() => new Set([...document.querySelectorAll("ul > li > button")].map((node) => Math.round(node.getBoundingClientRect().top))).size);
        expect(rows).toBe({ phone: 4, tablet: 2, desktop: 1 }[label]);

        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
            .analyze();
        expect(results.violations).toEqual([]);
    });
}
