import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// T-03D — the integrated platform in Microsoft Edge: the PRD 4 section 4 scenario table walked
// through in ONE page session (state must stay consistent across the three sections),
// keyboard navigation with visible focus, and the four required viewports.

const T0 = Date.parse("2026-11-09T12:00:00Z");
const SEC = 1000;
const MIN = 60 * SEC;
const LATENCY = 600;                                   // mock claim backend
const VIP = "PVS Grand Finals VIP Ticket";
const CRATE = "G-Coin Contraband Crate";

let consoleErrors;

test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
});

test.afterEach(() => {
    expect(consoleErrors, "no JavaScript errors or warnings in the console").toEqual([]);
});

const timer = (page, title) => page.getByRole("timer", { name: `${title} countdown`, exact: true }).locator("time");
const countdownCard = (page, title) => page.getByRole("article", { name: title, exact: true });
const claimCard = (page, name) => page.getByRole("article", { name, exact: true });
const stock = (page, name) => claimCard(page, name).locator("[data-field='stock']");
const claimStatus = (page, name) => claimCard(page, name).getByRole("status");
const simulate = (page, name, mode) => page.getByRole("combobox", { name, exact: true }).selectOption(mode);
const rowTags = (page) => page.getByRole("table").locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.cells[2]?.textContent));

async function setVisibility(page, state) {
    await page.evaluate((value) => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
        document.dispatchEvent(new Event("visibilitychange"));
    }, state);
}

test("PRD 4 scenario table, end to end, in one session", async ({ page }) => {
    // Fake clock, paused at T0: countdowns AND the mock backend's latency run on test time.
    await page.clock.install({ time: T0 - 10 * SEC });
    await page.clock.pauseAt(T0);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Airdrop Arena" })).toBeVisible();
    const deliver = () => page.clock.runFor(LATENCY);

    await test.step("Countdown running → remaining time updates", async () => {
        await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 04 MIN : 58 SEC");
        await page.clock.runFor(2 * SEC);
        await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 04 MIN : 56 SEC");
    });

    await test.step("Background tab → countdown resynchronizes on return", async () => {
        await setVisibility(page, "hidden");
        await page.clock.setSystemTime(T0 + 2 * SEC + 2 * MIN);          // no timer fires
        await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 04 MIN : 56 SEC");
        await setVisibility(page, "visible");
        await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 02 MIN : 56 SEC");
    });

    await test.step("Successful ticket claim → stock decreases", async () => {
        await claimCard(page, VIP).getByRole("button", { name: "Claim ticket" }).click();
        await expect(stock(page, VIP)).toHaveText("24");                  // optimistic, before any response
        await expect(claimStatus(page, VIP)).toHaveText(`Claiming ${VIP}…`);
        await deliver();
        await expect(claimStatus(page, VIP)).toHaveText(/^Claim successful/);
        await expect(stock(page, VIP)).toHaveText("24");
    });

    await test.step("Successful G-Coin claim → stock decreases", async () => {
        await claimCard(page, CRATE).getByRole("button", { name: "Claim crate" }).click();
        await deliver();
        await expect(claimStatus(page, CRATE)).toHaveText(/^Claim successful/);
        await expect(stock(page, CRATE)).toHaveText("99");
    });

    await test.step("Duplicate claim → second request blocked", async () => {
        const button = claimCard(page, VIP).getByRole("button", { name: "Claim ticket" });
        await button.click();
        // Playwright refuses to click an aria-disabled button; a real user can still press it, so force.
        await claimCard(page, VIP).getByRole("button", { name: "Claiming…" }).click({ force: true });   // pending: ignored
        await claimCard(page, VIP).getByRole("button", { name: "Claiming…" }).click({ force: true });
        await expect(stock(page, VIP)).toHaveText("23");                  // one unit, not three
        await deliver();
        await deliver();
        await expect(stock(page, VIP)).toHaveText("23");
    });

    await test.step("HTTP 409 → stock automatically restored", async () => {
        await simulate(page, VIP, "conflict");
        await claimCard(page, VIP).getByRole("button", { name: "Claim ticket" }).click();
        await expect(stock(page, VIP)).toHaveText("22");
        await deliver();
        await expect(claimStatus(page, VIP)).toHaveText(/^Looted Out!/);
        await expect(stock(page, VIP)).toHaveText("23");
        await simulate(page, VIP, "auto");
    });

    await test.step("Network failure → error displayed without false success", async () => {
        await simulate(page, CRATE, "network-error");
        await claimCard(page, CRATE).getByRole("button", { name: "Claim crate" }).click();
        await deliver();
        await expect(claimStatus(page, CRATE)).toHaveText(/^Network error: your claim was not confirmed/);
        await expect(claimStatus(page, CRATE)).not.toHaveText(/successful/);
        await expect(stock(page, CRATE)).toHaveText("99");
        await simulate(page, CRATE, "auto");
    });

    await test.step("Squad search → matching squads displayed", async () => {
        await page.getByRole("searchbox", { name: "Search squads" }).fill("ces");
        expect(await rowTags(page)).toEqual(["CES"]);
        await page.getByRole("searchbox", { name: "Search squads" }).fill("");
    });

    await test.step("WWCD sorting → correct descending order", async () => {
        await page.getByRole("combobox", { name: "Sort by" }).selectOption("killPoints");
        await page.getByRole("combobox", { name: "Sort by" }).selectOption("wwcd");
        const wwcd = await page.getByRole("table").locator("tbody tr").evaluateAll((rows) => rows.map((row) => Number(row.cells[3].textContent)));
        expect(wwcd).toEqual([3, 2, 1, 1]);
        expect(await rowTags(page)).toEqual(["TE", "CES", "ROY", "AGG"]);
    });

    await test.step("Kill-feed filtering → only selected squad events shown", async () => {
        await page.getByRole("combobox", { name: "Show squad" }).selectOption("AGG");
        const tags = await page.getByRole("list", { name: "Kill Feed" }).locator("abbr").allTextContents();
        expect(tags.length).toBeGreaterThan(0);
        expect(new Set(tags)).toEqual(new Set(["AGG"]));
        await page.getByRole("combobox", { name: "Show squad" }).selectOption("all");
    });

    await test.step("Large kill feed → only visible rows plus overscan rendered", async () => {
        const feed = page.getByRole("list", { name: "Kill Feed" });
        await feed.evaluate((list) => { list.scrollTop = 30000; list.dispatchEvent(new Event("scroll")); });
        await expect.poll(() => feed.evaluate((list) => Number(list.dataset.startIndex))).toBeGreaterThan(400);
        const state = await feed.evaluate((list) => ({ rendered: list.querySelectorAll("li").length, setsize: list.querySelector("li").getAttribute("aria-setsize") }));
        expect(state.setsize).toBe("1000");
        expect(state.rendered).toBeLessThanOrEqual(6 + 1 + 2 * 5);
    });

    await test.step("Countdown expires → status changes to LIVE (claims and leaderboard unaffected)", async () => {
        await page.clock.fastForward(5 * MIN);
        await expect(countdownCard(page, "G-Coin Airdrop").getByText("Airdrop landed")).toBeVisible();
        await expect(countdownCard(page, "G-Coin Airdrop")).toHaveAttribute("data-live", "true");
        await expect(timer(page, "G-Coin Airdrop")).toHaveText("00 DAYS : 00 HOURS : 00 MIN : 00 SEC");
        await expect(stock(page, VIP)).toHaveText("23");                   // state stayed consistent
        await expect(stock(page, CRATE)).toHaveText("99");
        expect(await rowTags(page)).toEqual(["TE", "CES", "ROY", "AGG"]);
    });
});

