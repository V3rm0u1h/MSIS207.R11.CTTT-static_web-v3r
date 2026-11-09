import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// T-03A in Microsoft Edge with Playwright's controllable clock. page.clock lets the test
// freeze every timer while the wall clock moves on, which is what a throttled background
// tab experiences, and then check that returning to the tab corrects the display at once.

const T0 = Date.parse("2026-11-09T12:00:00Z");   // exactly on a 5-minute airdrop boundary
const SEC = 1000;
const MIN = 60 * SEC;

let consoleErrors;

test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    // install() alone only sets the start time: the fake clock keeps running in real time,
    // so a slow page load shifted the expected digits (a flake found with --repeat-each).
    // Pausing at T0 makes every test start at exactly T0; time moves only when a test says so.
    await page.clock.install({ time: T0 - 10 * SEC });
    await page.clock.pauseAt(T0);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Airdrop Arena" })).toBeVisible();
});

test.afterEach(() => {
    expect(consoleErrors, "no JavaScript errors or warnings in the console").toEqual([]);
});

const timer = (page, title) => page.getByRole("timer", { name: `${title} countdown` }).locator("time");
const card = (page, title) => page.getByRole("article", { name: title });

/** Switches the page's visibility the way a tab switch does (Playwright cannot hide a real tab). */
async function setVisibility(page, state) {
    await page.evaluate((value) => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
        document.dispatchEvent(new Event("visibilitychange"));
    }, state);
}

test("both countdowns start from their absolute targets and the simulated server offset", async ({ page }) => {
    // Grand Finals 2026-12-20 12:00 UTC is 41 days after T0; the server runs 1.5 s ahead.
    await expect(timer(page, "PVS Grand Finals")).toHaveText("40 DAYS : 23 HOURS : 59 MIN : 58 SEC");
    // Server now = T0 + 1.5 s, so the next airdrop is T0 + 5 min: 4 min 58.5 s left.
    await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 04 MIN : 58 SEC");
    await expect(page.getByText("Server clock offset: +1.500 s (simulated)")).toBeVisible();
});

test("background tab: timers frozen for 3 minutes, display corrected the instant the tab is visible", async ({ page }) => {
    await page.clock.pauseAt(T0 + 2 * SEC);                       // every timer stops firing from here
    await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 04 MIN : 56 SEC");

    await setVisibility(page, "hidden");
    await page.clock.setSystemTime(T0 + 2 * SEC + 3 * MIN);       // wall clock moves on, no timer fires
    await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 04 MIN : 56 SEC");   // stale while hidden

    await setVisibility(page, "visible");                         // still no timer may fire
    await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 01 MIN : 56 SEC");
    await expect(timer(page, "PVS Grand Finals")).toHaveText("40 DAYS : 23 HOURS : 56 MIN : 56 SEC");
});

test("the countdown reaches zero, turns live, and never shows a negative value", async ({ page }) => {
    const airdrop = card(page, "G-Coin Airdrop");
    await expect(airdrop.getByText("Incoming")).toBeVisible();
    await page.clock.fastForward(5 * MIN);
    await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 00 MIN : 00 SEC");
    await expect(airdrop.getByText("Airdrop landed")).toBeVisible();
    await expect(airdrop).toHaveAttribute("data-live", "true");
    await expect(card(page, "PVS Grand Finals")).toHaveAttribute("data-live", "false");   // independent

    await page.clock.fastForward(10 * MIN);
    await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 00 MIN : 00 SEC");
    await expect(page.locator("main")).not.toContainText("-0");
});

test("only the status is a live region; the ticking timers are not", async ({ page }) => {
    const live = page.locator("[aria-live]:not([aria-live='off'])");
    await expect(live).toHaveCount(2);
    await expect(live.first()).toHaveAttribute("aria-live", "polite");
    for (const element of await page.getByRole("timer").all()) {
        expect(await element.getAttribute("aria-live")).toBeNull();
    }
});

for (const [label, viewport] of [["phone", { width: 375, height: 812 }], ["desktop", { width: 1280, height: 800 }]]) {
    test(`${label} (${viewport.width}px): no horizontal overflow, axe WCAG 2.2 AA clean`, async ({ page }) => {
        // axe-core schedules its own work with setTimeout, which the paused fake clock would
        // freeze (the run timed out at 30 s); let time flow normally for this test.
        await page.clock.resume();
        await page.setViewportSize(viewport);
        await page.reload();
        await expect(page.getByRole("timer")).toHaveCount(2);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
            .analyze();
        expect(results.violations).toEqual([]);
    });
}
