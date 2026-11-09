import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// T-03B in Microsoft Edge: optimistic claims against the mock backend (600 ms latency),
// with real clicks, a real double-click, keyboard operation and axe on every claim state.

const VIP = "PVS Grand Finals VIP Ticket";
const CRATE = "G-Coin Contraband Crate";

let consoleErrors;

test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Claim Center" })).toBeVisible();
});

test.afterEach(() => {
    expect(consoleErrors, "no JavaScript errors or warnings in the console").toEqual([]);
});

const card = (page, name) => page.getByRole("article", { name });
const stock = (page, name) => card(page, name).locator("[data-field='stock']");
const status = (page, name) => card(page, name).getByRole("status");
const simulate = (page, name, mode) => page.getByRole("combobox", { name }).selectOption(mode);

test("shows both items with VND prices from Intl", async ({ page }) => {
    await expect(card(page, VIP).locator("[data-field='price']")).toHaveText("1.500.000 ₫");
    await expect(card(page, CRATE).locator("[data-field='price']")).toHaveText("0 ₫");
    await expect(stock(page, VIP)).toHaveText("25");
    await expect(stock(page, CRATE)).toHaveText("100");
});

test("HTTP 200: the stock drops before the server answers, then success is announced", async ({ page }) => {
    await card(page, VIP).getByRole("button", { name: "Claim ticket" }).click();
    await expect(stock(page, VIP)).toHaveText("24");
    await expect(card(page, VIP).getByRole("button", { name: "Claiming…" })).toHaveAttribute("aria-disabled", "true");
    await expect(status(page, VIP)).toHaveText(`Claiming ${VIP}…`);
    await expect(status(page, VIP)).toHaveText(/^Claim successful: PVS Grand Finals VIP Ticket \(claim [0-9a-f]{8}\)\.$/);
    await expect(stock(page, VIP)).toHaveText("24");
});

test("HTTP 409: the deducted unit comes back and Looted Out! is announced", async ({ page }) => {
    await simulate(page, VIP, "conflict");
    await card(page, VIP).getByRole("button", { name: "Claim ticket" }).click();
    await expect(stock(page, VIP)).toHaveText("24");
    await expect(status(page, VIP)).toHaveText(/^Looted Out!/);
    await expect(stock(page, VIP)).toHaveText("25");
});

test("network error: not a success, stock restored; Retry re-sends the same claim and succeeds", async ({ page }) => {
    await simulate(page, CRATE, "network-error");
    await card(page, CRATE).getByRole("button", { name: "Claim crate" }).click();
    await expect(status(page, CRATE)).toHaveText(/^Network error: your claim was not confirmed/);
    await expect(stock(page, CRATE)).toHaveText("100");
    await simulate(page, CRATE, "auto");
    await card(page, CRATE).getByRole("button", { name: "Retry claim" }).click();
    await expect(status(page, CRATE)).toHaveText(/^Claim successful/);
    await expect(stock(page, CRATE)).toHaveText("99");
});

test("a real double-click makes one claim", async ({ page }) => {
    await card(page, CRATE).getByRole("button", { name: "Claim crate" }).dblclick();
    await expect(status(page, CRATE)).toHaveText(/^Claim successful/);
    await expect(stock(page, CRATE)).toHaveText("99");
});

test("simultaneous claims: the ticket's 409 leaves the crate's successful claim untouched", async ({ page }) => {
    await simulate(page, VIP, "conflict");
    await card(page, VIP).getByRole("button", { name: "Claim ticket" }).click();
    await card(page, CRATE).getByRole("button", { name: "Claim crate" }).click();
    await expect(stock(page, VIP)).toHaveText("24");
    await expect(stock(page, CRATE)).toHaveText("99");
    await expect(status(page, VIP)).toHaveText(/^Looted Out!/);
    await expect(status(page, CRATE)).toHaveText(/^Claim successful/);
    await expect(stock(page, VIP)).toHaveText("25");
    await expect(stock(page, CRATE)).toHaveText("99");
});

test("keyboard: Enter claims, focus stays on the button while pending", async ({ page }) => {
    const claim = card(page, VIP).getByRole("button", { name: "Claim ticket" });
    await claim.focus();
    await page.keyboard.press("Enter");
    await expect(card(page, VIP).getByRole("button", { name: "Claiming…" })).toBeFocused();
    await page.keyboard.press("Enter");                                    // ignored while pending
    await expect(status(page, VIP)).toHaveText(/^Claim successful/);
    await expect(stock(page, VIP)).toHaveText("24");
    await expect(card(page, VIP).getByRole("button", { name: "Claim ticket" })).toBeFocused();
});

for (const [label, viewport] of [["phone", { width: 375, height: 812 }], ["desktop", { width: 1280, height: 800 }]]) {
    test(`${label} (${viewport.width}px): axe WCAG 2.2 AA clean in success, conflict and error states`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await simulate(page, CRATE, "network-error");
        await card(page, VIP).getByRole("button", { name: "Claim ticket" }).click();
        await card(page, CRATE).getByRole("button", { name: "Claim crate" }).click();
        await expect(card(page, CRATE).getByRole("button", { name: "Retry claim" })).toBeVisible();
        await expect(status(page, VIP)).toHaveText(/^Claim successful/);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
            .analyze();
        expect(results.violations).toEqual([]);
    });
}
