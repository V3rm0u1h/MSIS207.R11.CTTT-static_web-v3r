import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// T-01A — the semantic foundation in a real browser at 375px.

const PADS = [
    ["W", "Kick"], ["A", "Snare"], ["S", "Hi-Hat"], ["D", "Clap"],
    ["J", "Tom"], ["K", "Cymbal"], ["L", "Open Hi-Hat"]
];

test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Production Studio" })).toBeVisible();
    expect(errors, "console must be clean").toEqual([]);
});

test("renders the seven pads as semantic buttons with kbd shortcuts and aria-pressed", async ({ page }) => {
    const main = page.getByRole("main");
    const region = main.getByRole("region", { name: "Drum Pads" });
    await expect(region.getByRole("heading", { level: 2 })).toHaveText("Drum Pads");

    const buttons = region.getByRole("button");
    await expect(buttons).toHaveCount(7);
    for (const [index, [key, name]] of PADS.entries()) {
        const button = buttons.nth(index);
        await expect(button).toHaveAccessibleName(`${name} ${key} key, drum pad`);
        await expect(button).toHaveAttribute("aria-keyshortcuts", key);
        await expect(button).toHaveAttribute("type", "button");
        await expect(button).toHaveAttribute("aria-pressed", "false");
        await expect(button.locator("kbd")).toHaveText(key);
        await expect(button.locator("span").first()).toHaveText(name);
    }
    expect(await main.locator("div").count(), "no div-based wrappers").toBe(0);
    expect(await main.locator("ul > li > button").count()).toBe(7);
});

test("every pad is reachable with Tab and fits the 375px viewport", async ({ page }) => {
    for (const [key, name] of PADS) {
        await page.keyboard.press("Tab");
        await expect(page.getByRole("button", { name: `${name} ${key} key, drum pad` })).toBeFocused();
    }
    const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
});

test("has no axe-core WCAG 2.2 AA violations", async ({ page }) => {
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
    expect(results.violations).toEqual([]);
});

test("physical keys press and release pads; unmapped keys and auto-repeat do nothing extra", async ({ page }) => {
    const kick = page.getByRole("button", { name: "Kick W key, drum pad" });
    await page.keyboard.down("KeyW");
    await expect(kick).toHaveAttribute("aria-pressed", "true");
    // A second keydown while held (what auto-repeat sends) must not flip the state.
    await page.keyboard.down("KeyW");
    await expect(kick).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.up("KeyW");
    await expect(kick).toHaveAttribute("aria-pressed", "false");

    await page.keyboard.press("KeyQ");
    expect(await page.locator("button[aria-pressed='true']").count()).toBe(0);

    for (const [key, name] of PADS) {
        await page.keyboard.down(`Key${key}`);
        await expect(page.getByRole("button", { name: `${name} ${key} key, drum pad` })).toHaveAttribute("aria-pressed", "true");
        await page.keyboard.up(`Key${key}`);
    }
    expect(await page.locator("button[aria-pressed='true']").count()).toBe(0);
});

test("a click or tap flashes the pad and releases it by itself", async ({ page }) => {
    const snare = page.getByRole("button", { name: "Snare A key, drum pad" });
    await snare.click();
    await expect(snare).toHaveAttribute("aria-pressed", "false");
    await snare.tap({ force: true }).catch(() => {});
    await expect(snare).toHaveAttribute("aria-pressed", "false");
});
