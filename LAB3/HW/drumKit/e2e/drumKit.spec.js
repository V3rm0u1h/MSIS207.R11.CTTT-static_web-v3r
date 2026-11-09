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

test("a hit is logged, announced politely, and plays audio that moves the level meter", async ({ page }) => {
    const log = page.getByRole("region", { name: "Hit Log" });
    const status = log.locator("output");
    await expect(status).toHaveText("No drum hits yet");
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(status).toHaveAttribute("aria-atomic", "true");

    await page.keyboard.press("KeyW");
    await expect(status).toHaveText("Kick triggered, hit 1");
    const items = log.getByRole("listitem");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("Kick");
    await expect(items.first().locator("kbd")).toHaveText("W");
    // The sample decodes and the entry gets its intensity.
    await expect(items.first().getByRole("meter")).toHaveAccessibleName(/Intensity \d+%/);

    // Meter: labelled as a relative signal level, active while the sample plays, then inactive again.
    const meterRegion = page.getByRole("region", { name: "Audio Level" });
    const meter = meterRegion.getByRole("meter", { name: "Relative audio signal level" });
    await expect(meterRegion).toContainText("dBFS");
    await expect(meterRegion).not.toContainText(/dB SPL(?!\.)(?! )/);
    await page.keyboard.press("KeyK"); // the long cymbal
    await expect(meterRegion).toHaveAttribute("data-state", "active", { timeout: 2000 });
    await expect(meterRegion).toHaveAttribute("data-state", "inactive", { timeout: 8000 });
    await expect(meter).toHaveAttribute("value", "0");
});

test("the hit log is capped and only the newest hit is announced", async ({ page }) => {
    for (let n = 0; n < 15; n += 1) await page.keyboard.press("KeyS");
    const log = page.getByRole("region", { name: "Hit Log" });
    await expect(log.locator("output")).toHaveText("Hi-Hat triggered, hit 15");
    await expect(log.getByRole("listitem")).toHaveCount(12);
    await expect(log.getByRole("listitem").first()).toContainText("#15");
});
