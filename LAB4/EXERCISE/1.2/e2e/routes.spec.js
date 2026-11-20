import { test, expect } from "@playwright/test";

/** Sprint 1 DevTools checkpoints, in a real browser on the dev server. */
function watchConsole(page) {
    const problems = [];
    page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") problems.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    return problems;
}

const noHorizontalOverflow = (page) =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const SCENARIOS = [
    { url: "/people", expect: (page) => expect(page.getByRole("heading", { level: 2, name: "Directory" })).toBeVisible() },
    { url: "/people/p-01", expect: (page) => expect(page.getByRole("article", { name: "Nguyen Minh Anh" })).toBeVisible() },
    { url: "/people/p-03", expect: (page) => expect(page.getByRole("article", { name: "Le Thu Ha" })).toBeVisible() },
    { url: "/people/invalid-id", expect: (page) => expect(page.getByRole("heading", { level: 2, name: "Person Not Found" })).toBeVisible() },
    { url: "/people/nonexistent", expect: (page) => expect(page.getByRole("heading", { level: 2, name: "Person Not Found" })).toBeVisible() }
];

for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
    test.describe(`${viewport.width}px`, () => {
        test.use({ viewport });

        for (const scenario of SCENARIOS) {
            test(`${scenario.url}: correct view, layout kept, clean console, no overflow`, async ({ page }) => {
                const problems = watchConsole(page);
                await page.goto(scenario.url);
                await scenario.expect(page);

                await expect(page.getByRole("heading", { level: 1, name: "Case Dossier Directory" })).toBeVisible();
                await expect(page.getByRole("navigation", { name: "People directory" })).toBeVisible();
                await expect(page.locator("body")).not.toContainText(/undefined|\[object/);

                const sidebar = await page.locator(".people-sidebar").boundingBox();
                const content = await page.locator(".people-content").boundingBox();
                if (viewport.width > 640) expect(Math.round(sidebar.y)).toBe(Math.round(content.y)); // two columns
                else expect(content.y).toBeGreaterThanOrEqual(sidebar.y + sidebar.height); // stacked
                expect(await noHorizontalOverflow(page)).toBe(true);
                expect(problems).toEqual([]);
            });
        }
    });
}

test("Not Found → Return to Directory → valid dossier, with history intact", async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto("/people/nonexistent");
    await page.getByRole("link", { name: "Return to Directory" }).click();
    await expect(page).toHaveURL(/\/people$/);
    await expect(page.getByRole("heading", { level: 2, name: "Directory" })).toBeVisible();

    await page.getByRole("navigation", { name: "People directory" }).getByRole("link", { name: "Tran Quoc Bao" }).click();
    await expect(page).toHaveURL(/\/people\/p-02$/);
    await expect(page.getByRole("article", { name: "Tran Quoc Bao" })).toBeVisible();

    await page.goBack();
    await page.goBack();
    await expect(page.getByRole("heading", { level: 2, name: "Person Not Found" })).toBeVisible();
    expect(problems).toEqual([]);
});

test("definition list keeps each label with its value on desktop and stacks on phones", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/people/p-02");
    const dt = page.locator(".person-details dt").first();
    const dd = page.locator(".person-details dd").first();
    expect(Math.round((await dt.boundingBox()).y)).toBe(Math.round((await dd.boundingBox()).y)); // same row
    await expect(dt).toHaveText("Name");

    await page.setViewportSize({ width: 375, height: 812 });
    expect((await dd.boundingBox()).y).toBeGreaterThan((await dt.boundingBox()).y); // label above value
});
