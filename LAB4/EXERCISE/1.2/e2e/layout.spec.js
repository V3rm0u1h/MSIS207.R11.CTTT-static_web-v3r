import { test, expect } from "@playwright/test";

function watchConsole(page) {
    const problems = [];
    page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") problems.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    return problems;
}

const boxes = async (page) => ({
    sidebar: await page.locator(".people-sidebar").boundingBox(),
    content: await page.locator(".people-content").boundingBox()
});

const noHorizontalOverflow = (page) =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe("two-column master-detail grid", () => {
    for (const width of [1280, 900, 641]) {
        test(`${width}px: side by side, master >= 280px, detail ~2x master, no overflow`, async ({ page }) => {
            const problems = watchConsole(page);
            await page.setViewportSize({ width, height: 800 });
            await page.goto("/people/p-01");
            const { sidebar, content } = await boxes(page);

            expect(Math.round(sidebar.y)).toBe(Math.round(content.y)); // same row
            expect(content.x).toBeGreaterThan(sidebar.x + sidebar.width);
            expect(sidebar.width).toBeGreaterThanOrEqual(280);
            if (width >= 900) {
                // 1fr : 2fr while the 280px floor is not binding.
                expect(content.width / sidebar.width).toBeGreaterThan(1.9);
                expect(content.width / sidebar.width).toBeLessThan(2.1);
            }
            expect(await noHorizontalOverflow(page)).toBe(true);
            expect(problems).toEqual([]);
        });
    }
});

test.describe("phone layout", () => {
    for (const width of [640, 375, 320]) {
        test(`${width}px: master stacks above detail, no horizontal overflow`, async ({ page }) => {
            const problems = watchConsole(page);
            await page.setViewportSize({ width, height: 800 });
            await page.goto("/people/p-03");
            const { sidebar, content } = await boxes(page);

            expect(content.y).toBeGreaterThanOrEqual(sidebar.y + sidebar.height);
            expect(Math.round(content.width)).toBe(Math.round(sidebar.width)); // single full-width column
            expect(await noHorizontalOverflow(page)).toBe(true);
            expect(problems).toEqual([]);
        });
    }
});

test("NavLink active class follows real browser navigation, back button included", async ({ page }) => {
    const problems = watchConsole(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page).toHaveURL(/\/people$/);
    const nav = page.getByRole("navigation", { name: "People directory" });
    const active = nav.locator("a.active");

    await expect(active).toHaveText(["People"]);
    await nav.getByRole("link", { name: "Le Thu Ha" }).click();
    await expect(page).toHaveURL(/\/people\/p-03$/);
    await expect(active).toHaveText(["Le Thu Ha"]);
    await expect(nav.getByRole("link", { name: "Le Thu Ha" })).toHaveCSS("font-weight", "600");

    await page.goBack();
    await expect(page).toHaveURL(/\/people$/);
    await expect(active).toHaveText(["People"]);
    expect(problems).toEqual([]);
});
