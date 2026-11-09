import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installRenderTracker } from "../src/test/renderTracker.js";

// T-02D in Microsoft Edge with the real PolyphonicSynth:
//   * Stop Sequence aborts a running replay at once and silences it, without an error;
//   * React.memo render isolation, measured through React's DevTools hook (the same
//     mechanism the React DevTools Profiler uses), with real pointer input.
// Unmount cleanup is verified in src/components/Piano.test.jsx (the root is not reachable here).

let consoleErrors;

test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    // Installed before any page script, exactly like the DevTools extension.
    await page.addInitScript(installRenderTracker, "PianoKey");
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Sequencer" })).toBeVisible();
});

test.afterEach(() => {
    expect(consoleErrors, "no JavaScript errors or warnings in the console").toEqual([]);
});

const control = (page, name) => page.getByRole("button", { name, exact: true });
const pianoKey = (page, name) => page.getByRole("button", { name: `${name} key` });
const playbackStatus = (page) => page.getByRole("region", { name: "Sequencer" }).getByRole("status");

async function hold(page, name, ms) {
    const key = pianoKey(page, name);
    await key.scrollIntoViewIfNeeded();
    await key.hover();
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
}

/** Records a long melody: four notes of ~400 ms, ~2 s in total at 1.0×. */
async function recordLongMelody(page) {
    await control(page, "Start Recording").click();
    for (const name of ["C4 white", "E4 white", "G4 white", "C5 white"]) {
        await hold(page, name, 400);
        await page.waitForTimeout(100);
    }
    await control(page, "Stop Recording").click();
    await page.getByRole("radio", { name: "0.5×" }).check();      // ~4 s replay: plenty of time to stop it
}

test("Stop Sequence aborts the replay at once: no further notes, keys released, no error", async ({ page }) => {
    await recordLongMelody(page);
    await page.evaluate(() => {
        window.__strikes = [];
        new MutationObserver((records) => records.forEach(({ target, oldValue }) => {
            if (oldValue === "false") window.__strikes.push(Number(target.dataset.midi));
        })).observe(document.querySelector("ol"), { subtree: true, attributeFilter: ["aria-pressed"], attributeOldValue: true });
    });

    await control(page, "Play Sequence").click();
    await expect(pianoKey(page, "C4 white")).toHaveAttribute("aria-pressed", "true");
    await expect(control(page, "Stop Sequence")).toHaveAttribute("aria-disabled", "false");
    await control(page, "Stop Sequence").click();

    await expect(playbackStatus(page)).toHaveText("Playback stopped.");
    expect(await page.locator("ol button[aria-pressed='true']").count()).toBe(0);
    await expect(page.getByRole("region", { name: "Voices" }).getByRole("status")).toHaveText("0 of 8 voices");
    await expect(control(page, "Play Sequence")).toHaveAttribute("aria-disabled", "false");

    await page.waitForTimeout(4500);                              // longer than the whole replay
    expect(await page.evaluate(() => window.__strikes)).toEqual([60]);
    await expect(playbackStatus(page)).toHaveText("Playback stopped.");
    await expect(page.locator("body")).not.toContainText(/fail|error/i);

    // A new sequence can start straight away and runs to the end.
    await page.getByRole("radio", { name: "2.0×" }).check();
    await control(page, "Play Sequence").click();
    await expect(playbackStatus(page)).toHaveText("Playback finished.", { timeout: 5000 });
});

test("Profiler check: pressing one key re-renders only that PianoKey, for many notes", async ({ page }) => {
    const renders = () => page.evaluate(() => window.__renders.flat());
    const mounted = await renders();
    expect(new Set(mounted).size).toBe(88);                       // the hook really observes PianoKey

    for (const [name, midi] of [["A4 white", 69], ["C#4 black", 61], ["A0 white", 21], ["C8 white", 108]]) {
        await page.evaluate(() => { window.__renders.length = 0; });
        await hold(page, name, 120);
        expect(await renders(), `${name}: only MIDI ${midi} re-renders`).toEqual([midi, midi]);   // press + release
    }
});

test("Profiler check: holding a note and adding another updates only the new key", async ({ page }) => {
    const c4 = pianoKey(page, "C4 white");
    const e4 = pianoKey(page, "E4 white");
    await c4.scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.__renders.length = 0; });
    await c4.dispatchEvent("pointerdown", { pointerType: "mouse", button: 0, isPrimary: true });
    await e4.dispatchEvent("pointerdown", { pointerType: "touch", button: 0, isPrimary: false });
    await expect(e4).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.__renders.filter((commit) => commit.length > 0))).toEqual([[60], [64]]);
});

test("axe WCAG 2.2 AA clean with every panel populated, at 375px", async ({ page }) => {
    await control(page, "Start Recording").click();
    await hold(page, "A4 white", 150);
    await control(page, "Stop Recording").click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
    expect(results.violations).toEqual([]);
});
