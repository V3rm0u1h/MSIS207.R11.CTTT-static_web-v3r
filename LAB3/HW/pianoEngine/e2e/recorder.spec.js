import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// T-02C — record with real mouse presses, replay through the real PolyphonicSynth at
// 0.5× / 1.0× / 2.0× in Microsoft Edge, keyboard operation and WCAG 2.2 AA.

let consoleErrors;

test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Recording" })).toBeVisible();
});

test.afterEach(() => {
    expect(consoleErrors, "no JavaScript errors or warnings in the console").toEqual([]);
});

const recordingStatus = (page) => page.getByRole("region", { name: "Recording" }).getByRole("status");
const playbackStatus = (page) => page.getByRole("region", { name: "Sequencer" }).getByRole("status");
const control = (page, name) => page.getByRole("button", { name, exact: true });
const pianoKey = (page, name) => page.getByRole("button", { name: `${name} key` });

/** Holds a key with the real mouse for about `ms`. */
async function hold(page, name, ms) {
    const key = pianoKey(page, name);
    await key.scrollIntoViewIfNeeded();
    await key.hover();
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
}

async function recordThreeNotes(page) {
    await control(page, "Start Recording").click();
    await hold(page, "C4 white", 250);
    await hold(page, "E4 white", 250);
    await hold(page, "G4 white", 250);
    await control(page, "Stop Recording").click();
    await expect(recordingStatus(page)).toHaveText("Recording stopped: 3 notes recorded.");
}

/** Records, page side, when each key becomes pressed and the playback's total time. */
async function timeReplay(page, label) {
    await page.getByRole("radio", { name: label }).check();
    await page.evaluate(() => {
        window.__observer?.disconnect();             // one observer per replay
        window.__onsets = [];
        const start = performance.now();
        window.__replayStart = start;
        // A note is struck when its key goes from not pressed to pressed (oldValue "false").
        window.__observer = new MutationObserver((records) => {
            records.forEach(({ target, oldValue }) => {
                if (oldValue === "false") window.__onsets.push([Number(target.dataset.midi), performance.now() - start]);
            });
        });
        window.__observer.observe(document.querySelector("ol"), { subtree: true, attributeFilter: ["aria-pressed"], attributeOldValue: true });
    });
    await control(page, "Play Sequence").click();
    await expect(playbackStatus(page)).toHaveText("Playback finished.", { timeout: 10000 });
    return page.evaluate(() => ({ onsets: window.__onsets, total: performance.now() - window.__replayStart }));
}

test("records real presses with all four fields, in order, with plausible timing", async ({ page }) => {
    await recordThreeNotes(page);
    const rows = await page.getByRole("table").locator("tbody tr").evaluateAll((trs) => trs.map((tr) => [...tr.cells].map((c) => c.textContent)));
    expect(rows.map((r) => r.slice(1, 4))).toEqual([
        ["C4", "60", "261.63 Hz"], ["E4", "64", "329.63 Hz"], ["G4", "67", "392.00 Hz"]
    ]);
    const ms = (text) => Number.parseInt(text, 10);
    rows.forEach((row) => {
        expect(ms(row[6])).toBeGreaterThanOrEqual(230);   // duration ≈ 250 ms hold
        expect(ms(row[6])).toBeLessThan(600);
    });
    expect(ms(rows[0][5])).toBe(0);
    expect(ms(rows[1][5])).toBeGreaterThanOrEqual(ms(rows[0][6]));   // E4 starts after C4 was released
});

test("replay at 0.5×, 1.0× and 2.0× keeps the note order and scales the timing", async ({ page }) => {
    await recordThreeNotes(page);
    const runs = {};
    for (const label of ["1.0×", "2.0×", "0.5×"]) {
        runs[label] = await timeReplay(page, label);
        expect(runs[label].onsets.map(([midi]) => midi)).toEqual([60, 64, 67]);
    }
    const span = ({ onsets }) => onsets[2][1] - onsets[0][1];
    // Onset spans scale with 1 / speed (generous tolerance for timer and frame jitter).
    expect(span(runs["2.0×"]) / span(runs["1.0×"])).toBeGreaterThan(0.35);
    expect(span(runs["2.0×"]) / span(runs["1.0×"])).toBeLessThan(0.65);
    expect(span(runs["0.5×"]) / span(runs["1.0×"])).toBeGreaterThan(1.7);
    expect(span(runs["0.5×"]) / span(runs["1.0×"])).toBeLessThan(2.3);
    expect(await page.locator("ol button[aria-pressed='true']").count()).toBe(0);
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(3);   // still the same recording
});

test("Clear Recording empties the take; Play Sequence is then unavailable", async ({ page }) => {
    await recordThreeNotes(page);
    await control(page, "Clear Recording").click();
    await expect(recordingStatus(page)).toHaveText("Recording cleared.");
    await expect(page.getByText("No notes recorded yet.")).toBeVisible();
    await expect(control(page, "Play Sequence")).toHaveAttribute("aria-disabled", "true");
});

test("keyboard only: record with Space held on keys, replay with Enter", async ({ page }) => {
    await control(page, "Start Recording").focus();
    await page.keyboard.press("Enter");
    await expect(control(page, "Start Recording")).toBeFocused();   // focus is kept, not dropped
    await pianoKey(page, "A4 white").focus();
    await page.keyboard.down("Space");
    await expect(pianoKey(page, "A4 white")).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(200);
    await page.keyboard.up("Space");
    await expect(pianoKey(page, "A4 white")).toHaveAttribute("aria-pressed", "false");
    await control(page, "Stop Recording").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(1);
    await control(page, "Play Sequence").focus();
    await page.keyboard.press("Enter");
    await expect(playbackStatus(page)).toHaveText("Playback finished.");
});

test("axe WCAG 2.2 AA clean with a recording on screen, at 375px", async ({ page }) => {
    await recordThreeNotes(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
    expect(results.violations).toEqual([]);
});
