import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// T-03D — manual QA checklist, automated in a real browser at a 375px viewport
// (dev server, so React StrictMode's double effect run is active).

const SCREENSHOT_DIR = "images";
const TIMEOUT_MESSAGE = "Satellite packet timeout. Please reconnect.";

/**
 * Makes packet loss controllable (window.__packetLoss: true → every request
 * times out), counts AbortController.abort() calls, records any blocking
 * dialog, and collects console errors / page errors.
 */
async function preparePage(page) {
    const problems = [];
    const dialogs = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") problems.push(`${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("dialog", async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
    });
    await page.addInitScript(() => {
        window.__packetLoss = false;
        window.__aborts = 0;
        Math.random = () => (window.__packetLoss ? 0.1 : 0.5);
        const abort = AbortController.prototype.abort;
        AbortController.prototype.abort = function (...args) {
            window.__aborts += 1;
            return abort.apply(this, args);
        };
    });
    await page.goto("/?view=telemetry");
    return { problems, dialogs };
}

const squadSelect = (page) => page.getByLabel("Squad");
const skeleton = (page) => page.locator("article[aria-hidden='true']");
const dashboardHeading = (page) => page.getByRole("article").getByRole("heading", { level: 2 });
const aborts = (page) => page.evaluate(() => window.__aborts);
const setPacketLoss = (page, lost) => page.evaluate((value) => { window.__packetLoss = value; }, lost);

async function expectNoAxeViolations(page) {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

test.describe("PUBG Match Telemetry — T-03D QA checklist", () => {
    test("IDLE shows only the connection prompt", async ({ page }) => {
        const { problems } = await preparePage(page);
        await expect(page.getByText(/to connect the radar/)).toBeVisible();
        await expect(skeleton(page)).toHaveCount(0);
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expectNoAxeViolations(page);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/t03d-375-idle.png`, fullPage: true });
        expect(problems).toEqual([]);
    });

    test("CES → TE while loading aborts the first request; rapid switching never raises a false error", async ({ page }) => {
        const { problems, dialogs } = await preparePage(page);

        // Select Cerberus Esports and observe the loading skeleton.
        await squadSelect(page).selectOption("CES");
        await page.getByRole("button", { name: "Request telemetry" }).click();
        await expect(skeleton(page)).toBeVisible();
        const skeletonBox = await skeleton(page).boundingBox();
        expect(skeletonBox.height).toBeGreaterThanOrEqual(220);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/t03d-375-loading.png`, fullPage: true });

        // Switch immediately to The Expendables: the CES request is aborted.
        const before = await aborts(page);
        await squadSelect(page).selectOption("TE");
        expect(await aborts(page)).toBeGreaterThan(before);
        await expect(page.getByRole("alert")).toHaveCount(0);

        // Switch rapidly among all three squads.
        for (const id of ["GE", "CES", "TE", "GE", "CES", "TE"]) {
            await squadSelect(page).selectOption(id);
            await expect(page.getByRole("alert")).toHaveCount(0);
        }

        // Only the latest squad's data appears, and no error ever did.
        await expect(dashboardHeading(page)).toHaveText("The Expendables");
        await expect(page.getByRole("article")).toHaveCount(1);
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(page.getByText(/not official live PVS match data/)).toBeVisible();
        await expectNoAxeViolations(page);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/t03d-375-success.png`, fullPage: true });

        expect(dialogs).toEqual([]);
        expect(problems).toEqual([]);
    });

    test("packet timeout shows an inline alert; Reconnect starts a fresh request", async ({ page }) => {
        const { problems, dialogs } = await preparePage(page);

        // Force a simulated packet timeout.
        await setPacketLoss(page, true);
        await squadSelect(page).selectOption("GE");
        await page.getByRole("button", { name: "Request telemetry" }).click();

        const alert = page.getByRole("alert", { name: "Satellite Connection Lost" });
        await expect(alert).toBeVisible();
        await expect(alert).toContainText(TIMEOUT_MESSAGE);
        await expect(skeleton(page)).toHaveCount(0);
        await expect(page.getByRole("article")).toHaveCount(0);
        await expectNoAxeViolations(page);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/t03d-375-error.png`, fullPage: true });

        // Retry is not forced to succeed: still lossy → a new error.
        await page.getByRole("button", { name: "Reconnect Telemetry" }).click();
        await expect(skeleton(page)).toBeVisible();
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(alert).toBeVisible();

        // Link restored: Reconnect → skeleton → dashboard for the selected squad.
        await setPacketLoss(page, false);
        await page.getByRole("button", { name: "Reconnect Telemetry" }).click();
        await expect(skeleton(page)).toBeVisible();
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(dashboardHeading(page)).toHaveText("Genius Esports");

        // No window.alert() dialog at any point.
        expect(dialogs).toEqual([]);
        expect(problems).toEqual([]);
    });
});