test("keyboard only: every control is reachable by Tab, in reading order, with a visible focus ring", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const stops = [];
    for (let n = 0; n < 30; n += 1) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const style = getComputedStyle(el);
            // The label's own caption (not its textContent, which would include the <select>'s options).
            const labelledBy = el.getAttribute("aria-labelledby");
            const caption = el.labels?.[0] && [...el.labels[0].childNodes].find((node) => node.nodeType === 3 && node.textContent.trim() || node.tagName === "SPAN");
            const name = el.getAttribute("aria-label")
                || (labelledBy && document.getElementById(labelledBy)?.textContent.trim())
                || caption?.textContent.trim()
                || el.textContent.trim().slice(0, 30);
            return { tag: el.tagName, name, outline: style.outlineStyle, width: parseFloat(style.outlineWidth), top: el.getBoundingClientRect().top + window.scrollY };
        });
        if (info === null) break;
        stops.push(info);
    }
    const names = stops.map((stop) => stop.name);
    expect(names.slice(0, 2)).toEqual(["Claim ticket", "Claim crate"]);
    expect(names).toEqual(expect.arrayContaining([
        "PVS Grand Finals VIP Ticket", "G-Coin Contraband Crate",            // simulation selects
        "Search squads", "Minimum WWCD", "Sort by", "Show squad"
    ]));
    expect(stops.find((stop) => stop.tag === "FIGURE")?.name).toMatch(/^PUBG Vietnam squads/);   // scrollable table frame
    expect(stops.find((stop) => stop.tag === "OL")?.name).toBe("Kill Feed");                  // scrollable kill feed
    for (const stop of stops) {
        expect(stop.outline, `${stop.name} shows a focus ring`).toBe("solid");
        expect(stop.width).toBeGreaterThanOrEqual(2);
    }
    // Reading order: each stop is at or below the previous one on the page (single-column phone layout).
    for (let i = 1; i < stops.length; i += 1) expect(stops[i].top).toBeGreaterThanOrEqual(stops[i - 1].top - 1);
});

const VIEWPORTS = [
    ["mobile", { width: 375, height: 812 }],
    ["tablet", { width: 768, height: 1024 }],
    ["compact desktop", { width: 1024, height: 768 }],
    ["full dashboard", { width: 1440, height: 900 }]
];

for (const [label, viewport] of VIEWPORTS) {
    test(`${label} (${viewport.width}px): layout, no page overflow, axe WCAG 2.2 AA clean on the whole page`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto("/");
        await expect(page.getByRole("list", { name: "Kill Feed" })).toBeVisible();

        const layout = await page.evaluate(() => {
            const top = (selector) => document.querySelector(selector).getBoundingClientRect().top;
            const frame = document.querySelector("section[aria-labelledby='leaderboard-title'] figure");
            const cards = [...document.querySelectorAll("article[data-item]")].map((card) => card.getBoundingClientRect().top);
            return {
                overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                panelsSideBySide: Math.abs(top("section[aria-labelledby='leaderboard-title']") - top("section[aria-labelledby='killfeed-title']")) < 2,
                claimCardsSideBySide: Math.abs(cards[0] - cards[1]) < 2,
                tableScrolls: frame.scrollWidth > frame.clientWidth
            };
        });
        expect(layout.overflow).toBeLessThanOrEqual(0);
        expect(layout.panelsSideBySide).toBe(viewport.width >= 1024);
        expect(layout.claimCardsSideBySide).toBe(viewport.width >= 900);
        expect(layout.tableScrolls).toBe(viewport.width < 600);         // horizontally scrollable leaderboard on phones

        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
            .analyze();
        expect(results.violations).toEqual([]);
    });
}
