import { test, expect, type Page } from "@playwright/test";

// Sum EVERY layout shift (including ones flagged hadRecentInput), so the
// skeleton -> PersonDetail swap cannot hide behind the 500 ms input exclusion.
async function installShiftRecorder(page: Page) {
    await page.addInitScript(() => {
        const w = window as unknown as { __shifts: { value: number; time: number }[] };
        w.__shifts = [];
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as { value: number; startTime: number }[]) {
                w.__shifts.push({ value: entry.value, time: entry.startTime });
            }
        }).observe({ type: "layout-shift", buffered: true });
    });
}

const shiftsSince = (page: Page, since: number) =>
    page.evaluate((t) => {
        const w = window as unknown as { __shifts: { value: number; time: number }[] };
        return w.__shifts.filter((s) => s.time >= t).reduce((sum, s) => sum + s.value, 0);
    }, since);

/** Holds the lazy PersonDetail chunk until release() is called. */
async function gatePersonDetailChunk(page: Page) {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let requested = false;
    await page.route(/\/assets\/PersonDetail-[\w-]+\.js$/, async (route) => {
        requested = true;
        await released;
        await route.continue();
    });
    return { release, wasRequested: () => requested };
}

test("PersonDetail chunk is not downloaded until a person is selected", async ({ page }) => {
    const gate = await gatePersonDetailChunk(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(gate.wasRequested()).toBe(false);
    gate.release();
});

for (const name of ["Nguyen Minh Anh", "Tran Quoc Bao", "Le Thu Ha"]) {
    test(`skeleton reserves the exact PersonDetail box for ${name}: zero layout shift on swap`, async ({ page }) => {
        await installShiftRecorder(page);
        const gate = await gatePersonDetailChunk(page);
        await page.goto("/");
        // Sentinel block BELOW the profile: nothing follows it in the real page, so
        // without this a height mismatch would never register as a layout shift.
        // (A negative-control run with a broken skeleton recorded a shift > 0 here.)
        await page.addStyleTag({ content: "main::after { content: ''; display: block; block-size: 40px; }" });

        await page.getByRole("button", { name }).click();
        const skeleton = page.locator(".person-detail--skeleton");
        await expect(skeleton).toBeVisible();
        await expect(page.getByRole("status")).toHaveText(/loading profile/i);
        expect(gate.wasRequested()).toBe(true);
        const skeletonBox = (await skeleton.boundingBox())!;

        // Let the click's input window pass, then mark the swap moment.
        await page.waitForTimeout(700);
        const swapStart = await page.evaluate(() => performance.now());
        gate.release();

        const article = page.getByRole("article", { name });
        await expect(article).toBeVisible();
        await expect(skeleton).toHaveCount(0);
        const articleBox = (await article.boundingBox())!;

        expect(articleBox.x).toBeCloseTo(skeletonBox.x, 0);
        expect(articleBox.y).toBeCloseTo(skeletonBox.y, 0);
        expect(articleBox.width).toBeCloseTo(skeletonBox.width, 0);
        expect(articleBox.height).toBeCloseTo(skeletonBox.height, 0);

        await page.waitForTimeout(300); // let any late shift entries be delivered
        expect(await shiftsSince(page, swapStart)).toBe(0);
    });
}

test("pulse animation runs in CSS and stops under prefers-reduced-motion", async ({ page }) => {
    const gate = await gatePersonDetailChunk(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Le Thu Ha" }).click();
    const bar = page.locator(".person-detail--skeleton .sk").first();
    await expect(bar).toBeVisible();
    const animationOf = () => bar.evaluate((el) => getComputedStyle(el, "::after").animationName);

    expect(await animationOf()).toBe("pd-pulse");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await animationOf()).toBe("none");
    gate.release();
});
