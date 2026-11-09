import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// T-03C in Microsoft Edge: the leaderboard and the virtualized 1,000-event kill feed,
// measured with real layout and real scrolling.

const ROW = 64;
const VIEWPORT = 384;
const OVERSCAN = 5;
const MAX_ROWS = VIEWPORT / ROW + 1 + 2 * OVERSCAN;   // 17

let consoleErrors;

test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("region", { name: "PUBG Vietnam Championship" })).toBeVisible();
});

test.afterEach(() => {
    expect(consoleErrors, "no JavaScript errors or warnings in the console").toEqual([]);
});

const feed = (page) => page.getByRole("list", { name: "Kill Feed" });
const rowTags = (page) => page.getByRole("table").locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.cells[2]?.textContent));

/** Scrolls the kill feed like a user (wheel), then reads its real geometry and DOM rows. */
async function feedState(page) {
    return feed(page).evaluate((list) => ({
        scrollTop: list.scrollTop,
        scrollHeight: list.scrollHeight,
        clientHeight: list.clientHeight,
        rendered: list.querySelectorAll("li").length,
        first: list.querySelector("li")?.getAttribute("aria-posinset"),
        last: list.querySelector("li:last-child")?.getAttribute("aria-posinset"),
        setsize: list.querySelector("li")?.getAttribute("aria-setsize"),
        visibleTexts: [...list.querySelectorAll("li")].filter((li) => {
            const a = li.getBoundingClientRect();
            const b = list.getBoundingClientRect();
            return a.bottom > b.top && a.top < b.bottom;
        }).length
    }));
}

test("the 1,000-event feed scrolls through its full height while rendering at most 17 rows", async ({ page }) => {
    const start = await feedState(page);
    expect(start.setsize).toBe("1000");
    // The padding stands in for every unrendered row, so the real scroll height is the full list.
    expect(start.scrollHeight).toBe(1000 * ROW);
    expect(start.clientHeight).toBe(VIEWPORT - 2);                       // minus the 1px borders
    expect(start.rendered).toBe(VIEWPORT / ROW + OVERSCAN);

    await feed(page).hover();
    for (const delta of [5000, 20000, 30000]) {
        await page.mouse.wheel(0, delta);
        await expect.poll(async () => (await feedState(page)).scrollTop).toBeGreaterThan(0);
        const state = await feedState(page);
        expect(state.rendered).toBeLessThanOrEqual(MAX_ROWS);
        expect(state.visibleTexts).toBeGreaterThanOrEqual(6);            // the viewport is never blank
        expect(state.scrollHeight).toBe(1000 * ROW);
    }
});

test("keyboard: the feed is focusable and End reaches event 1,000", async ({ page }) => {
    await feed(page).focus();
    await expect(feed(page)).toBeFocused();
    await page.keyboard.press("End");
    await expect.poll(async () => (await feedState(page)).last).toBe("1000");
    const state = await feedState(page);
    expect(state.rendered).toBeLessThanOrEqual(MAX_ROWS);
    await page.keyboard.press("Home");
    await expect.poll(async () => (await feedState(page)).first).toBe("1");
});

test("filtering the feed by squad shows only that squad, from the top, still virtualized", async ({ page }) => {
    await feed(page).hover();
    await page.mouse.wheel(0, 20000);
    await page.getByRole("combobox", { name: "Show squad" }).selectOption("CES");
    await expect(page.getByRole("region", { name: "Kill Feed" }).getByRole("status")).toHaveText(/^Showing \d+ of 1,000 events for Cerberus Esports\.$/);
    const tags = await feed(page).locator("abbr").allTextContents();
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags)).toEqual(new Set(["CES"]));
    const state = await feedState(page);
    expect(state.scrollTop).toBe(0);
    expect(state.first).toBe("1");
});

test("leaderboard: search by name and tag, WWCD filter, and all three sorts", async ({ page }) => {
    expect(await rowTags(page)).toEqual(["TE", "CES", "ROY", "AGG"]);
    await page.getByRole("combobox", { name: "Sort by" }).selectOption("killPoints");
    expect(await rowTags(page)).toEqual(["CES", "AGG", "TE", "ROY"]);
    await page.getByRole("combobox", { name: "Sort by" }).selectOption("placementPoints");
    expect(await rowTags(page)).toEqual(["TE", "CES", "ROY", "AGG"]);
    await page.getByRole("combobox", { name: "Sort by" }).selectOption("wwcd");

    await page.getByRole("searchbox", { name: "Search squads" }).fill("cerberus");
    expect(await rowTags(page)).toEqual(["CES"]);
    await page.getByRole("searchbox", { name: "Search squads" }).fill("ROY");
    expect(await rowTags(page)).toEqual(["ROY"]);
    await page.getByRole("searchbox", { name: "Search squads" }).fill("");
    await page.getByRole("combobox", { name: "Minimum WWCD" }).selectOption("2");
    expect(await rowTags(page)).toEqual(["TE", "CES"]);
    await expect(page.getByRole("region", { name: "Squad Leaderboard" }).getByRole("status")).toHaveText("Showing 2 of 4 squads, sorted by WWCD.");
});

for (const [label, viewport] of [["phone", { width: 375, height: 812 }], ["desktop", { width: 1280, height: 800 }]]) {
    test(`${label} (${viewport.width}px): page never scrolls sideways (the table does), axe WCAG 2.2 AA clean`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.reload();
        await expect(feed(page)).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        const results = await new AxeBuilder({ page })
            .include("section[aria-labelledby='championship-title']")
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
            .analyze();
        expect(results.violations).toEqual([]);
    });
}
