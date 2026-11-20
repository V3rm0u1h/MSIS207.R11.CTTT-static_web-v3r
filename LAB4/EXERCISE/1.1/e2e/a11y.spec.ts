import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const CHUNK = /\/assets\/PersonDetail-[\w-]+\.js$/;

/** Fail the test on ANY console error/warning or uncaught page error. */
function watchConsole(page: Page) {
    const problems: string[] = [];
    page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") problems.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    return problems;
}

async function gateChunk(page: Page) {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await page.route(CHUNK, async (route) => {
        await released;
        await route.continue();
    });
    return release;
}

const region = (page: Page) => page.getByRole("region", { name: "Profile" });
const status = (page: Page) => page.getByRole("status");

test("throttled network: busy skeleton → profile → not busy, zero shift, clean console", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "network throttling uses the Chromium DevTools protocol");
    const problems = watchConsole(page);
    await page.addInitScript(() => {
        const w = window as unknown as { __shift: number };
        w.__shift = 0;
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as { value: number }[]) w.__shift += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/");
    // Sentinel below the profile so any height change would register as a shift.
    await page.addStyleTag({ content: "main::after { content: ''; display: block; block-size: 40px; }" });
    await expect(region(page)).toHaveAttribute("aria-busy", "false");

    // Real browser throttling (DevTools "Slow 3G"-like): 2 s latency, ~50 KB/s.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 2000,
        downloadThroughput: 50 * 1024,
        uploadThroughput: 25 * 1024
    });

    const chunkRequest = page.waitForRequest(CHUNK);
    await page.getByRole("button", { name: "Le Thu Ha" }).click();
    await chunkRequest; // React requested the lazy module

    await expect(page.locator(".person-detail--skeleton")).toBeVisible();
    await expect(region(page)).toHaveAttribute("aria-busy", "true");
    await expect(status(page)).toHaveText("Loading profile…");
    await page.waitForTimeout(700); // past the click's input-exclusion window
    const shiftBeforeSwap = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);

    const article = page.getByRole("article", { name: "Le Thu Ha" });
    await expect(article).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".person-detail--skeleton")).toHaveCount(0);
    await expect(region(page)).toHaveAttribute("aria-busy", "false");
    await expect(status(page)).toHaveText("Profile loaded.");

    await page.waitForTimeout(300);
    const shiftAfterSwap = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
    expect(shiftAfterSwap - shiftBeforeSwap).toBe(0);
    expect(problems).toEqual([]);
});

test("accessibility tree: skeleton is invisible to AT, status is polite and announces once", async ({ page }) => {
    const problems = watchConsole(page);
    const release = await gateChunk(page);
    await page.goto("/");

    await expect(status(page)).toHaveAttribute("aria-live", "polite");
    await page.getByRole("button", { name: "Tran Quoc Bao" }).click();
    await expect(page.locator(".person-detail--skeleton")).toBeVisible();

    // Loading: the region exposes no skeleton content; the status speaks for it.
    expect((await region(page).ariaSnapshot()).trim()).toBe('- region "Profile"');
    expect(await status(page).ariaSnapshot()).toContain("Loading profile…");
    expect(await region(page).evaluate((el, s) => el.contains(s), await status(page).elementHandle())).toBe(false);

    const loadingScan = await new AxeBuilder({ page }).analyze();
    expect(loadingScan.violations.map((v) => v.id)).toEqual([]);

    release();
    await expect(page.getByRole("article", { name: "Tran Quoc Bao" })).toBeVisible();

    // Loaded: meaningful semantics reach the accessibility tree.
    const loaded = await region(page).ariaSnapshot();
    expect(loaded).toContain('article "Tran Quoc Bao"');
    expect(loaded).toContain('heading "Tran Quoc Bao" [level=2]');
    expect(loaded).toContain('link "quoc.bao@example.com"');
    expect(loaded).toContain('region "Skills"');
    expect(await status(page).ariaSnapshot()).toContain("Profile loaded.");

    const loadedScan = await new AxeBuilder({ page }).analyze();
    expect(loadedScan.violations.map((v) => v.id)).toEqual([]);
    expect(problems).toEqual([]);
});

test("keyboard: select via Enter/Space, focus is kept during loading, skeleton adds no tab stops", async ({ page }) => {
    const problems = watchConsole(page);
    const release = await gateChunk(page);
    await page.goto("/");
    const focusedName = () => page.evaluate(() => document.activeElement?.textContent ?? "");

    await page.keyboard.press("Tab");
    expect(await focusedName()).toBe("Nguyen Minh Anh");
    await page.keyboard.press("Tab");
    expect(await focusedName()).toBe("Tran Quoc Bao");
    await page.keyboard.press("Enter");

    await expect(page.locator(".person-detail--skeleton")).toBeVisible();
    await expect(region(page)).toHaveAttribute("aria-busy", "true");
    expect(await focusedName()).toBe("Tran Quoc Bao"); // focus not lost or stolen
    await page.keyboard.press("Tab");
    expect(await focusedName()).toBe("Le Thu Ha");
    await page.keyboard.press("Tab"); // nothing focusable inside the skeleton
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);

    release();
    await expect(page.getByRole("article", { name: "Tran Quoc Bao" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tran Quoc Bao" })).toHaveAttribute("aria-pressed", "true");

    // Space activates too; then Tab reaches the profile's link.
    await page.getByRole("button", { name: "Le Thu Ha" }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("article", { name: "Le Thu Ha" })).toBeVisible();
    await page.keyboard.press("Tab");
    expect(await focusedName()).toBe("thu.ha@example.com");
    expect(problems).toEqual([]);
});
